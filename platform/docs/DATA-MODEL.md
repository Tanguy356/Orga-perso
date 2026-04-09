# Data Model

## Entity Relationship Diagram

```
contacts ──────┐
  │             │
  │ client_id   │ contact_id
  ▼             ▼
events        tasks
  │             │
  │ event_id    │ event_id
  ▼             ▼
financial    documents
_entries

contacts ◄── interactions (contact_id, CASCADE)
events   ◄── tasks (event_id, SET NULL)
events   ◄── documents (event_id, SET NULL)
events   ◄── financial_entries (event_id, SET NULL)
contacts ◄── tasks (contact_id, SET NULL)
contacts ◄── events (client_id, SET NULL)
```

---

## Tables

### contacts

The CRM core. Tracks leads, clients, and their progression through the sales pipeline.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `full_name` | TEXT | '' | Contact's full name |
| `company` | TEXT | '' | Organization name |
| `email` | TEXT | '' | Email address |
| `phone` | TEXT | '' | Phone number |
| `role` | TEXT | '' | Job title / position |
| `city` | TEXT | '' | City |
| `website` | TEXT | '' | Company website |
| `source` | TEXT | 'other' | How they found us |
| `stage` | TEXT | 'new' | Pipeline stage |
| `next_action_date` | DATE | null | When to follow up |
| `next_action` | TEXT | null | What to do next |
| `notes` | TEXT | '' | Free-form notes |
| `created_at` | TIMESTAMPTZ | now() | Record creation |
| `updated_at` | TIMESTAMPTZ | now() | Last modification (auto-trigger) |

**Source values:** `heavent_paris` | `website` | `referral` | `cold_outreach` | `other`

**Stage values (pipeline order):** `new` → `contacted` → `qualified` → `proposal_sent` → `negotiation` → `won` | `lost`

---

### events

Core business unit. Each event = one simulator rental engagement.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `client_id` | UUID | null | FK → contacts (the client) |
| `title` | TEXT | '' | Event name |
| `status` | TEXT | 'draft' | Lifecycle stage |
| `event_date` | DATE | CURRENT_DATE | Start date |
| `event_end_date` | DATE | null | End date (multi-day events) |
| `location` | TEXT | '' | Venue name |
| `location_city` | TEXT | '' | City |
| `price_ht` | NUMERIC(10,2) | 0 | Price excl. tax |
| `price_ttc` | NUMERIC(10,2) | 0 | Price incl. tax |
| `costs` | JSONB | {} | Cost breakdown (key=category, value=amount) |
| `notes` | TEXT | '' | Free-form notes |
| `logistics_checklist` | JSONB | [] | Array of {item, checked, assigned_to} |
| `is_portfolio_visible` | BOOLEAN | false | Show on public website |
| `photos` | TEXT[] | {} | Array of storage URLs |
| `testimonial` | TEXT | null | Client testimonial text |
| `testimonial_author` | TEXT | null | Who gave the testimonial |
| `created_at` | TIMESTAMPTZ | now() | |
| `updated_at` | TIMESTAMPTZ | now() | Auto-trigger |

**Status values (lifecycle):** `draft` → `confirmed` → `in_prep` → `active` → `completed` → `invoiced`

**Costs JSONB example:**
```json
{ "transport": 800, "crew": 1500, "equipment": 200 }
```

**Logistics checklist JSONB example:**
```json
[
  { "item": "transport", "checked": false, "assigned_to": "jules" },
  { "item": "assembly", "checked": true, "assigned_to": "both" }
]
```

Default checklist items on event creation:
- transport, transportReturn, assembly, disassembly
- technician1, technician2, animator
- power, space, insurance, contract

---

### tasks

Tracks all work items. Can be standalone or linked to an event/contact.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `title` | TEXT | '' | Task name |
| `description` | TEXT | '' | Details |
| `priority` | TEXT | 'medium' | Urgency level |
| `status` | TEXT | 'todo' | Current state |
| `assignee` | TEXT | 'both' | Who is responsible |
| `deadline` | DATE | null | Due date |
| `event_id` | UUID | null | FK → events (optional link) |
| `contact_id` | UUID | null | FK → contacts (optional link) |
| `created_at` | TIMESTAMPTZ | now() | |
| `completed_at` | TIMESTAMPTZ | null | When marked done |

**Priority:** `high` | `medium` | `low`
**Status:** `todo` → `in_progress` → `done`
**Assignee:** `tanguy` | `jules` | `both`

---

### interactions

CRM activity log. Records every touchpoint with a contact.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `contact_id` | UUID | (required) | FK → contacts (CASCADE delete) |
| `type` | TEXT | 'note' | Interaction type |
| `summary` | TEXT | '' | What happened |
| `date` | DATE | CURRENT_DATE | When it happened |
| `created_at` | TIMESTAMPTZ | now() | |

**Type:** `email` | `call` | `meeting` | `event` | `note`

---

### documents

File library. Stores metadata; actual files live in Supabase Storage or Google Drive.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `name` | TEXT | '' | File name |
| `category` | TEXT | 'other' | Business function |
| `doc_type` | TEXT | 'other' | Document type |
| `file_url` | TEXT | '' | URL (Storage or Drive link) |
| `file_size` | INTEGER | 0 | Size in bytes |
| `event_id` | UUID | null | FK → events (optional link) |
| `uploaded_by` | TEXT | '' | Who uploaded it |
| `created_at` | TIMESTAMPTZ | now() | |

**Category:** `strategy` | `product` | `operations` | `marketing` | `finance` | `legal` | `other`
**Doc type:** `contract` | `tech_spec` | `presentation` | `template` | `legal` | `photo` | `other`

---

### financial_entries

Tracks all money in and out. Can be linked to an event for per-event P&L.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | Primary key |
| `type` | TEXT | 'expense' | Entry classification |
| `category` | TEXT | '' | Cost/revenue category |
| `amount` | NUMERIC(10,2) | 0 | Amount in EUR |
| `description` | TEXT | '' | Details |
| `date` | DATE | CURRENT_DATE | When it occurred |
| `event_id` | UUID | null | FK → events (optional) |
| `recurring` | BOOLEAN | false | Is this a recurring cost? |
| `created_at` | TIMESTAMPTZ | now() | |

**Type:** `fixed_cost` | `variable_cost` | `revenue` | `expense`

**Common categories:** Transport, Crew, Equipment, Customization, Insurance, Storage, Maintenance, Prestation

---

## Row Level Security (RLS)

All tables have RLS enabled:

| Table | Authenticated | Anonymous |
|-------|--------------|-----------|
| contacts | Full CRUD | Read contacts linked to portfolio events |
| events | Full CRUD | Read events where `is_portfolio_visible = true` |
| tasks | Full CRUD | No access |
| interactions | Full CRUD | No access |
| documents | Full CRUD | No access |
| financial_entries | Full CRUD | No access |

---

## Indexes

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| events | status | Filter by status |
| events | event_date | Sort by date |
| tasks | status | Filter by status |
| tasks | assignee | Filter "my tasks" |
| tasks | deadline | Sort by due date |
| contacts | stage | Pipeline filtering |
| contacts | source | Filter by origin |
| interactions | contact_id | Lookup interactions for a contact |
| financial_entries | event_id | Per-event finance lookup |
| financial_entries | date | Sort by date |

---

## TypeScript Types

All types are defined in `lib/supabase/types.ts` and match the database schema exactly. Interfaces include optional joined relations (e.g., `Event.client?: Contact`).
