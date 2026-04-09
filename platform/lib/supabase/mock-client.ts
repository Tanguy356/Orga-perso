/**
 * Mock Supabase client using localStorage for fully local development.
 * Implements the same chaining API as the real Supabase client.
 * When you set up real Supabase, just update .env.local and this is bypassed.
 */

let idCounter = 0;

function generateId(): string {
  idCounter++;
  return `gen-${idCounter.toString().padStart(8, "0")}-0000-4000-a000-000000000000`;
}

// Bump this version whenever seed data changes to force a refresh.
const SEED_VERSION = 4;

// Shared in-memory store that works on both server and client.
// On the client, we persist to localStorage for durability across refreshes.
let memoryStore: Record<string, Record<string, unknown>[]> | null = null;

function getStore(): Record<string, Record<string, unknown>[]> {
  if (memoryStore) return memoryStore;

  // Try loading from localStorage (client only)
  if (typeof window !== "undefined") {
    try {
      const savedVersion = localStorage.getItem("simupara_db_version");
      if (savedVersion && Number(savedVersion) >= SEED_VERSION) {
        const raw = localStorage.getItem("simupara_db");
        if (raw) {
          memoryStore = JSON.parse(raw);
          return memoryStore!;
        }
      }
    } catch {}
  }

  // First load or version mismatch — use fresh seed data
  memoryStore = getSeedData();
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("simupara_db", JSON.stringify(memoryStore));
      localStorage.setItem("simupara_db_version", String(SEED_VERSION));
    } catch {}
  }
  return memoryStore;
}

function saveStore(store: Record<string, Record<string, unknown>[]>) {
  memoryStore = store;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("simupara_db", JSON.stringify(store));
    } catch {}
  }
}

type Row = Record<string, unknown>;
type QueryResult = { data: Row[] | Row | null; error: null | { message: string } };

