"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Contact,
  ContactStage,
  ContactSource,
  Interaction,
  InteractionType,
  Event,
} from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Pencil,
  Plus,
  Mail,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  CalendarClock,
  MessageSquare,
  PhoneCall,
  Users,
  Calendar,
  StickyNote,
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

const SOURCES: ContactSource[] = [
  "heavent_paris",
  "website",
  "referral",
  "cold_outreach",
  "other",
];

const INTERACTION_TYPES: InteractionType[] = [
  "email",
  "call",
  "meeting",
  "event",
  "note",
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

const INTERACTION_ICONS: Record<InteractionType, typeof Mail> = {
  email: MessageSquare,
  call: PhoneCall,
  meeting: Users,
  event: Calendar,
  note: StickyNote,
};

interface Props {
  contact: Contact;
  interactions: Interaction[];
  linkedEvents: Event[];
}

export default function ContactDetailClient({
  contact: initialContact,
  interactions: initialInteractions,
  linkedEvents,
}: Props) {
  const t = useTranslations("contacts");
  const te = useTranslations("events");
  const tc = useTranslations("common");
  const router = useRouter();
  const supabase = createClient();

  const [contact, setContact] = useState(initialContact);
  const [interactions, setInteractions] = useState(initialInteractions);
  const [editOpen, setEditOpen] = useState(false);
  const [interactionOpen, setInteractionOpen] = useState(false);
  const [nextActionOpen, setNextActionOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
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

  // Interaction form
  const [interactionForm, setInteractionForm] = useState({
    type: "note" as InteractionType,
    summary: "",
    date: new Date().toISOString().split("T")[0],
  });

  // Next action form
  const [nextActionForm, setNextActionForm] = useState({
    next_action: contact.next_action ?? "",
    next_action_date: contact.next_action_date ?? "",
  });

  const refreshContact = useCallback(async () => {
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", contact.id)
      .single();
    if (data) setContact(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  const refreshInteractions = useCallback(async () => {
    const { data } = await supabase
      .from("interactions")
      .select("*")
      .eq("contact_id", contact.id)
      .order("date", { ascending: false });
    if (data) setInteractions(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  async function handleEditSave() {
    setSaving(true);
    await supabase
      .from("contacts")
      .update({
        ...editForm,
        next_action_date: editForm.next_action_date || null,
        next_action: editForm.next_action || null,
      })
      .eq("id", contact.id);
    setSaving(false);
    setEditOpen(false);
    refreshContact();
  }

  async function handleAddInteraction() {
    setSaving(true);
    await supabase.from("interactions").insert({
      contact_id: contact.id,
      type: interactionForm.type,
      summary: interactionForm.summary,
      date: interactionForm.date,
    });
    setSaving(false);
    setInteractionOpen(false);
    setInteractionForm({
      type: "note",
      summary: "",
      date: new Date().toISOString().split("T")[0],
    });
    refreshInteractions();
  }

  async function handleNextActionSave() {
    setSaving(true);
    await supabase
      .from("contacts")
      .update({
        next_action: nextActionForm.next_action || null,
        next_action_date: nextActionForm.next_action_date || null,
      })
      .eq("id", contact.id);
    setSaving(false);
    setNextActionOpen(false);
    refreshContact();
  }

  function openEdit() {
    setEditForm({
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
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {contact.full_name}
          </h1>
          {contact.company && (
            <p className="text-slate-500 mt-0.5">{contact.company}</p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge className={STAGE_COLORS[contact.stage]} variant="secondary">
              {t(`stage.${contact.stage}`)}
            </Badge>
            <Badge variant="outline">{t(`source.${contact.source}`)}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={openEdit}>
          <Pencil className="mr-1.5 h-4 w-4" />
          {tc("edit")}
        </Button>
      </div>

      {/* Contact info grid */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">{tc("email")}</p>
                <a
                  href={`mailto:${contact.email}`}
                  className="text-sm hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">{tc("phone")}</p>
                <a
                  href={`tel:${contact.phone}`}
                  className="text-sm hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            </div>
          )}
          {contact.city && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">{tc("city")}</p>
                <p className="text-sm">{contact.city}</p>
              </div>
            </div>
          )}
          {contact.website && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">
                  {t("fields.website")}
                </p>
                <a
                  href={
                    contact.website.startsWith("http")
                      ? contact.website
                      : `https://${contact.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline"
                >
                  {contact.website}
                </a>
              </div>
            </div>
          )}
          {contact.role && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">
                  {t("fields.role")}
                </p>
                <p className="text-sm">{contact.role}</p>
              </div>
            </div>
          )}
        </div>
        {contact.notes && (
          <>
            <Separator className="my-4" />
            <div>
              <p className="text-xs text-slate-400 mb-1">
                {tc("notes")}
              </p>
              <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
            </div>
          </>
        )}
      </Card>

      {/* Next Action card */}
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-sm font-medium">{t("fields.nextAction")}</p>
              {contact.next_action ? (
                <p className="text-sm mt-0.5">{contact.next_action}</p>
              ) : (
                <p className="text-sm text-slate-400 mt-0.5">-</p>
              )}
              {contact.next_action_date && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(contact.next_action_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNextActionForm({
                next_action: contact.next_action ?? "",
                next_action_date: contact.next_action_date ?? "",
              });
              setNextActionOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>

      {/* Interactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t("interactions.title")}</h2>
          <Button
            size="sm"
            onClick={() => {
              setInteractionForm({
                type: "note",
                summary: "",
                date: new Date().toISOString().split("T")[0],
              });
              setInteractionOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t("interactions.new")}
          </Button>
        </div>
        {interactions.length === 0 ? (
          <Card className="p-6 text-center text-slate-500 text-sm">
            {tc("noResults")}
          </Card>
        ) : (
          <div className="space-y-3">
            {interactions.map((interaction) => {
              const Icon = INTERACTION_ICONS[interaction.type];
              return (
                <Card key={interaction.id} className="p-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Icon className="h-4 w-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {t(`interactions.types.${interaction.type}`)}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {new Date(interaction.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {interaction.summary}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Linked Events */}
      {linkedEvents.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {te("title")}
          </h2>
          <div className="space-y-2">
            {linkedEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(event.event_date).toLocaleDateString()} -{" "}
                        {event.location_city}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {te(`status.${event.status}`)}
                    </Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Edit Contact Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tc("edit")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.fullName")}</Label>
                <Input
                  value={editForm.full_name}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, full_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("company")}</Label>
                <Input
                  value={editForm.company}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, company: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tc("email")}</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("phone")}</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.role")}</Label>
                <Input
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, role: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tc("city")}</Label>
                <Input
                  value={editForm.city}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.website")}</Label>
              <Input
                value={editForm.website}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, website: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.source")}</Label>
                <Select
                  value={editForm.source}
                  onValueChange={(val) =>
                    setEditForm((f) => ({
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
                  value={editForm.stage}
                  onValueChange={(val) =>
                    setEditForm((f) => ({
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
                  value={editForm.next_action_date}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      next_action_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.nextAction")}</Label>
                <Input
                  value={editForm.next_action}
                  onChange={(e) =>
                    setEditForm((f) => ({
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
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, notes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
            <Button
              onClick={handleEditSave}
              disabled={saving || !editForm.full_name}
            >
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Interaction Dialog */}
      <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("interactions.new")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{tc("type")}</Label>
              <Select
                value={interactionForm.type}
                onValueChange={(val) =>
                  setInteractionForm((f) => ({
                    ...f,
                    type: val as InteractionType,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERACTION_TYPES.map((typ) => (
                    <SelectItem key={typ} value={typ}>
                      {t(`interactions.types.${typ}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tc("date")}</Label>
              <Input
                type="date"
                value={interactionForm.date}
                onChange={(e) =>
                  setInteractionForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{tc("description")}</Label>
              <Textarea
                value={interactionForm.summary}
                onChange={(e) =>
                  setInteractionForm((f) => ({
                    ...f,
                    summary: e.target.value,
                  }))
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
            <Button
              onClick={handleAddInteraction}
              disabled={saving || !interactionForm.summary}
            >
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Next Action Dialog */}
      <Dialog open={nextActionOpen} onOpenChange={setNextActionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("fields.nextAction")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("fields.nextAction")}</Label>
              <Input
                value={nextActionForm.next_action}
                onChange={(e) =>
                  setNextActionForm((f) => ({
                    ...f,
                    next_action: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.nextActionDate")}</Label>
              <Input
                type="date"
                value={nextActionForm.next_action_date}
                onChange={(e) =>
                  setNextActionForm((f) => ({
                    ...f,
                    next_action_date: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
            <Button onClick={handleNextActionSave} disabled={saving}>
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
