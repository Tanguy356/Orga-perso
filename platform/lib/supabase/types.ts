export type EventStatus = "draft" | "confirmed" | "in_prep" | "active" | "completed" | "invoiced";
export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "high" | "medium" | "low";
export type Assignee = "tanguy" | "jules" | "both";
export type ContactStage = "new" | "contacted" | "qualified" | "proposal_sent" | "negotiation" | "won" | "lost";
export type ContactSource = "heavent_paris" | "website" | "referral" | "cold_outreach" | "other";
export type InteractionType = "email" | "call" | "meeting" | "event" | "note";
export type DocumentCategory = "strategy" | "product" | "operations" | "marketing" | "finance" | "legal" | "other";
export type DocumentType = "contract" | "tech_spec" | "presentation" | "template" | "legal" | "photo" | "other";
export type FinancialEntryType = "fixed_cost" | "variable_cost" | "revenue" | "expense";

export interface Event {
  id: string;
  client_id: string | null;
  title: string;
  status: EventStatus;
  event_date: string;
  event_end_date: string | null;
  location: string;
  location_city: string;
  price_ht: number;
  price_ttc: number;
  costs: Record<string, number>;
  notes: string;
  logistics_checklist: { item: string; checked: boolean; assigned_to: Assignee }[];
  is_portfolio_visible: boolean;
  photos: string[];
  testimonial: string | null;
  testimonial_author: string | null;
  created_at: string;
  updated_at: string;
  // joined
  client?: Contact;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee: Assignee;
  deadline: string | null;
  event_id: string | null;
  contact_id: string | null;
  created_at: string;
  completed_at: string | null;
  // joined
  event?: Event;
  contact?: Contact;
}

export interface Contact {
  id: string;
  full_name: string;
  company: string;
  email: string;
  phone: string;
  role: string;
  city: string;
  website: string;
  source: ContactSource;
  stage: ContactStage;
  next_action_date: string | null;
  next_action: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  type: InteractionType;
  summary: string;
  date: string;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  category: DocumentCategory;
  doc_type: DocumentType;
  file_url: string;
  file_size: number;
  event_id: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface FinancialEntry {
  id: string;
  type: FinancialEntryType;
  category: string;
  amount: number;
  description: string;
  date: string;
  event_id: string | null;
  recurring: boolean;
  created_at: string;
}