class MockQueryBuilder {
  private table: string;
  private filters: { col: string; val: unknown }[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private isSingle = false;
  private selectCols: string = "*";
  private joinDefs: { alias: string; foreignTable: string; cols: string }[] = [];

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string = "*") {
    this.selectCols = cols;
    // Parse join patterns like "*, client:contacts(*)"
    const joinRegex = /(\w+):(\w+)\(([^)]*)\)/g;
    let match;
    while ((match = joinRegex.exec(cols)) !== null) {
      this.joinDefs.push({
        alias: match[1],
        foreignTable: match[2],
        cols: match[3] || "*",
      });
    }
    return this;
  }

  eq(col: string, val: unknown) {
    this.filters.push({ col, val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    // Simplified: we'll filter manually
    this.filters.push({ col, val: { $in: vals } });
    return this;
  }

  gte(col: string, val: unknown) {
    this.filters.push({ col, val: { $gte: val } });
    return this;
  }

  lte(col: string, val: unknown) {
    this.filters.push({ col, val: { $lte: val } });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  limit(n: number) {
    this.limitN = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this.execute();
  }

  then(resolve: (val: QueryResult) => void, reject?: (err: unknown) => void) {
    // Use queueMicrotask to make resolution async — avoids React concurrent rendering issues
    queueMicrotask(() => {
      try {
        resolve(this.execute());
      } catch (e) {
        if (reject) reject(e);
      }
    });
  }

  private execute(): QueryResult {
    const store = getStore();
    let rows = [...(store[this.table] || [])];

    // Apply filters
    for (const f of this.filters) {
      rows = rows.filter((row) => {
        const val = f.val;
        if (val && typeof val === "object" && "$in" in (val as Record<string, unknown>)) {
          return ((val as Record<string, unknown>).$in as unknown[]).includes(row[f.col]);
        }
        if (val && typeof val === "object" && "$gte" in (val as Record<string, unknown>)) {
          return (row[f.col] as string) >= ((val as Record<string, unknown>).$gte as string);
        }
        if (val && typeof val === "object" && "$lte" in (val as Record<string, unknown>)) {
          return (row[f.col] as string) <= ((val as Record<string, unknown>).$lte as string);
        }
        return row[f.col] === val;
      });
    }

    // Apply ordering
    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      rows.sort((a, b) => {
        const av = (a[col] ?? "") as string;
        const bv = (b[col] ?? "") as string;
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }

    // Apply limit
    if (this.limitN !== null) {
      rows = rows.slice(0, this.limitN);
    }

    // Apply joins
    if (this.joinDefs.length > 0) {
      rows = rows.map((row) => {
        const joined = { ...row };
        for (const jd of this.joinDefs) {
          const fkCol = `${jd.alias}_id`;
          const fkVal = row[fkCol] ?? row[`${jd.alias.replace(/s$/, "")}_id`];
          // Try to find FK column - common pattern: alias matches FK name
          // e.g. "client:contacts(*)" means look for client_id in current row
          const foreignRows = store[jd.foreignTable] || [];
          if (fkVal) {
            joined[jd.alias] = foreignRows.find((fr) => fr.id === fkVal) || null;
          } else {
            joined[jd.alias] = null;
          }
        }
        return joined;
      });
    }

    // Select specific columns
    if (this.selectCols !== "*" && !this.joinDefs.length) {
      const cols = this.selectCols.split(",").map((c) => c.trim()).filter((c) => !c.includes(":"));
      if (cols.length > 0 && cols[0] !== "*") {
        rows = rows.map((row) => {
          const picked: Row = {};
          for (const c of cols) {
            picked[c] = row[c];
          }
          return picked;
        });
      }
    }

    if (this.isSingle) {
      return { data: rows[0] || null, error: null };
    }

    return { data: rows, error: null };
  }
}

class MockInsertBuilder {
  private table: string;
  private payload: Row | Row[];

  constructor(table: string, payload: Row | Row[]) {
    this.table = table;
    this.payload = payload;
  }

  select(cols?: string) {
    return new MockInsertSelectBuilder(this.table, this.payload, cols);
  }

  then(resolve: (val: QueryResult) => void) {
    queueMicrotask(() => {
      const store = getStore();
      if (!store[this.table]) store[this.table] = [];
      const items = Array.isArray(this.payload) ? this.payload : [this.payload];
      const now = new Date().toISOString();
      for (const item of items) {
        if (!item.id) item.id = generateId();
        if (!item.created_at) item.created_at = now;
        if (!item.updated_at) item.updated_at = now;
        store[this.table].push(item);
      }
      saveStore(store);
      resolve({ data: items.length === 1 ? items[0] : items, error: null });
    });
  }
}

class MockInsertSelectBuilder {
  private table: string;
  private payload: Row | Row[];
  private cols?: string;

  constructor(table: string, payload: Row | Row[], cols?: string) {
    this.table = table;
    this.payload = payload;
    this.cols = cols;
  }

  single() {
    const store = getStore();
    if (!store[this.table]) store[this.table] = [];
    const items = Array.isArray(this.payload) ? this.payload : [this.payload];
    const now = new Date().toISOString();
    for (const item of items) {
      if (!item.id) item.id = generateId();
      if (!item.created_at) item.created_at = now;
      if (!item.updated_at) item.updated_at = now;
      store[this.table].push(item);
    }
    saveStore(store);

    // Re-read with joins if needed
    const inserted = items[0];
    // Check if select includes joins
    if (this.cols && this.cols.includes(":")) {
      const joinRegex = /(\w+):(\w+)\(([^)]*)\)/g;
      let match;
      const result = { ...inserted };
      while ((match = joinRegex.exec(this.cols)) !== null) {
        const alias = match[1];
        const foreignTable = match[2];
        const fkVal = inserted[`${alias}_id`];
        if (fkVal) {
          result[alias] = (store[foreignTable] || []).find((r) => r.id === fkVal) || null;
        } else {
          result[alias] = null;
        }
      }
      return { data: result, error: null };
    }

    return { data: inserted, error: null };
  }

  then(resolve: (val: QueryResult) => void) {
    queueMicrotask(() => resolve(this.single()));
  }
}

class MockUpdateBuilder {
  private table: string;
  private payload: Row;
  private filterCol: string | null = null;
  private filterVal: unknown = null;

  constructor(table: string, payload: Row) {
    this.table = table;
    this.payload = payload;
  }

  eq(col: string, val: unknown) {
    this.filterCol = col;
    this.filterVal = val;
    return this;
  }

  select(cols?: string) {
    return new MockUpdateSelectBuilder(this.table, this.payload, this.filterCol, this.filterVal, cols);
  }

  then(resolve: (val: QueryResult) => void) {
    queueMicrotask(() => {
      const store = getStore();
      const rows = store[this.table] || [];
      for (let i = 0; i < rows.length; i++) {
        if (this.filterCol && rows[i][this.filterCol] === this.filterVal) {
          rows[i] = { ...rows[i], ...this.payload, updated_at: new Date().toISOString() };
        }
      }
      saveStore(store);
      resolve({ data: null, error: null });
    });
  }
}

class MockUpdateSelectBuilder {
  private table: string;
  private payload: Row;
  private filterCol: string | null;
  private filterVal: unknown;
  private cols?: string;

  constructor(table: string, payload: Row, filterCol: string | null, filterVal: unknown, cols?: string) {
    this.table = table;
    this.payload = payload;
    this.filterCol = filterCol;
    this.filterVal = filterVal;
    this.cols = cols;
  }

  single() {
    const store = getStore();
    const rows = store[this.table] || [];
    let updated: Row | null = null;
    for (let i = 0; i < rows.length; i++) {
      if (this.filterCol && rows[i][this.filterCol] === this.filterVal) {
        rows[i] = { ...rows[i], ...this.payload, updated_at: new Date().toISOString() };
        updated = rows[i];
      }
    }
    saveStore(store);

    // Apply joins if requested
    if (updated && this.cols && this.cols.includes(":")) {
      const joinRegex = /(\w+):(\w+)\(([^)]*)\)/g;
      let match;
      const result = { ...updated };
      while ((match = joinRegex.exec(this.cols)) !== null) {
        const alias = match[1];
        const foreignTable = match[2];
        const fkVal = updated[`${alias}_id`];
        if (fkVal) {
          result[alias] = (store[foreignTable] || []).find((r) => r.id === fkVal) || null;
        } else {
          result[alias] = null;
        }
      }
      return { data: result, error: null };
    }

    return { data: updated, error: null };
  }

  then(resolve: (val: QueryResult) => void) {
    queueMicrotask(() => resolve(this.single()));
  }
}

class MockDeleteBuilder {
  private table: string;
  private filterCol: string | null = null;
  private filterVal: unknown = null;

  constructor(table: string) {
    this.table = table;
  }

  eq(col: string, val: unknown) {
    this.filterCol = col;
    this.filterVal = val;
    return this;
  }

  then(resolve: (val: QueryResult) => void) {
    queueMicrotask(() => {
      const store = getStore();
      if (this.filterCol) {
        store[this.table] = (store[this.table] || []).filter(
          (row) => row[this.filterCol!] !== this.filterVal
        );
      }
      saveStore(store);
      resolve({ data: null, error: null });
    });
  }
}

class MockTableBuilder {
  private table: string;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string = "*") {
    const qb = new MockQueryBuilder(this.table);
    return qb.select(cols);
  }

  insert(payload: Row | Row[]) {
    return new MockInsertBuilder(this.table, payload);
  }

  update(payload: Row) {
    return new MockUpdateBuilder(this.table, payload);
  }

  delete() {
    return new MockDeleteBuilder(this.table);
  }
}

