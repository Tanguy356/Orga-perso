"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import type {
  Event,
  EventStatus,
  Contact,
  Assignee,
} from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TableFooter,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Pencil,
  Plus,
  CalendarDays,
  MapPin,
  User,
  Check,
  Square,
  Trash2,
  ImagePlus,
} from "lucide-react";

const STATUSES: EventStatus[] = [
  "draft",
  "confirmed",
  "in_prep",
  "active",
  "completed",
  "invoiced",
];

const ASSIGNEES: Assignee[] = ["tanguy", "jules", "both"];

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

const COST_CATEGORIES = [
  "transport",
  "crew",
  "equipment",
  "customization",
  "insurance",
  "storage",
  "maintenance",
  "other",
];

interface Props {
  event: Event;
  contacts: Pick<Contact, "id" | "full_name" | "company">[];
}

export default function EventDetailClient({
  event: initialEvent,
  contacts,
}: Props) {
  const t = useTranslations("events");
  const tf = useTranslations("finance");
  const tt = useTranslations("tasks");
  const tc = useTranslations("common");
  const supabase = createClient();

  const [event, setEvent] = useState(initialEvent);
  const [editOpen, setEditOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editForm, setEditForm] = useState({
    title: event.title,
    client_id: event.client_id ?? "",
    event_date: event.event_date,
    event_end_date: event.event_end_date ?? "",
    location: event.location,
    location_city: event.location_city,
    price_ht: event.price_ht,
    price_ttc: event.price_ttc,
    status: event.status,
    notes: event.notes,
  });

  // Cost form
  const [costForm, setCostForm] = useState({
    category: "other",
    amount: 0,
  });

  // Debrief form state
  const [testimonial, setTestimonial] = useState(event.testimonial ?? "");
  const [testimonialAuthor, setTestimonialAuthor] = useState(
    event.testimonial_author ?? ""
  );
  const [portfolioVisible, setPortfolioVisible] = useState(
    event.is_portfolio_visible
  );

  const refreshEvent = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*, client:contacts(*)")
      .eq("id", event.id)
      .single();
    if (data) setEvent(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  function formatPrice(amount: number): string {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // --- Overview ---
  function openEdit() {
    setEditForm({
      title: event.title,
      client_id: event.client_id ?? "",
      event_date: event.event_date,
      event_end_date: event.event_end_date ?? "",
      location: event.location,
      location_city: event.location_city,
      price_ht: event.price_ht,
      price_ttc: event.price_ttc,
      status: event.status,
      notes: event.notes,
    });
    setEditOpen(true);
  }

  async function handleEditSave() {
    setSaving(true);
    await supabase
      .from("events")
      .update({
        ...editForm,
        client_id: editForm.client_id || null,
        event_end_date: editForm.event_end_date || null,
      })
      .eq("id", event.id);
    setSaving(false);
    setEditOpen(false);
    refreshEvent();
  }

  // --- Logistics ---
  async function toggleChecklistItem(index: number) {
    const updated = [...event.logistics_checklist];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    await supabase
      .from("events")
      .update({ logistics_checklist: updated })
      .eq("id", event.id);
    setEvent((e) => ({ ...e, logistics_checklist: updated }));
  }

  async function updateChecklistAssignee(index: number, assignee: Assignee) {
    const updated = [...event.logistics_checklist];
    updated[index] = { ...updated[index], assigned_to: assignee };
    await supabase
      .from("events")
      .update({ logistics_checklist: updated })
      .eq("id", event.id);
    setEvent((e) => ({ ...e, logistics_checklist: updated }));
  }

  // --- Finance ---
  const totalCosts = Object.values(event.costs).reduce(
    (sum, v) => sum + v,
    0
  );
  const margin = event.price_ht - totalCosts;

  async function handleAddCost() {
    setSaving(true);
    const updatedCosts = { ...event.costs };
    const existing = updatedCosts[costForm.category] ?? 0;
    updatedCosts[costForm.category] = existing + costForm.amount;
    await supabase
      .from("events")
      .update({ costs: updatedCosts })
      .eq("id", event.id);
    setSaving(false);
    setCostOpen(false);
    setCostForm({ category: "other", amount: 0 });
    refreshEvent();
  }

  async function removeCost(category: string) {
    const updatedCosts = { ...event.costs };
    delete updatedCosts[category];
    await supabase
      .from("events")
      .update({ costs: updatedCosts })
      .eq("id", event.id);
    refreshEvent();
  }

  // --- Debrief ---
  async function saveDebrief() {
    setSaving(true);
    await supabase
      .from("events")
      .update({
        testimonial: testimonial || null,
        testimonial_author: testimonialAuthor || null,
        is_portfolio_visible: portfolioVisible,
      })
      .eq("id", event.id);
    setSaving(false);
    refreshEvent();
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/events"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {tc("back")}
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{event.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge className={STATUS_COLORS[event.status]} variant="secondary">
              {t(`status.${event.status}`)}
            </Badge>
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4" />
              {new Date(event.event_date).toLocaleDateString()}
              {event.event_end_date &&
                ` - ${new Date(event.event_end_date).toLocaleDateString()}`}
            </span>
            {event.location_city && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <MapPin className="h-4 w-4" />
                {event.location_city}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logistics">
            {t("fields.logistics")}
          </TabsTrigger>
          <TabsTrigger value="finance">{tf("title")}</TabsTrigger>
          <TabsTrigger value="debrief">Debrief</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card className="p-4 mt-4">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-semibold">Overview</h2>
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {tc("edit")}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.client && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">
                      {t("fields.client")}
                    </p>
                    <Link
                      href={`/contacts/${event.client_id}`}
                      className="text-sm hover:underline"
                    >
                      {event.client.full_name}
                    </Link>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">
                    {t("fields.date")}
                  </p>
                  <p className="text-sm">
                    {new Date(event.event_date).toLocaleDateString()}
                    {event.event_end_date &&
                      ` - ${new Date(event.event_end_date).toLocaleDateString()}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-400">
                    {t("fields.location")}
                  </p>
                  <p className="text-sm">
                    {event.location}
                    {event.location_city && `, ${event.location_city}`}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  {t("fields.priceHt")}
                </p>
                <p className="text-sm font-medium">
                  {formatPrice(event.price_ht)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">
                  {t("fields.priceTtc")}
                </p>
                <p className="text-sm font-medium">
                  {formatPrice(event.price_ttc)}
                </p>
              </div>
            </div>
            {event.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs text-slate-400 mb-1">
                    {tc("notes")}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{event.notes}</p>
                </div>
              </>
            )}
          </Card>
        </TabsContent>

        {/* Logistics Tab */}
        <TabsContent value="logistics">
          <Card className="p-4 mt-4">
            <h2 className="font-semibold mb-4">{t("logistics.title")}</h2>
            {event.logistics_checklist.length === 0 ? (
              <p className="text-sm text-slate-500">
                {tc("noResults")}
              </p>
            ) : (
              <div className="space-y-2">
                {event.logistics_checklist.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleChecklistItem(index)}
                      className="flex-shrink-0"
                    >
                      {item.checked ? (
                        <Check className="h-5 w-5 text-green-600" />
                      ) : (
                        <Square className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                    <span
                      className={`flex-1 text-sm ${
                        item.checked
                          ? "line-through text-slate-400"
                          : ""
                      }`}
                    >
                      {t.has(`logistics.${item.item}`)
                        ? t(`logistics.${item.item}`)
                        : item.item}
                    </span>
                    <Select
                      value={item.assigned_to}
                      onValueChange={(val) =>
                        updateChecklistAssignee(index, val as Assignee)
                      }
                    >
                      <SelectTrigger className="w-28" size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSIGNEES.map((a) => (
                          <SelectItem key={a} value={a}>
                            {tt(`assignee.${a}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}
            <Separator className="my-4" />
            <p className="text-xs text-slate-400">
              {event.logistics_checklist.filter((i) => i.checked).length} /{" "}
              {event.logistics_checklist.length}
            </p>
          </Card>
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance">
          <div className="space-y-4 mt-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="p-4">
                <p className="text-xs text-slate-400">
                  {t("fields.priceHt")}
                </p>
                <p className="text-xl font-bold mt-1">
                  {formatPrice(event.price_ht)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-400">
                  {tf("costs")}
                </p>
                <p className="text-xl font-bold mt-1">
                  {formatPrice(totalCosts)}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-slate-400">
                  {tf("margin")}
                </p>
                <p
                  className={`text-xl font-bold mt-1 ${
                    margin >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatPrice(margin)}
                </p>
              </Card>
            </div>

            {/* Costs breakdown */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">{tf("costs")}</h2>
                <Button size="sm" onClick={() => setCostOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  {tc("create")}
                </Button>
              </div>
              {Object.keys(event.costs).length === 0 ? (
                <p className="text-sm text-slate-500">
                  {tc("noResults")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tc("category")}</TableHead>
                      <TableHead className="text-right">
                        {tc("amount")}
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(event.costs).map(([cat, amount]) => (
                      <TableRow key={cat}>
                        <TableCell>
                          {tf.has(`categories.${cat}`)
                            ? tf(`categories.${cat}`)
                            : cat}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(amount)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => removeCost(cat)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-medium">Total</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(totalCosts)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Debrief Tab */}
        <TabsContent value="debrief">
          <Card className="p-4 mt-4">
            <h2 className="font-semibold mb-4">Debrief</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("fields.testimonial")}</Label>
                <Textarea
                  value={testimonial}
                  onChange={(e) => setTestimonial(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.testimonialAuthor")}</Label>
                <Input
                  value={testimonialAuthor}
                  onChange={(e) => setTestimonialAuthor(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPortfolioVisible((v) => !v)}
                  className="flex-shrink-0"
                >
                  {portfolioVisible ? (
                    <Check className="h-5 w-5 text-green-600" />
                  ) : (
                    <Square className="h-5 w-5 text-slate-400" />
                  )}
                </button>
                <span className="text-sm">
                  {t("fields.portfolioVisible")}
                </span>
              </div>

              <Separator />

              {/* Photos placeholder */}
              <div>
                <Label className="mb-2 block">Photos</Label>
                <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-slate-400">
                  <ImagePlus className="h-8 w-8 mb-2" />
                  <p className="text-sm">Photo upload placeholder</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveDebrief} disabled={saving}>
                  {saving ? tc("loading") : tc("save")}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Event Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tc("edit")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("fields.title")}</Label>
              <Input
                value={editForm.title}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("fields.client")}</Label>
              <Select
                value={editForm.client_id}
                onValueChange={(val) =>
                  setEditForm((f) => ({ ...f, client_id: val || "" }))
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
                  value={editForm.event_date}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      event_date: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.endDate")}</Label>
                <Input
                  type="date"
                  value={editForm.event_end_date}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      event_end_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.location")}</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      location: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("fields.locationCity")}</Label>
                <Input
                  value={editForm.location_city}
                  onChange={(e) =>
                    setEditForm((f) => ({
                      ...f,
                      location_city: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("fields.priceHt")}</Label>
                <Input
                  type="number"
                  value={editForm.price_ht}
                  onChange={(e) =>
                    setEditForm((f) => ({
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
                  value={editForm.price_ttc}
                  onChange={(e) =>
                    setEditForm((f) => ({
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
                value={editForm.status}
                onValueChange={(val) =>
                  setEditForm((f) => ({
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
              disabled={saving || !editForm.title}
            >
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Cost Dialog */}
      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{tf("costs")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label>{tc("category")}</Label>
              <Select
                value={costForm.category}
                onValueChange={(val) =>
                  setCostForm((f) => ({ ...f, category: val || "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {tf.has(`categories.${cat}`)
                        ? tf(`categories.${cat}`)
                        : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{tc("amount")}</Label>
              <Input
                type="number"
                value={costForm.amount}
                onChange={(e) =>
                  setCostForm((f) => ({
                    ...f,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {tc("cancel")}
            </DialogClose>
            <Button
              onClick={handleAddCost}
              disabled={saving || costForm.amount <= 0}
            >
              {saving ? tc("loading") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
