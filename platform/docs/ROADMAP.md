# Roadmap

## What Exists Today

### Internal Tool (fully functional locally)
- [x] Dashboard with KPIs, tasks, events, quick actions
- [x] Event management: kanban + list view, create, 6-status lifecycle
- [x] Event detail: overview, logistics checklist, per-event costs, debrief/testimonial
- [x] Task management: grouped by status, filter tabs, priority/assignee, link to events/contacts
- [x] CRM: pipeline kanban (7 stages) + table view, create/edit, search
- [x] Contact detail: info grid, interactions timeline, linked events, next action tracking
- [x] Finance: overview KPIs, all entries table, per-event P&L with margin calc
- [x] Calendar: monthly grid, event/task dots, day detail panel
- [x] Document library: category filter, search, upload (file or URL)
- [x] Sidebar navigation with all modules
- [x] Mobile-responsive layout (sidebar collapses to sheet)

### Public Website (fully functional locally)
- [x] Homepage: hero, benefits, CTA
- [x] Services: included items, extras, use cases, technical specs (550x350x400cm)
- [x] Portfolio: placeholder grid (ready to display real events)
- [x] Contact form: submits to CRM as new lead (source: "website")
- [x] Navbar with locale switcher
- [x] Footer

### Infrastructure
- [x] Bilingual support (FR/EN) with full translation files
- [x] Mock Supabase client for offline development
- [x] Seed data from existing Google Drive content
- [x] Database schema with RLS policies
- [x] Auth system (login page, proxy protection, cookie-based)
- [x] TypeScript types for all entities

---

## Phase 1 — Production Ready (Week 1-2)

Priority: make the tool usable for daily operations with real data.

### 1.1 Supabase Setup
- [ ] Create Supabase project
- [ ] Run database migration (`001_initial_schema.sql`)
- [ ] Create auth accounts for Tanguy & Jules
- [ ] Configure `.env.local` with real credentials
- [ ] Test all CRUD operations against real database

### 1.2 Data Migration
- [ ] Import contacts from `Contact et follow up.xlsx` and `contacts Heavent Paris 2025.xlsx`
- [ ] Import tasks from `0. Tracker - Todo list.xlsx`
- [ ] Import financial data from `Recap finance.xlsx`
- [ ] Upload key documents to Supabase Storage (presentations, contracts, tech specs)

### 1.3 Deploy
- [ ] Push to GitHub repository
- [ ] Deploy to Vercel or Railway
- [ ] Configure custom domain (simupara.fr or similar)
- [ ] Set environment variables in hosting platform
- [ ] Verify SSL and production build

### 1.4 Critical Fixes
- [ ] Add proper error handling on all CRUD operations (toast on failure)
- [ ] Add loading spinners on form submissions
- [ ] Add confirmation dialogs before delete actions
- [ ] Validate required fields in all forms (client-side)

---

## Phase 2 — UX Polish (Week 3-4)

Priority: make the tool enjoyable to use daily.

### 2.1 Dashboard Improvements
- [ ] Real-time stats (pull from live data, not just on mount)
- [ ] "What's due today" section personalized per user
- [ ] Pipeline value chart (bar chart of revenue by month)
- [ ] Quick-edit task status directly from dashboard cards

### 2.2 Event Workflow
- [ ] Drag-and-drop events across kanban columns to change status
- [ ] Duplicate event (one-click copy for recurring clients)
- [ ] Event template system (pre-fill logistics, pricing for common setups)
- [ ] Status change history log per event

### 2.3 CRM Enhancements
- [ ] Drag-and-drop contacts across pipeline stages
- [ ] Follow-up reminders (highlight overdue next_action_date)
- [ ] Bulk import contacts from CSV/XLSX file
- [ ] Contact activity score (rank by interaction frequency)

### 2.4 Task Improvements
- [ ] Drag-and-drop reordering within status groups
- [ ] Subtasks (checklist within a task)
- [ ] Recurring tasks (e.g., monthly insurance check)
- [ ] Task comments/notes thread

