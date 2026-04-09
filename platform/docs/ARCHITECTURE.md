# Architecture

## Overview

SimuPara is a single Next.js 16 application that serves two purposes:
- **Internal tool** (`/dashboard`, `/events`, `/tasks`, etc.) — the business operating system for Tanguy & Jules
- **Public website** (`/`, `/services`, `/portfolio`, `/contact`) — client-facing site to attract leads

Both share the same codebase, database, and deployment. Route groups separate them.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 16 (App Router, Turbopack) | SSR for public pages, CSR for internal tool |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS v4 + shadcn/ui | Rapid UI, consistent design system |
| Database | Supabase (Postgres) | Data storage, auth, file storage |
| i18n | next-intl | French/English bilingual support |
| Icons | lucide-react | Consistent icon library |
| Dates | date-fns | Date formatting and calendar logic |
| Local dev | Mock Supabase client (localStorage) | Works offline without Supabase |

---

## File Structure

```
platform/
├── app/
│   ├── layout.tsx                    # Root layout (renders children only)
│   ├── page.tsx                      # Redirects / → /fr
│   ├── globals.css                   # Tailwind + shadcn theme variables
│   │
│   ├── [locale]/                     # Dynamic locale segment (fr or en)
│   │   ├── layout.tsx                # Locale provider, fonts, Toaster
│   │   │
│   │   ├── (public)/                 # PUBLIC WEBSITE (no auth)
│   │   │   ├── layout.tsx            # Navbar + Footer wrapper
│   │   │   ├── page.tsx              # Homepage
│   │   │   ├── services/page.tsx     # Services page
│   │   │   ├── portfolio/page.tsx    # Portfolio (fed from events)
│   │   │   └── contact/page.tsx      # Contact form → CRM
│   │   │
│   │   ├── (internal)/               # INTERNAL TOOL (auth required in prod)
│   │   │   ├── layout.tsx            # Sidebar + topbar navigation
│   │   │   ├── dashboard/page.tsx    # KPI cards, tasks, events overview
│   │   │   ├── events/
│   │   │   │   ├── page.tsx          # Event list (kanban + table)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Server component: fetch + pass
│   │   │   │       └── event-detail-client.tsx  # 4-tab detail view
│   │   │   ├── tasks/page.tsx        # Task management with filters
│   │   │   ├── contacts/
│   │   │   │   ├── page.tsx          # CRM pipeline + table
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Server component: fetch + pass
│   │   │   │       └── contact-detail-client.tsx  # Detail + interactions
│   │   │   ├── finance/page.tsx      # Financial dashboard + entries
│   │   │   ├── calendar/page.tsx     # Monthly calendar grid
│   │   │   └── documents/page.tsx    # Document library
│   │   │
│   │   └── login/page.tsx            # Supabase email/password login
│   │
│   └── api/
│       └── contact/route.ts          # POST: website form → contacts table
│
├── components/
│   ├── ui/                           # shadcn/ui components (18 components)
│   ├── public/
│   │   ├── navbar.tsx                # Public site header + locale switcher
│   │   └── footer.tsx                # Public site footer
│   └── internal/                     # (reserved for shared internal components)
│
├── lib/
│   ├── i18n/
│   │   ├── config.ts                 # Locales: ["fr", "en"], default: "fr"
│   │   ├── routing.ts                # next-intl routing definition
│   │   ├── navigation.ts             # Link, redirect, usePathname, useRouter
│   │   └── request.ts                # Server-side message loading
│   ├── supabase/
│   │   ├── client.ts                 # Browser client (singleton, mock or real)
│   │   ├── server.ts                 # Server client (mock or real)
│   │   ├── mock-client.ts            # localStorage mock + seed data
│   │   └── types.ts                  # TypeScript interfaces + enums
│   └── utils.ts                      # cn() classname utility
│
├── messages/
│   ├── fr.json                       # French translations (all UI labels)
│   └── en.json                       # English translations
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql    # Full database schema
│
├── proxy.ts                          # Middleware: i18n + auth protection
├── next.config.ts                    # Next.js + next-intl plugin
├── .env.local                        # Supabase credentials (placeholder)
└── package.json
```

---

## Route Groups

Next.js route groups (parentheses in folder names) organize code without affecting URLs:

| Group | Auth | Layout | Purpose |
|-------|------|--------|---------|
| `(public)` | None | Navbar + Footer | Client-facing website |
| `(internal)` | Required (prod) | Sidebar + Topbar | Business management tool |

Example: `app/[locale]/(internal)/events/page.tsx` renders at `/fr/events` (not `/fr/(internal)/events`).

---

## Data Flow

### Internal → External Bridge

```
Internal tool                          Public website
─────────────                          ──────────────
Event created → mark is_portfolio_visible=true → appears on /portfolio
Contact form submitted on /contact → API route → new contact in CRM (source: "website")
Event stats (count, revenue) → displayed as social proof on homepage
Testimonials from event debrief → displayed on portfolio/homepage
```

### Authentication Flow (Production)

```
User visits /fr/dashboard
  → proxy.ts checks for sb-*-auth-token cookie
  → No cookie? Redirect to /fr/login?redirect=/fr/dashboard
  → User logs in via Supabase Auth
  → Cookie set → redirect back to /fr/dashboard
```

In local mode, auth is bypassed (proxy.ts detects placeholder Supabase URL).

---

## Mock Client (Local Development)

When `.env.local` contains placeholder Supabase values, the app uses `mock-client.ts`:

- **Storage**: localStorage in browser, in-memory on server
- **API**: Mimics full Supabase query builder (`.from().select().eq().order().single()`)
- **Seed data**: 5 contacts, 3 events, 11 tasks, 5 interactions, 5 documents, 5 financial entries
- **Persistence**: Data survives page refreshes (stored in `simupara_db` localStorage key)
- **Reset**: Run `localStorage.removeItem("simupara_db")` in browser console to re-seed

---

## Key Design Decisions

1. **Single codebase** — No separate frontend/backend repos. Simpler deployment, shared types.
2. **Route groups** — Clean separation of public/internal without separate apps.
3. **Server + Client components** — Detail pages use server components to fetch, client components for interactivity.
4. **Mock-first development** — Full app works locally without external dependencies.
5. **Singleton Supabase client** — Prevents React re-render loops from creating new client instances.
6. **Deterministic seed data** — Fixed IDs and timestamps prevent server/client hydration mismatches.
