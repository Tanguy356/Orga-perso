"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/lib/i18n/navigation";
import { format } from "date-fns";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Loader2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
  Event,
  FinancialEntry,
  FinancialEntryType,
} from "@/lib/supabase/types";

const ENTRY_TYPES: FinancialEntryType[] = [
  "fixed_cost",
  "variable_cost",
  "revenue",
  "expense",
];

const CATEGORIES = [
  "transport",
  "crew",
  "equipment",
  "customization",
  "insurance",
  "storage",
  "maintenance",
  "other",
] as const;

function formatEur(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

function isRevenue(type: FinancialEntryType): boolean {
  return type === "revenue";
}

function isCost(type: FinancialEntryType): boolean {
  return type === "fixed_cost" || type === "variable_cost" || type === "expense";
}

export default function FinancePage() {
  const t = useTranslations("finance");
  const tc = useTranslations("common");

  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formType, setFormType] = useState<FinancialEntryType>("revenue");
  const [formCategory, setFormCategory] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [formEventId, setFormEventId] = useState<string>("");
  const [formRecurring, setFormRecurring] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();

    const [entriesRes, eventsRes] = await Promise.all([
      supabase
        .from("financial_entries")
        .select("*")
        .order("date", { ascending: false }),
      supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false }),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    setLoading(false);
  }

  // Overview calculations
  const totals = useMemo(() => {
    const totalRevenue = entries
      .filter((e) => isRevenue(e.type))
      .reduce((sum, e) => sum + e.amount, 0);

    const totalFixedCosts = entries
      .filter((e) => e.type === "fixed_cost")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalVariableCosts = entries
      .filter((e) => e.type === "variable_cost" || e.type === "expense")
      .reduce((sum, e) => sum + e.amount, 0);

    const totalCosts = totalFixedCosts + totalVariableCosts;

    const netMargin = totalRevenue - totalCosts;

    const recurringCount = entries.filter((e) => e.recurring).length;

    const distinctMonths = new Set(
      entries.map((e) => format(new Date(e.date), "yyyy-MM"))
    ).size;
    const monthlyAvgRevenue =
      distinctMonths > 0 ? totalRevenue / distinctMonths : 0;
    const marginPct =
      totalRevenue > 0 ? ((netMargin / totalRevenue) * 100) : 0;

    // Per-event margins
    const eventEntries = entries.filter((e) => e.event_id);
    const eventMap = new Map<string, { revenue: number; costs: number }>();

    for (const entry of eventEntries) {
      const existing = eventMap.get(entry.event_id!) || {
        revenue: 0,
        costs: 0,
      };
      if (isRevenue(entry.type)) {
        existing.revenue += entry.amount;
      } else if (isCost(entry.type)) {
        existing.costs += entry.amount;
      }
      eventMap.set(entry.event_id!, existing);
    }

    // Also factor in event price_ht and costs from the event itself
    for (const event of events) {
      const existing = eventMap.get(event.id) || { revenue: 0, costs: 0 };
      // Event price_ht as revenue if not already tracked via entries
      if (existing.revenue === 0 && event.price_ht > 0) {
        existing.revenue += event.price_ht;
      }
      // Event costs object
      if (event.costs && typeof event.costs === "object") {
        const eventCostTotal = Object.values(event.costs).reduce(
          (sum, val) => sum + (typeof val === "number" ? val : 0),
          0
        );
        if (existing.costs === 0 && eventCostTotal > 0) {
          existing.costs += eventCostTotal;
        }
      }
      eventMap.set(event.id, existing);
    }

    const margins = Array.from(eventMap.values()).map(
      (v) => v.revenue - v.costs
    );
    const avgEventMargin =
      margins.length > 0
        ? margins.reduce((sum, m) => sum + m, 0) / margins.length
        : 0;

    return {
      totalRevenue,
      totalFixedCosts,
      totalVariableCosts,
      totalCosts,
      netMargin,
      avgEventMargin,
      eventMap,
      recurringCount,
      monthlyAvgRevenue,
      marginPct,
    };
  }, [entries, events]);

  // Monthly revenue vs costs data for charts
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; costs: number }>();

    for (const entry of entries) {
      const key = format(new Date(entry.date), "MMM yyyy");
      const existing = monthMap.get(key) || { revenue: 0, costs: 0 };
      if (isRevenue(entry.type)) {
        existing.revenue += entry.amount;
      } else if (isCost(entry.type)) {
        existing.costs += entry.amount;
      }
      monthMap.set(key, existing);
    }

    return Array.from(monthMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => {
        const da = new Date(a.month);
        const db = new Date(b.month);
        return da.getTime() - db.getTime();
      });
  }, [entries]);

  // Cost breakdown by category for charts
  const costBreakdown = useMemo(() => {
    const catMap = new Map<string, number>();

    for (const entry of entries) {
      if (isCost(entry.type)) {
        const existing = catMap.get(entry.category) || 0;
        catMap.set(entry.category, existing + entry.amount);
      }
    }

    return Array.from(catMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  // P&L breakdown grouped by type then category
  const plBreakdown = useMemo(() => {
    const grouped: Record<string, Map<string, number>> = {
      revenue: new Map(),
      fixed_cost: new Map(),
      variable_cost: new Map(),
    };

    for (const entry of entries) {
      let bucket: string;
      if (isRevenue(entry.type)) {
        bucket = "revenue";
      } else if (entry.type === "fixed_cost") {
        bucket = "fixed_cost";
      } else {
        bucket = "variable_cost";
      }
      const existing = grouped[bucket].get(entry.category) || 0;
      grouped[bucket].set(entry.category, existing + entry.amount);
    }

    const toSorted = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount);

    return {
      revenue: toSorted(grouped.revenue),
      fixedCosts: toSorted(grouped.fixed_cost),
      variableCosts: toSorted(grouped.variable_cost),
    };
  }, [entries]);

  // Per-event table data
  const perEventData = useMemo(() => {
    return events.map((event) => {
      const data = totals.eventMap.get(event.id) || { revenue: 0, costs: 0 };
      const margin = data.revenue - data.costs;
      const marginPct = data.revenue > 0 ? (margin / data.revenue) * 100 : 0;

      return {
        event,
        revenue: data.revenue,
        costs: data.costs,
        margin,
        marginPct,
      };
    });
  }, [events, totals]);

  function resetForm() {
    setFormType("revenue");
    setFormCategory("");
    setFormAmount("");
    setFormDescription("");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormEventId("");
    setFormRecurring(false);
  }

  async function handleCreate() {
    if (!formCategory || !formAmount || !formDate) return;
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from("financial_entries").insert({
      type: formType,
      category: formCategory,
      amount: parseFloat(formAmount),
      description: formDescription,
      date: formDate,
      event_id: formEventId || null,
      recurring: formRecurring,
    });

    if (!error) {
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  }

  function exportCSV(data: FinancialEntry[]) {
    const header = ["Date", "Type", "Category", "Description", "Amount", "Event", "Recurring"];
    const rows = data.map((entry) => [
      entry.date,
      entry.type,
      entry.category,
      `"${(entry.description || "").replace(/"/g, '""')}"`,
      entry.amount.toString(),
      `"${getEventName(entry.event_id) || ""}"`,
      entry.recurring ? "Yes" : "No",
    ]);

    const csvContent = "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `simupara-finance-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function getEventName(eventId: string | null): string | null {
    if (!eventId) return null;
    const event = events.find((e) => e.id === eventId);
    return event?.title || null;
  }

  function entryTypeBadgeVariant(
    type: FinancialEntryType
  ): "default" | "secondary" | "destructive" | "outline" {
    if (type === "revenue") return "default";
    if (type === "expense") return "destructive";
    return "secondary";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{tc("loading")}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportCSV(entries)}>
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
              render={
                <Button>
                  <Plus className="w-4 h-4" />
                  {t("newEntry")}
                </Button>
              }
            />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("newEntry")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Type */}
              <div className="space-y-1.5">
                <Label>{tc("type")}</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as FinancialEntryType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTRY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`entryType.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>{tc("category")}</Label>
                <Select value={formCategory} onValueChange={(val) => setFormCategory(val ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={tc("category")} />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`categories.${cat}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="amount">{tc("amount")}</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">{tc("description")}</Label>
                <Textarea
                  id="description"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder={tc("description")}
                />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="date">{tc("date")}</Label>
                <Input
                  id="date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </div>

              {/* Event (optional) */}
              <div className="space-y-1.5">
                <Label>{t("perEvent")}</Label>
                <Select value={formEventId} onValueChange={(v) => setFormEventId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Recurring */}
              <div className="flex items-center gap-2">
                <input
                  id="recurring"
                  type="checkbox"
                  checked={formRecurring}
                  onChange={(e) => setFormRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="recurring">Recurring</Label>
              </div>
            </div>

            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" />}
              >
                {tc("cancel")}
              </DialogClose>
              <Button onClick={handleCreate} disabled={saving || !formCategory || !formAmount}>
                {saving ? tc("loading") : tc("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="rounded-xl border-l-4 border-l-emerald-500 p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">{t("revenue")}</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">{formatEur(totals.totalRevenue)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("monthlyAvg")}: {formatEur(totals.monthlyAvgRevenue)}
          </p>
        </div>

        {/* Fixed Costs */}
        <div className="rounded-xl border-l-4 border-l-orange-500 p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">{t("fixedCosts")}</span>
            <TrendingDown className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">{formatEur(totals.totalFixedCosts)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {totals.recurringCount} {t("recurring")}
          </p>
        </div>

        {/* Variable Costs */}
        <div className="rounded-xl border-l-4 border-l-red-500 p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">{t("variableCosts")}</span>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatEur(totals.totalVariableCosts)}</p>
        </div>

        {/* Net Profit */}
        <div className="rounded-xl border-l-4 border-l-blue-500 p-5 bg-white shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-muted-foreground">{t("netProfit")}</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className={`text-2xl font-bold ${totals.netMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {formatEur(totals.netMargin)}
          </p>
          <p className={`text-xs mt-1 ${totals.netMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {totals.marginPct.toFixed(1)}% {t("margin")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("summary")}</TabsTrigger>
          <TabsTrigger value="per-event">{t("perEvent")}</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
        </TabsList>

        {/* Summary / P&L Tab */}
        <TabsContent value="overview">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <DollarSign className="w-10 h-10 mb-2" />
              <p>{tc("noResults")}</p>
            </div>
          ) : (
            <div className="max-w-2xl space-y-6">
              {/* Revenue section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("revenue")}
                </h3>
                {plBreakdown.revenue.map((item) => (
                  <div key={item.category} className="flex justify-between py-1.5 px-2">
                    <span className="text-sm text-emerald-700">{item.category}</span>
                    <span className="text-sm font-medium text-emerald-700">{formatEur(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-2 border-t border-slate-200 mt-1">
                  <span className="text-sm font-semibold text-slate-700">Subtotal</span>
                  <span className="text-sm font-semibold text-emerald-700">{formatEur(totals.totalRevenue)}</span>
                </div>
              </div>

              {/* Fixed Costs section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("fixedCosts")}
                </h3>
                {plBreakdown.fixedCosts.map((item) => (
                  <div key={item.category} className="flex justify-between py-1.5 px-2">
                    <span className="text-sm text-slate-600">{item.category}</span>
                    <span className="text-sm font-medium text-red-600">{formatEur(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-2 border-t border-slate-200 mt-1">
                  <span className="text-sm font-semibold text-slate-700">Subtotal</span>
                  <span className="text-sm font-semibold text-red-600">{formatEur(totals.totalFixedCosts)}</span>
                </div>
              </div>

              {/* Variable Costs section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {t("variableCosts")}
                </h3>
                {plBreakdown.variableCosts.map((item) => (
                  <div key={item.category} className="flex justify-between py-1.5 px-2">
                    <span className="text-sm text-slate-600">{item.category}</span>
                    <span className="text-sm font-medium text-red-600">{formatEur(item.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 px-2 border-t border-slate-200 mt-1">
                  <span className="text-sm font-semibold text-slate-700">Subtotal</span>
                  <span className="text-sm font-semibold text-red-600">{formatEur(totals.totalVariableCosts)}</span>
                </div>
              </div>

              {/* Net Result */}
              <div className="flex justify-between py-3 px-2 border-t-4 border-double border-slate-400">
                <span className="text-lg font-bold text-slate-900">{t("netProfit")}</span>
                <span className={`text-lg font-bold ${totals.netMargin >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatEur(totals.netMargin)}
                </span>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Per Event Tab */}
        <TabsContent value="per-event">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mb-2" />
              <p>{tc("noResults")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>{tc("date")}</TableHead>
                  <TableHead className="text-right">Prix HT</TableHead>
                  <TableHead className="text-right">{t("costs")}</TableHead>
                  <TableHead className="text-right">{t("margin")}</TableHead>
                  <TableHead className="text-right">{t("margin")} %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perEventData.map(({ event, revenue, costs, margin, marginPct }) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">
                      {event.title}
                    </TableCell>
                    <TableCell>
                      {format(new Date(event.event_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatEur(event.price_ht)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatEur(costs)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        margin >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {formatEur(margin)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        marginPct >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {marginPct.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BarChart3 className="w-10 h-10 mb-2" />
              <p>{tc("noResults")}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Monthly Revenue vs Costs */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Revenue vs Costs</CardTitle>
                </CardHeader>
                <CardContent>
                  {monthlyData.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tc("noResults")}</p>
                  ) : (
                    <div className="flex items-end gap-4 overflow-x-auto pb-2" style={{ minHeight: 260 }}>
                      {(() => {
                        const maxVal = Math.max(
                          ...monthlyData.flatMap((d) => [d.revenue, d.costs]),
                          1
                        );
                        return monthlyData.map((d) => (
                          <div key={d.month} className="flex flex-col items-center gap-1 min-w-[72px]">
                            <div className="flex items-end gap-1" style={{ height: 200 }}>
                              {/* Revenue bar */}
                              <div className="flex flex-col items-center justify-end h-full">
                                <span className="text-sm font-semibold text-emerald-600 mb-1">
                                  {formatEur(d.revenue)}
                                </span>
                                <div
                                  className="w-7 bg-emerald-500 rounded-t"
                                  style={{ height: `${(d.revenue / maxVal) * 100}%`, minHeight: d.revenue > 0 ? 4 : 0 }}
                                />
                              </div>
                              {/* Costs bar */}
                              <div className="flex flex-col items-center justify-end h-full">
                                <span className="text-sm font-semibold text-red-600 mb-1">
                                  {formatEur(d.costs)}
                                </span>
                                <div
                                  className="w-7 bg-red-500 rounded-t"
                                  style={{ height: `${(d.costs / maxVal) * 100}%`, minHeight: d.costs > 0 ? 4 : 0 }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-slate-500 mt-1 whitespace-nowrap">{d.month}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                      <span className="text-xs text-slate-500">{t("revenue")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm bg-red-500" />
                      <span className="text-xs text-slate-500">{t("costs")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cost Breakdown by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Cost Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  {costBreakdown.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{tc("noResults")}</p>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const maxAmount = Math.max(...costBreakdown.map((c) => c.amount), 1);
                        return costBreakdown.map((c) => (
                          <div key={c.category} className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 w-32 text-right shrink-0 truncate">
                              {c.category}
                            </span>
                            <div className="flex-1 h-6 bg-slate-100 rounded-r overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-r flex items-center justify-end pr-2"
                                style={{ width: `${(c.amount / maxAmount) * 100}%`, minWidth: c.amount > 0 ? 40 : 0 }}
                              >
                                <span className="text-sm font-semibold text-white whitespace-nowrap">
                                  {formatEur(c.amount)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