### 2.5 Global UX
- [ ] Global search (Cmd+K) across events, contacts, tasks, documents
- [ ] Keyboard shortcuts (N = new, E = events, T = tasks, C = contacts)
- [ ] Toast notifications on all actions (save, delete, status change)
- [ ] Empty states with helpful onboarding messages
- [ ] Dark mode toggle

---

## Phase 3 — Public Website Launch (Week 5-6)

Priority: attract new clients and build credibility.

### 3.1 Content & Design
- [ ] Add real photos of the simulator in action
- [ ] Write compelling copy for homepage and services (FR + EN)
- [ ] Add pricing section ("A partir de 3 500 EUR/jour" with details)
- [ ] Add "How it works" section (4 steps: contact, planning, setup, experience)
- [ ] Create brand assets (logo, color palette, favicon)

### 3.2 Portfolio (Live Data)
- [ ] Connect portfolio page to real events where `is_portfolio_visible = true`
- [ ] Event photo gallery with lightbox
- [ ] Testimonial display from event debrief data
- [ ] Mini case study format (client, challenge, result)

### 3.3 Lead Capture
- [ ] Email confirmation after contact form submission
- [ ] Google Analytics or Plausible analytics integration
- [ ] SEO meta tags (title, description, Open Graph images)
- [ ] robots.txt and sitemap.xml generation

### 3.4 Trust & Conversion
- [ ] Client logos section on homepage
- [ ] "As seen in" press section (La Provence, Les Echos, etc.)
- [ ] Counter animation (X events delivered, X happy clients)
- [ ] Urgency elements ("Booking fast for summer 2026")

---

## Phase 4 — Automation & Integration (Month 2-3)

Priority: reduce manual work and connect to external tools.

### 4.1 Calendar Sync
- [ ] Google Calendar integration (event dates sync both ways)
- [ ] iCal export for team members

### 4.2 Document Generation
- [ ] Quote/proposal PDF generation from event data
- [ ] Invoice PDF generation with event + financial data
- [ ] Contract template auto-fill with client info

### 4.3 Communication
- [ ] Email templates per pipeline stage (welcome, follow-up, proposal, thank you)
- [ ] Send emails directly from contact detail page
- [ ] Post-event survey link auto-generation

### 4.4 Internal-External Bridge
- [ ] Auto-publish completed event to portfolio when marked visible
- [ ] Dynamic social proof on homepage (live event count, client count)
- [ ] Blog/content system for SEO

### 4.5 Reporting
- [ ] Monthly revenue/cost report generation
- [ ] Pipeline conversion rate analytics
- [ ] Revenue forecast based on pipeline stages
- [ ] Export data to CSV/Excel

---

## Phase 5 — Scaling (Month 3+)

For when the business grows beyond 2 people.

### 5.1 Multi-User
- [ ] User profiles with avatar and preferences
- [ ] Activity feed (who did what, when)
- [ ] Role-based permissions (if team expands)
- [ ] Notification system (in-app + email)

### 5.2 Client Portal
- [ ] Client login area (separate from internal)
- [ ] Clients can view their event details, logistics, photos
- [ ] Clients can approve quotes and sign contracts online

### 5.3 Advanced Finance
- [ ] Bank account integration (auto-import transactions)
- [ ] Tax calculation helpers (TVA)
- [ ] Annual financial summary / reporting
- [ ] Multi-currency support (for international events)

### 5.4 Simulator Fleet
- [ ] Multiple simulator tracking (if you acquire more units)
- [ ] Availability calendar per simulator
- [ ] Maintenance schedule and history per unit

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-08 | Next.js + Supabase | Full control, free tier, single codebase for both internal + public |
| 2026-04-08 | French primary, English secondary | French market first, international later |
| 2026-04-08 | localStorage mock for dev | Ship fast, no Supabase setup needed for development |
| 2026-04-08 | No separate mobile app | Responsive web is sufficient for 2-person team |
| 2026-04-08 | No complex permissions | Only 2 users (Tanguy + Jules), keep it simple |
| 2026-04-08 | Kanban + Table dual views | Different contexts need different views (planning vs searching) |