class MockStorageBucket {
  private bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(path: string, file: File) {
    // In local dev, convert the file to a data URL so it can actually be opened
    if (typeof window !== "undefined") {
      try {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        const key = `simupara_file_${path}`;
        localStorage.setItem(key, dataUrl);
      } catch {}
    }
    return { data: { path: `${this.bucket}/${path}` }, error: null };
  }

  getPublicUrl(path: string) {
    // In local dev, retrieve the data URL from localStorage
    if (typeof window !== "undefined") {
      try {
        const key = `simupara_file_${path}`;
        const dataUrl = localStorage.getItem(key);
        if (dataUrl) {
          return { data: { publicUrl: dataUrl } };
        }
      } catch {}
    }
    return { data: { publicUrl: `/mock-storage/${path}` } };
  }
}

class MockStorage {
  from(bucket: string) {
    return new MockStorageBucket(bucket);
  }
}

const VALID_USERS: Record<string, string> = {
  JulesG: "Nepal2026",
  TanguyC: "Nepal2026",
};

class MockAuth {
  async signInWithPassword(_creds: { email: string; password: string }) {
    const name = _creds.email;
    if (VALID_USERS[name] && VALID_USERS[name] === _creds.password) {
      if (typeof window !== "undefined") {
        localStorage.setItem("simupara_auth", JSON.stringify({ email: name }));
      }
      return { data: { user: { email: name } }, error: null };
    }
    return { data: { user: null }, error: { message: "Invalid credentials" } };
  }

