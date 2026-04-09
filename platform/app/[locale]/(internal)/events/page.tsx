"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Event, EventStatus, Contact } from "@/lib/supabase/types";
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
  Plus,
  Search,
  MapPin,
  CalendarDays,
  Euro,
  User,
  GripVertical,
} from "lucide-react";

const STATUSES: EventStatus[] = [
  "draft",
  "confirmed",
  "in_prep",
  "active",
  "completed",
  "invoiced",
];

const STATUS_COLORS: Record<EventStatus, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  confirmed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  in_prep: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  active:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  completed:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  invoiced:
    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

const DEFAULT_LOGISTICS_CHECKLIST = [
  { item: "transport", checked: false, assigned_to: "tanguy" as const },
  { item: "transportReturn", checked: false, assigned_to: "tanguy" as const },
  { item: "assembly", checked: false, assigned_to: "both" as const },
  { item: "disassembly", checked: false, assigned_to: "both" as const },
  { item: "technician1", checked: false, assigned_to: "tanguy" as const },
  { item: "technician2", checked: false, assigned_to: "jules" as const },
  { item: "animator", checked: false, assigned_to: "jules" as const },
  { item: "power", checked: false, assigned_to: "tanguy" as const },
  { item: "space", checked: false, assigned_to: "tanguy" as const },
  { item: "insurance", checked: false, assigned_to: "tanguy" as const },
  { item: "contract", checked: false, assigned_to: "tanguy" as const },
];

const EMPTY_FORM = {
  title: "",
  client_id: "",
  event_date: "",
  event_end_date: "",
  location: "",
  location_city: "",
  price_ht: 0,
  price_ttc: 0,
  status: "draft" as EventStatus,
  notes: "",
};

export default function EventsPage() {
  const t = useTranslations("events");
  const tc = useTranslations("common");
  const supabase = createClient();

  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [dragOverStatus, setDragOverStatus] = useState<EventStatus | null>(null);

  const fetchData = useCallback(async () => {
    const [eventsRes, contactsRes] = await Promise.all([
      supabase
        .from("events")
        .select("*, client:contacts(*)")
        .order("event_date", { ascending: false }),
      supabase
        .from("contacts")
        .select("id, full_name, company")
        .order("full_name"),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.location_city.toLowerCase().includes(q) ||
        (e.client?.full_name?.toLowerCase().includes(q) ?? false)
    );
  }, [events, search]);

  const eventsByStatus = useMemo(() => {
    const map: Record<EventStatus, Event[]> = {
      draft: [],
      confirmed: [],
      in_prep: [],
      active: [],
      completed: [],
      invoiced: [],
    };
    for (const e of filtered) {
      map[e.status].push(e);
    }
    return map;
  }, [filtered]);

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    const payload = {
      title: form.title,
      client_id: form.client_id || null,
      event_date: form.event_date,
      event_end_date: form.event_end_date || null,
      location: form.location,
      location_city: form.location_city,
      price_ht: form.price_ht,
      price_ttc: form.price_ttc,
      status: form.status,
      notes: form.notes,
      logistics_checklist: DEFAULT_LOGISTICS_CHECKLIST,
      costs: {},
      is_portfolio_visible: false,
      photos: [],
      testimonial: null,
      testimonial_author: null,
    };
    await supabase.from("events").insert(payload);
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  }

  function formatPrice(amount: number): string {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /* ---- Drag-and-drop handlers ---- */

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, eventId: string) {
    e.dataTransfer.setData("eventId", eventId);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>, status: EventStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    // Only clear if we are actually leaving the column (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStatus(null);
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>, newStatus: EventStatus) {
    e.preventDefault();
    setDragOverStatus(null);

    const eventId = e.dataTransfer.getData("eventId");
    if (!eventId) return;

    const target = events.find((ev) => ev.id === eventId);
    if (!target || target.status === newStatus) return;

    // Optimistic local update
    setEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, status: newStatus } : ev))
    );

    // Persist to database
    const { error } = await supabase
      .from("events")
      .update({ status: newStatus })
      .eq("id", eventId);

    if (error) {
      // Rollback on failure
      setEvents((prev) =>
        prev.map((ev) =>
          ev.id === eventId ? { ...ev, status: target.status } : ev
        )
      );
    } else {
      toast.success(`Event moved to ${newStatus}`);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-400">{tc("loading")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("new")}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={tc("search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <div
            key={status}
            className={`flex-shrink-0 w-72 rounded-xl border-2 border-transparent p-2 transition-all ${
              dragOverStatus === status
                ? "ring-2 ring-amber-500/50 border-amber-500/10 bg-amber-500/5"
                : ""
            }`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                {t(`status.${status}`)}
              </span>
              <Badge
                className={STATUS_COLORS[status]}
                variant="secondary"
              >
                {eventsByStatus[status].length}
              </Badge>
            </div>
            <div className="space-y-2">
              {eventsByStatus[status].length === 0 && (
                <div className="rounded-xl border border-dashed p-4 text-center text-sm text-slate-400">
                  {tc("noResults")}
                </div>
              )}
              {eventsByStatus[status].map((event) => (
                <div
                  key={event.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, event.id)}
                  className="group"
                >
                  <Link href={`/events/${event.id}`}>
                    <Card className="p-3 rounded-xl hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start gap-1.5">
                        <GripVertical className="h-4 w-4 mt-0.5 flex-shrink-0 text-slate-300 group-hover:text-slate-400 transition-colors" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">
                            {event.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                            <CalendarDays className="h-3 w-3" />
                            <span>
                              {new Date(event.event_date).toLocaleDateString()}
                            </span>
                          </div>
                          {event.client && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                              <User className="h-3 w-3" />
                              <span className="truncate">
                                {event.client.full_name}
                              </span>
                            </div>
                          )}
                          {event.price_ht > 0 && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                              <Euro className="h-3 w-3" />
                              <span>{formatPrice(event.price_ht)} HT</span>
                            </div>
                          )}
                          {event.location_city && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                              <MapPin className="h-3 w-3" />
                              <span>{event.location_city}</span>
                            </div>
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

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("new")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("fields.title")}</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.client")}</Label>
              <Select
                value={form.client_id}
                onValueChange={(val) =>
                  setForm((f) => ({ ...f, client_id: val || "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                      {c.company ? ` - ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.date")}</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, event_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.endDate")}</Label>
                <Input
                  type="date"
                  value={form.event_end_date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, event_end_date: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.location")}</Label>
                <Input
                  value={form.location}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.locationCity")}</Label>
                <Input
                  value={form.location_city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, location_city: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.priceHt")}</Label>
                <Input
                  type="number"
                  value={form.price_ht}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price_ht: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.priceTtc")}</Label>
                <Input
                  type="number"
                  value={form.price_ttc}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      price_ttc: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{tc("status")}</Label>
              <Select
                value={form.status}
                onValueChange={(val) =>
                  setForm((f) => ({
                    ...f,
                    status: val as EventStatus,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`status.${s}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving || !form.title || !form.event_date}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {saving ? tc("loading") : tc("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
