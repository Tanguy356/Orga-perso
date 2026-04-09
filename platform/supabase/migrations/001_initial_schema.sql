-- ============================================
-- Paraglide Simulator Platform - Database Schema
-- ============================================

-- Contacts / CRM
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  website TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'other' CHECK (source IN ('heavent_paris', 'website', 'referral', 'cold_outreach', 'other')),
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN ('new', 'contacted', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost')),
  next_action_date DATE,
  next_action TEXT,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'in_prep', 'active', 'completed', 'invoiced')),
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_end_date DATE,
  location TEXT NOT NULL DEFAULT '',
  location_city TEXT NOT NULL DEFAULT '',
  price_ht NUMERIC(10, 2) NOT NULL DEFAULT 0,
  price_ttc NUMERIC(10, 2) NOT NULL DEFAULT 0,
  costs JSONB NOT NULL DEFAULT '{}',
  notes TEXT NOT NULL DEFAULT '',
  logistics_checklist JSONB NOT NULL DEFAULT '[]',
  is_portfolio_visible BOOLEAN NOT NULL DEFAULT false,
  photos TEXT[] NOT NULL DEFAULT '{}',
  testimonial TEXT,
  testimonial_author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  assignee TEXT NOT NULL DEFAULT 'both' CHECK (assignee IN ('tanguy', 'jules', 'both')),
  deadline DATE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Interactions (CRM activity log)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('email', 'call', 'meeting', 'event', 'note')),
  summary TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('strategy', 'product', 'operations', 'marketing', 'finance', 'legal', 'other')),
  doc_type TEXT NOT NULL DEFAULT 'other' CHECK (doc_type IN ('contract', 'tech_spec', 'presentation', 'template', 'legal', 'photo', 'other')),
  file_url TEXT NOT NULL DEFAULT '',
  file_size INTEGER NOT NULL DEFAULT 0,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  uploaded_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial Entries
CREATE TABLE financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('fixed_cost', 'variable_cost', 'revenue', 'expense')),
  category TEXT NOT NULL DEFAULT '',
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  recurring BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assignee ON tasks(assignee);
CREATE INDEX idx_tasks_deadline ON tasks(deadline);
CREATE INDEX idx_contacts_stage ON contacts(stage);
CREATE INDEX idx_contacts_source ON contacts(source);
CREATE INDEX idx_interactions_contact ON interactions(contact_id);
CREATE INDEX idx_financial_entries_event ON financial_entries(event_id);
CREATE INDEX idx_financial_entries_date ON financial_entries(date);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (simple: authenticated users can do everything)
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users full access" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON financial_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read for portfolio (events visible on website)
CREATE POLICY "Public can view portfolio events" ON events FOR SELECT TO anon USING (is_portfolio_visible = true);
CREATE POLICY "Public can view portfolio contacts" ON contacts FOR SELECT TO anon USING (
  id IN (SELECT client_id FROM events WHERE is_portfolio_visible = true AND client_id IS NOT NULL)
);
