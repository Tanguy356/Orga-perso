"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Contact, ContactStage, ContactSource } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  ArrowUpDown,
  GripVertical,
  Upload,
} from "lucide-react";

const STAGES: ContactStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

const KANBAN_STAGES: ContactStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
];

const SOURCES: ContactSource[] = [
  "heavent_paris",
  "website",
  "referral",
  "cold_outreach",
  "other",
];

const STAGE_COLORS: Record<ContactStage, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contacted:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  qualified:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  proposal_sent:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  negotiation:
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  won: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

type SortField =
  | "full_name"
  | "company"
  | "city"
  | "stage"
  | "source"
  | "next_action_date"
  | "updated_at";
type SortDir = "asc" | "desc";

const EMPTY_FORM = {
  full_name: "",
  company: "",
  email: "",
  phone: "",
  role: "",
  city: "",
  website: "",
  source: "other" as ContactSource,
  stage: "new" as ContactStage,
  next_action_date: "",
  next_action: "",
  notes: "",
};

export default function ContactsPage() {
  const t = useTranslations("contacts");
  const tc = useTranslations("common");
  const supabase = createClient();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<SortField>("updated_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [dragOverStage, setDragOverStage] = useState<ContactStage | null>(null);

  const fetchContacts = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setContacts(data);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchContacts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  const contactsByStage = useMemo(() => {
    const map: Record<ContactStage, Contact[]> = {
      new: [],
      contacted: [],
      qualified: [],
      proposal_sent: [],
      negotiation: [],
      won: [],
      lost: [],
    };
    for (const c of filtered) {
      map[c.stage].push(c);
    }
    return map;
  }, [filtered]);

  function openCreate() {
    setEditingContact(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const VALID_STAGES: ContactStage[] = ["new", "contacted", "qualified", "proposal_sent", "negotiation", "won", "lost"];
  const VALID_SOURCES: ContactSource[] = ["heavent_paris", "website", "referral", "cold_outreach", "other"];

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

      if (rows.length === 0) {
        toast.error("No data found in file");
        return;
      }

      // Map column names (case-insensitive)
      function col(row: Record<string, string>, ...keys: string[]): string {
        for (const k of keys) {
          for (const rk of Object.keys(row)) {
            if (rk.toLowerCase().replace(/[_\s]/g, "") === k.toLowerCase().replace(/[_\s]/g, "")) {
              return String(row[rk] || "").trim();
            }
          }
        }
        return "";
      }

      const supabase = createClient();
      const existing = contacts.map((c) => c.full_name.toLowerCase());
      let imported = 0;

      for (const row of rows) {
        const name = col(row, "name", "fullname", "full_name");
        if (!name) continue;
        if (existing.includes(name.toLowerCase())) continue;

        const rawStage = col(row, "status", "stage").toLowerCase();
        const stage: ContactStage = VALID_STAGES.includes(rawStage as ContactStage) ? (rawStage as ContactStage) : "new";

        const rawSource = col(row, "source").toLowerCase().replace(/\s/g, "_");
        const source: ContactSource = VALID_SOURCES.includes(rawSource as ContactSource) ? (rawSource as ContactSource) : "other";

        await supabase.from("contacts").insert({
          full_name: name,
          company: col(row, "company", "organisation", "organization"),
          city: col(row, "city", "ville"),
          stage,
          source,
          next_action: col(row, "nextaction", "next_action") || null,
          next_action_date: null,
          email: col(row, "email"),
          phone: col(row, "phone", "telephone"),
          role: col(row, "role", "poste"),
          website: col(row, "website"),
          notes: "Imported from file",
        });
        existing.push(name.toLowerCase());
        imported++;
      }

      if (imported === 0) {
        toast.info("All contacts from this file are already imported");
      } else {
        toast.success(`${imported} contacts imported`);
        fetchData();
      }
    } catch {
      toast.error("Failed to parse file");
    }

    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openEdit(contact: Contact) {
    setEditingContact(contact);
    setForm({
      full_name: contact.full_name,
      company: contact.company,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      city: contact.city,
      website: contact.website,
      source: contact.source,
      stage: contact.stage,
      next_action_date: contact.next_action_date ?? "",
      next_action: contact.next_action ?? "",
      notes: contact.notes,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      ...form,
      next_action_date: form.next_action_date || null,
      next_action: form.next_action || null,
    };
    if (editingContact) {
      await supabase
        .from("contacts")
        .update(payload)
        .eq("id", editingContact.id);
    } else {
      await supabase.from("contacts").insert(payload);
    }
    setSaving(false);
    setDialogOpen(false);
    fetchContacts();
  }

  async function handleDelete(id: string) {
    await supabase.from("contacts").delete().eq("id", id);
    fetchContacts();
  }

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  /* ---- Drag-and-drop handlers ---- */

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, contactId: string) {
    e.dataTransfer.setData("contactId", contactId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, stage: ContactStage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, newStage: ContactStage) {
    e.preventDefault();
    setDragOverStage(null);

    const contactId = e.dataTransfer.getData("contactId");
    if (!contactId) return;

    const target = contacts.find((c) => c.id === contactId);
    if (!target || target.stage === newStage) return;

    // Optimistic local update
    setContacts((prev) =>
      prev.map((c) => (c.id === contactId ? { ...c, stage: newStage } : c))
    );

    // Persist to database
    const { error } = await supabase
      .from("contacts")
      .update({ stage: newStage })
      .eq("id", contactId);

    if (error) {
      // Rollback on failure
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, stage: target.stage } : c
        )
      );
    } else {
      toast.success(`Contact moved to ${newStage}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500">{tc("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,.xls"
            className="hidden"
            onChange={handleFileImport}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-1.5 h-4 w-4" />
            Import
          </Button>
          <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="mr-1.5 h-4 w-4" />
            {t("new")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <Input
          placeholder={tc("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban Pipeline */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {KANBAN_STAGES.map((stage) => (
            <div
              key={stage}
              className={`flex-shrink-0 w-56 rounded-xl border-2 border-transparent p-2 transition-all ${
                dragOverStage === stage
                  ? "ring-2 ring-amber-500/50 border-amber-500/10 bg-amber-500/5"
                  : ""
              }`}
              onDragOver={(e) => handleDragOver(e, stage)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage)}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {t(`stage.${stage}`)}
                </span>
                <Badge
                  className={STAGE_COLORS[stage]}
                  variant="secondary"
                >
                  {contactsByStage[stage].length}
                </Badge>
              </div>
              <div className="space-y-1.5">
                {contactsByStage[stage].length === 0 && (
                  <div className="rounded-lg border border-dashed p-3 text-center text-xs text-slate-400">
                    {tc("noResults")}
                  </div>
                )}
                {contactsByStage[stage].map((contact) => (
                  <div
                    key={contact.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, contact.id)}
                    className="group"
                  >
                    <Link href={`/contacts/${contact.id}`}>
                      <Card className="px-2.5 py-2 rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs truncate">
                              {contact.full_name}
                            </p>
                            {contact.company && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {contact.company}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Table */}
      <div className="mt-8">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => toggleSort("full_name")}
                  >
                    {tc("name")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => toggleSort("company")}
                  >
                    {tc("company")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => toggleSort("city")}
                  >
                    {tc("city")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => toggleSort("stage")}
                  >
                    {tc("status")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => toggleSort("source")}
                  >
                    {t("fields.source")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => toggleSort("next_action_date")}
                  >
                    {t("fields.nextAction")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1"
                    onClick={() => toggleSort("updated_at")}
                  >
                    {tc("date")}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-slate-500 py-8"
                  >
                    {tc("noResults")}
                  </TableCell>
                </TableRow>
              )}
              {sorted.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="font-medium hover:underline"
                    >
                      {contact.full_name}
                    </Link>
                  </TableCell>
                  <TableCell>{contact.company}</TableCell>
                  <TableCell>{contact.city}</TableCell>
                  <TableCell>
                    <Badge
                      className={STAGE_COLORS[contact.stage]}
                      variant="secondary"
                    >
                      {t(`stage.${contact.stage}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {t(`source.${contact.source}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {contact.next_action_date
                      ? new Date(
                          contact.next_action_date
                        ).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {new Date(contact.updated_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContact ? tc("edit") : t("new")}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.fullName")}</Label>
                <Input
                  value={form.full_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("company")}</Label>
                <Input
                  value={form.company}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, company: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tc("email")}</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("phone")}</Label>
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.role")}</Label>
                <Input
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("city")}</Label>
                <Input
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.website")}</Label>
              <Input
                value={form.website}
                onChange={(e) =>
                  setForm((f) => ({ ...f, website: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.source")}</Label>
                <Select
                  value={form.source}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      source: val as ContactSource,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`source.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{tc("status")}</Label>
                <Select
                  value={form.stage}
                  onValueChange={(val) =>
                    setForm((f) => ({
                      ...f,
                      stage: val as ContactStage,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`stage.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.nextActionDate")}</Label>
                <Input
                  type="date"
                  value={form.next_action_date}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      next_action_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.nextAction")}</Label>
                <Input
                  value={form.next_action}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      next_action: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tc("notes")}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            {editingContact && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleDelete(editingContact.id);
                  setDialogOpen(false);
                }}
              >
                {tc("delete")}
              </Button>
            )}
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.full_name} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
