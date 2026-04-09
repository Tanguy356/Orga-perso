# Local Development Guide

## Quick Start

```bash
cd "C:\Users\TanguyChristophe\IdeaProjects\Orga perso\platform"
npm run dev
```

Open http://localhost:3000 in your browser.

---

## How Local Mode Works

The app detects that `.env.local` has placeholder Supabase credentials and automatically:
- Uses a **localStorage-based mock database** instead of Supabase
- **Bypasses authentication** (no login required)
- **Pre-seeds data** with 5 contacts, 3 events, 11 tasks, etc.

No external service needed. Everything runs on your machine.

---

## All Pages

### Public Website (no auth)

| URL | Page | Description |
|-----|------|-------------|
| http://localhost:3000/fr | Homepage | Hero, benefits, CTA |
| http://localhost:3000/fr/services | Services | What's included, extras, specs |
| http://localhost:3000/fr/portfolio | Portfolio | Past events (from internal data) |
| http://localhost:3000/fr/contact | Contact | Lead capture form → CRM |
| http://localhost:3000/en | Homepage (EN) | English version |

### Internal Tool (auth bypassed locally)

| URL | Page | Key Features |
|-----|------|-------------|
| http://localhost:3000/fr/dashboard | Dashboard | KPIs, my tasks, upcoming events, quick actions |
| http://localhost:3000/fr/events | Events | Kanban by status, list view, create event |
| http://localhost:3000/fr/events/{id} | Event Detail | Overview, logistics checklist, finance, debrief |
| http://localhost:3000/fr/tasks | Tasks | Grouped by status, filter tabs, create/edit |
| http://localhost:3000/fr/contacts | Contacts (CRM) | Pipeline kanban, table view, create/edit |
| http://localhost:3000/fr/contacts/{id} | Contact Detail | Info, interactions timeline, linked events |
| http://localhost:3000/fr/finance | Finance | Revenue/costs overview, per-event P&L |
| http://localhost:3000/fr/calendar | Calendar | Monthly grid with event/task dots |
| http://localhost:3000/fr/documents | Documents | File library by category, upload |
| http://localhost:3000/fr/login | Login | Supabase auth (works in local mode too) |

### Language Switching

Replace `/fr/` with `/en/` in any URL to switch to English.
The public navbar also has a language toggle button (FR/EN).

---

## Seed Data (Pre-loaded)

### Contacts (5)
| Name | Company | City | Stage |
|------|---------|------|-------|
| Marie Dupont | Mairie de Marseille | Marseille | Proposal Sent |
| Pierre Martin | EventCorp | Paris | Contacted |
| Sophie Bernard | OT Annecy | Annecy | Qualified |
| Lucas Petit | TeamUp Events | Lyon | New |
| Emma Leroy | Salon du Sport | Paris | Won |

### Events (3)
| Title | Date | Status | Price HT |
|-------|------|--------|----------|
| Salon du Sport Paris 2026 | May 15-17 | Confirmed | 10,500 EUR |
| Festival d'ete Marseille | Jul 10-12 | Draft | 7,000 EUR |
| Demo Team Building Lyon | Jun 5 | Draft | 3,500 EUR |

### Tasks (11)
Imported from the original `0. Tracker - Todo list.xlsx`. Mix of priorities (high/medium/low), statuses (todo/in_progress/done), and assignees (tanguy/jules/both).

### Financial Entries (5)
Revenue from Salon du Sport, fixed costs (insurance, storage), variable costs (transport, crew).

---

## Data Persistence

- All data is stored in your browser's **localStorage** under the key `simupara_db`
- Data survives page refreshes and browser restarts
- Each browser/profile has its own data (not shared)

### Reset to Fresh Seed Data

Open browser console (F12) and run:
```javascript
localStorage.removeItem("simupara_db");
location.reload();
```

### Export Your Data

```javascript
copy(localStorage.getItem("simupara_db"));
// Paste into a .json file to backup
```

### Import Data

```javascript
localStorage.setItem("simupara_db", '...paste JSON here...');
location.reload();
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Page freezes or blank | Clear localStorage and reload (see above) |
| Port 3000 in use | `npx kill-port 3000` then `npm run dev` |
| Old data showing | Clear localStorage to re-seed |
| Build errors | Run `npx tsc --noEmit` to check types |
| Styles not loading | Delete `.next/` folder and restart dev server |

---

## Switching to Production (Supabase)

When ready to go live:

1. Create a project at https://supabase.com
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor
3. Create 2 users in Supabase Auth (Tanguy + Jules)
4. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key
   ```
5. Restart the dev server — the app automatically switches to real Supabase