  async signOut() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("simupara_auth");
    }
    return { error: null };
  }

  async getUser() {
    if (typeof window !== "undefined") {
      const auth = localStorage.getItem("simupara_auth");
      if (auth) {
        return { data: { user: JSON.parse(auth) }, error: null };
      }
    }
    return { data: { user: null }, error: null };
  }
}

export class MockSupabaseClient {
  auth = new MockAuth();
  storage = new MockStorage();

  from(table: string) {
    return new MockTableBuilder(table);
  }
}

export function createMockClient() {
  return new MockSupabaseClient();
}

// ============================================
// SEED DATA — pre-populated from your Drive
// ============================================

function getSeedData(): Record<string, Row[]> {
  const now = "2026-04-08T10:00:00.000Z";
  const contactIds = {
    c1: "c0000001-0000-0000-0000-000000000001",
    c2: "c0000002-0000-0000-0000-000000000002",
    c3: "c0000003-0000-0000-0000-000000000003",
    c4: "c0000004-0000-0000-0000-000000000004",
    c5: "c0000005-0000-0000-0000-000000000005",
  };
  const eventIds = {
    e1: "e0000001-0000-0000-0000-000000000001",
    e2: "e0000002-0000-0000-0000-000000000002",
    e3: "e0000003-0000-0000-0000-000000000003",
  };

  return {
    contacts: [
      {
        id: contactIds.c1,
        full_name: "Marie Dupont",
        company: "Mairie de Marseille",
        email: "m.dupont@marseille.fr",
        phone: "+33 4 91 00 00 00",
        role: "Directrice Événements",
        city: "Marseille",
        website: "marseille.fr",
        source: "heavent_paris",
        stage: "proposal_sent",
        next_action_date: "2026-04-15",
        next_action: "Relancer pour signature du devis",
        notes: "Rencontrée au Heavent Paris 2025. Intéressée pour festival d'été.",
        created_at: now,
        updated_at: now,
      },
      {
        id: contactIds.c2,
        full_name: "Pierre Martin",
        company: "EventCorp",
        email: "p.martin@eventcorp.fr",
        phone: "+33 6 12 34 56 78",
        role: "CEO",
        city: "Paris",
        website: "eventcorp.fr",
        source: "heavent_paris",
        stage: "contacted",
        next_action_date: "2026-04-12",
        next_action: "Envoyer la présentation détaillée",
        notes: "Grand organisateur d'événements corporate. Budget conséquent.",
        created_at: now,
        updated_at: now,
      },
      {
        id: contactIds.c3,
        full_name: "Sophie Bernard",
        company: "OT Annecy",
        email: "s.bernard@annecy-tourisme.fr",
        phone: "+33 4 50 00 00 00",
        role: "Chargée de promotion",
        city: "Annecy",
        website: "lac-annecy.com",
        source: "referral",
        stage: "qualified",
        next_action_date: "2026-04-20",
        next_action: "Planifier une démo",
        notes: "Référée par contact SBB. Événement tourisme montagne prévu en août.",
        created_at: now,
        updated_at: now,
      },
      {
        id: contactIds.c4,
        full_name: "Lucas Petit",
        company: "TeamUp Events",
        email: "lucas@teamup.fr",
        phone: "+33 6 98 76 54 32",
        role: "Directeur commercial",
        city: "Lyon",
        website: "teamup.fr",
        source: "cold_outreach",
        stage: "new",
        next_action_date: null,
        next_action: null,
        notes: "Spécialisé team building entreprise.",
        created_at: now,
        updated_at: now,
      },
      {
        id: contactIds.c5,
        full_name: "Emma Leroy",
        company: "Salon du Sport",
        email: "e.leroy@salondusport.com",
        phone: "+33 1 42 00 00 00",
        role: "Responsable exposants",
        city: "Paris",
        website: "salondusport.com",
        source: "heavent_paris",
        stage: "won",
        next_action_date: null,
        next_action: null,
        notes: "Contrat signé pour le Salon du Sport 2026.",
        created_at: now,
        updated_at: now,
      },
    ],

    events: [
      {
        id: eventIds.e1,
        client_id: contactIds.c5,
        title: "Salon du Sport Paris 2026",
        status: "confirmed",
        event_date: "2026-05-15",
        event_end_date: "2026-05-17",
        location: "Parc des Expositions",
        location_city: "Paris",
        price_ht: 10500,
        price_ttc: 12600,
        costs: { transport: 800, crew: 1500, equipment: 200 },
        notes: "3 jours, stand dédié. Prévoir 2 techniciens/jour.",
        logistics_checklist: [
          { item: "transport", checked: false, assigned_to: "jules" },
          { item: "transportReturn", checked: false, assigned_to: "jules" },
          { item: "assembly", checked: false, assigned_to: "both" },
          { item: "disassembly", checked: false, assigned_to: "both" },
          { item: "technician1", checked: true, assigned_to: "jules" },
          { item: "technician2", checked: false, assigned_to: "tanguy" },
          { item: "animator", checked: true, assigned_to: "jules" },
          { item: "power", checked: false, assigned_to: "tanguy" },
          { item: "space", checked: true, assigned_to: "tanguy" },
          { item: "insurance", checked: true, assigned_to: "tanguy" },
          { item: "contract", checked: true, assigned_to: "tanguy" },
        ],
        is_portfolio_visible: false,
        photos: [],
        testimonial: null,
        testimonial_author: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: eventIds.e2,
        client_id: contactIds.c1,
        title: "Festival d'été Marseille",
        status: "draft",
        event_date: "2026-07-10",
        event_end_date: "2026-07-12",
        location: "Plage du Prado",
        location_city: "Marseille",
        price_ht: 7000,
        price_ttc: 8400,
        costs: {},
        notes: "En attente de confirmation. 3 jours en extérieur.",
        logistics_checklist: [
          { item: "transport", checked: false, assigned_to: "jules" },
          { item: "assembly", checked: false, assigned_to: "both" },
          { item: "disassembly", checked: false, assigned_to: "both" },
          { item: "technician1", checked: false, assigned_to: "jules" },
          { item: "technician2", checked: false, assigned_to: "tanguy" },
          { item: "animator", checked: false, assigned_to: "jules" },
          { item: "power", checked: false, assigned_to: "tanguy" },
          { item: "space", checked: false, assigned_to: "tanguy" },
          { item: "insurance", checked: false, assigned_to: "tanguy" },
          { item: "contract", checked: false, assigned_to: "tanguy" },
        ],
        is_portfolio_visible: false,
        photos: [],
        testimonial: null,
        testimonial_author: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: eventIds.e3,
        client_id: null,
        title: "Démo Team Building Lyon",
        status: "draft",
        event_date: "2026-06-05",
        event_end_date: null,
        location: "TBD",
        location_city: "Lyon",
        price_ht: 3500,
        price_ttc: 4200,
        costs: {},
        notes: "Démo potentielle pour TeamUp Events.",
        logistics_checklist: [],
        is_portfolio_visible: false,
        photos: [],
        testimonial: null,
        testimonial_author: null,
        created_at: now,
        updated_at: now,
      },
    ],

    tasks: [
      {
        id: "t0000001-0000-0000-0000-000000000001",
        title: "Créer environnement collaboratif",
        description: "Mettre en place les outils de travail collaboratif (Drive, communication, etc.)",
        priority: "medium",
        status: "in_progress",
        assignee: "tanguy",
        deadline: "2026-04-15",
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0003-0000-0000-0000-000000000000",
        title: "Créer identité de marque (nom/logo/charte)",
        description: "Définir le nom, créer le logo et la charte graphique",
        priority: "low",
        status: "todo",
        assignee: "both",
        deadline: "2026-05-01",
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0004-0000-0000-0000-000000000000",
        title: "Relancer contacts Heavent Paris",
        description: "Follow-up avec les contacts récupérés au salon Heavent Paris 2025",
        priority: "high",
        status: "done",
        assignee: "jules",
        deadline: "2026-04-01",
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: now,
      },
      {
        id: "seed-0005-0000-0000-0000-000000000000",
        title: "Établir règles de collaboration",
        description: "Définir les règles de collaboration et le processus de décision",
        priority: "medium",
        status: "todo",
        assignee: "both",
        deadline: "2026-04-20",
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0006-0000-0000-0000-000000000000",
        title: "Documenter montage/démontage simulateur",
        description: "Créer la documentation complète des étapes de montage et démontage",
        priority: "low",
        status: "todo",
        assignee: "both",
        deadline: "2026-05-15",
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0007-0000-0000-0000-000000000000",
        title: "Adapter présentation produit/service",
        description: "Mettre à jour la présentation commerciale du simulateur",
        priority: "medium",
        status: "in_progress",
        assignee: "both",
        deadline: "2026-04-25",
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0008-0000-0000-0000-000000000000",
        title: "Préparer logistique Salon du Sport",
        description: "Organiser transport, hébergement, matériel pour le salon",
        priority: "high",
        status: "todo",
        assignee: "jules",
        deadline: "2026-05-10",
        event_id: eventIds.e1,
        contact_id: contactIds.c5,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0009-0000-0000-0000-000000000000",
        title: "Envoyer devis Festival Marseille",
        description: "Préparer et envoyer le devis détaillé pour le festival d'été",
        priority: "high",
        status: "todo",
        assignee: "tanguy",
        deadline: "2026-04-14",
        event_id: eventIds.e2,
        contact_id: contactIds.c1,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0010-0000-0000-0000-000000000000",
        title: "Partager infos financières simulateur",
        description: "Partager les informations financières détaillées sur le simulateur",
        priority: "low",
        status: "in_progress",
        assignee: "jules",
        deadline: null,
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: null,
      },
      {
        id: "seed-0011-0000-0000-0000-000000000000",
        title: "Explorer approche Fred",
        description: "Analyser et discuter la stratégie proposée par Fred (commission, facturation)",
        priority: "low",
        status: "in_progress",
        assignee: "both",
        deadline: null,
        event_id: null,
        contact_id: null,
        created_at: now,
        completed_at: null,
      },
    ],

    interactions: [
      {
        id: "seed-0012-0000-0000-0000-000000000000",
        contact_id: contactIds.c1,
        type: "meeting",
        summary: "Rencontre au stand Heavent Paris. Très intéressée par le simulateur pour un festival d'été.",
        date: "2025-11-20",
        created_at: now,
      },
      {
        id: "seed-0013-0000-0000-0000-000000000000",
        contact_id: contactIds.c1,
        type: "email",
        summary: "Envoi de la brochure et des tarifs.",
        date: "2025-12-05",
        created_at: now,
      },
      {
        id: "seed-0014-0000-0000-0000-000000000000",
        contact_id: contactIds.c2,
        type: "meeting",
        summary: "Discussion rapide au Heavent. Organise +50 events/an. Budget important.",
        date: "2025-11-20",
        created_at: now,
      },
      {
        id: "seed-0015-0000-0000-0000-000000000000",
        contact_id: contactIds.c5,
        type: "email",
        summary: "Contrat signé pour 3 jours au Salon du Sport 2026.",
        date: "2026-03-15",
        created_at: now,
      },
      {
        id: "seed-0016-0000-0000-0000-000000000000",
        contact_id: contactIds.c3,
        type: "call",
        summary: "Appel de qualification. Événement prévu en août à Annecy.",
        date: "2026-03-28",
        created_at: now,
      },
    ],

    documents: [
      // --- Product & Services ---
      {
        id: "seed-0017-0000-0000-0000-000000000000",
        name: "Simulateur de parapente - Collectivités",
        category: "product",
        doc_type: "presentation",
        file_url: "/documents/SIMULATEUR DE PARAPENTE - COLLECTIVITES.pptx",
        file_size: 6000000,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-0018-0000-0000-0000-000000000000",
        name: "Brouillon Simulateur de parapente 2025",
        category: "product",
        doc_type: "presentation",
        file_url: "/documents/Brouillon Simulateur de parapente 2025.pptx",
        file_size: 4500000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      {
        id: "seed-d01-0000-0000-0000-000000000000",
        name: "Présentation infos & technique",
        category: "product",
        doc_type: "tech_spec",
        file_url: "/documents/1 er jet presentation infos _ technique .pdf",
        file_size: 3200000,
        event_id: null,
        uploaded_by: "jules",
        created_at: now,
      },
      {
        id: "seed-d02-0000-0000-0000-000000000000",
        name: "1 page - Consolidation",
        category: "product",
        doc_type: "presentation",
        file_url: "/documents/1 page - consolidation_.docx",
        file_size: 45000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      {
        id: "seed-d03-0000-0000-0000-000000000000",
        name: "Commentaire présentation V0",
        category: "product",
        doc_type: "other",
        file_url: "/documents/Commentaire presentation - V0.docx",
        file_size: 32000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      {
        id: "seed-d04-0000-0000-0000-000000000000",
        name: "Structure simulateur V2",
        category: "product",
        doc_type: "photo",
        file_url: "/documents/Structure simulateur V2.png",
        file_size: 850000,
        event_id: null,
        uploaded_by: "jules",
        created_at: now,
      },
      // --- Strategy & Vision ---
      {
        id: "seed-0020-0000-0000-0000-000000000000",
        name: "Organisation Rôles & Responsabilités",
        category: "strategy",
        doc_type: "template",
        file_url: "/documents/Organization_Roles_Responsabilities.xlsx",
        file_size: 15000,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d05-0000-0000-0000-000000000000",
        name: "Vision & Stratégie",
        category: "strategy",
        doc_type: "other",
        file_url: "/documents/Vision_Strat.xlsx",
        file_size: 28000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      {
        id: "seed-d06-0000-0000-0000-000000000000",
        name: "Nos forces & atouts",
        category: "strategy",
        doc_type: "other",
        file_url: "/documents/Nos forces_atoûts.docx",
        file_size: 22000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      {
        id: "seed-d07-0000-0000-0000-000000000000",
        name: "Stratégie Fred",
        category: "strategy",
        doc_type: "other",
        file_url: "/documents/Stratégie Fred.docx",
        file_size: 18000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      {
        id: "seed-d08-0000-0000-0000-000000000000",
        name: "Sandbox of ideas",
        category: "strategy",
        doc_type: "other",
        file_url: "/documents/Sandbox of ideas.docx",
        file_size: 25000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      // --- Operations & Logistics ---
      {
        id: "seed-d09-0000-0000-0000-000000000000",
        name: "Caractéristiques simulateur",
        category: "operations",
        doc_type: "tech_spec",
        file_url: "/documents/Characteristic.xlsx",
        file_size: 35000,
        event_id: null,
        uploaded_by: "jules",
        created_at: now,
      },
      // --- Legal ---
      {
        id: "seed-0019-0000-0000-0000-000000000000",
        name: "Contrat de maintenance",
        category: "legal",
        doc_type: "contract",
        file_url: "/documents/contrat de maintenance.pdf",
        file_size: 2200000,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d10-0000-0000-0000-000000000000",
        name: "Fiche technique Simulateur de parapente",
        category: "legal",
        doc_type: "tech_spec",
        file_url: "/documents/Fiche technique Simulateur de parapente.pdf",
        file_size: 1800000,
        event_id: null,
        uploaded_by: "jules",
        created_at: now,
      },
      {
        id: "seed-d11-0000-0000-0000-000000000000",
        name: "Info normes et entretien",
        category: "legal",
        doc_type: "legal",
        file_url: "/documents/Info norme et entretien.docx",
        file_size: 42000,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d12-0000-0000-0000-000000000000",
        name: "Pacte d'associés",
        category: "legal",
        doc_type: "contract",
        file_url: "/documents/Pacte de bros.docx",
        file_size: 38000,
        event_id: null,
        uploaded_by: "both",
        created_at: now,
      },
      // --- Finance ---
      {
        id: "seed-0021-0000-0000-0000-000000000000",
        name: "Récap finance",
        category: "finance",
        doc_type: "other",
        file_url: "/documents/Récap finance.xlsx",
        file_size: 6500,
        event_id: null,
        uploaded_by: "jules",
        created_at: now,
      },
      // --- Marketing ---
      {
        id: "seed-d13-0000-0000-0000-000000000000",
        name: "Contact et follow up",
        category: "marketing",
        doc_type: "other",
        file_url: "/documents/Contact et follow up.xlsx",
        file_size: 48000,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d14-0000-0000-0000-000000000000",
        name: "Contacts Heavent Paris 2025",
        category: "marketing",
        doc_type: "other",
        file_url: "/documents/contacts Heavent Paris 2025.xlsx",
        file_size: 120000,
        event_id: null,
        uploaded_by: "jules",
        created_at: now,
      },
      {
        id: "seed-d15-0000-0000-0000-000000000000",
        name: "Templates charte marketing",
        category: "marketing",
        doc_type: "template",
        file_url: "/documents/Templates_chart_marketing.pptx",
        file_size: 3500000,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d16-0000-0000-0000-000000000000",
        name: "Tracker - Todo list",
        category: "operations",
        doc_type: "template",
        file_url: "/documents/0. Tracker - Todo list.xlsx",
        file_size: 18000,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      // --- Media links ---
      {
        id: "seed-d17-0000-0000-0000-000000000000",
        name: "La Provence - VivaTech innovations",
        category: "marketing",
        doc_type: "other",
        file_url: "https://www.laprovence.com/article/economie/70737536648005/les-trois-innovations-quil-ne-fallait-surtout-pas-louper-a-vivatech",
        file_size: 0,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d18-0000-0000-0000-000000000000",
        name: "Les Echos - VivaTech innovations",
        category: "marketing",
        doc_type: "other",
        file_url: "https://www.lesechos.fr/tech-medias/hightech/6-innovations-a-ne-pas-manquer-au-salon-vivatech-1953006",
        file_size: 0,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d19-0000-0000-0000-000000000000",
        name: "Radio Nova - Parapente en réalité augmentée",
        category: "marketing",
        doc_type: "other",
        file_url: "https://www.nova.fr/news/faire-du-parapente-en-realite-ultra-augmentee-pour-voyager-tout-en-restant-chez-soi-236468-19-06-2023/",
        file_size: 0,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d20-0000-0000-0000-000000000000",
        name: "BPI France - VivaTech innovations",
        category: "marketing",
        doc_type: "other",
        file_url: "https://partenaire-bpi.sudouest.fr/les-trois-innovations-quil-ne-fallait-surtout-pas-louper-a-vivatech/",
        file_size: 0,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
      {
        id: "seed-d21-0000-0000-0000-000000000000",
        name: "Blog - Simulateur de parapente",
        category: "marketing",
        doc_type: "other",
        file_url: "https://simulateur-vr.com/simulateur-de-parapente/",
        file_size: 0,
        event_id: null,
        uploaded_by: "tanguy",
        created_at: now,
      },
    ],

    financial_entries: [
      {
        id: "seed-0022-0000-0000-0000-000000000000",
        type: "revenue",
        category: "Prestation",
        amount: 10500,
        description: "Salon du Sport Paris - 3 jours",
        date: "2026-05-17",
        event_id: eventIds.e1,
        recurring: false,
        created_at: now,
      },
      {
        id: "seed-0023-0000-0000-0000-000000000000",
        type: "fixed_cost",
        category: "Assurance",
        amount: 1200,
        description: "Assurance RC Pro annuelle",
        date: "2026-01-15",
        event_id: null,
        recurring: true,
        created_at: now,
      },
      {
        id: "seed-0024-0000-0000-0000-000000000000",
        type: "fixed_cost",
        category: "Stockage",
        amount: 150,
        description: "Location espace stockage simulateur (mensuel)",
        date: "2026-04-01",
        event_id: null,
        recurring: true,
        created_at: now,
      },
      {
        id: "seed-0025-0000-0000-0000-000000000000",
        type: "variable_cost",
        category: "Transport",
        amount: 800,
        description: "Transport simulateur Paris A/R",
        date: "2026-05-14",
        event_id: eventIds.e1,
        recurring: false,
        created_at: now,
      },
      {
        id: "seed-0026-0000-0000-0000-000000000000",
        type: "variable_cost",
        category: "Équipe",
        amount: 1500,
        description: "Techniciens Salon du Sport (3 jours)",
        date: "2026-05-17",
        event_id: eventIds.e1,
        recurring: false,
        created_at: now,
      },
    ],
  };
}
