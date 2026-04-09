"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Link } from "@/lib/i18n/navigation";
import type { Event, Task, Contact, Interaction } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  CalendarDays,
  CheckSquare,
  Users,
  CalendarPlus,
  UserPlus,
  ListTodo,
  Clock,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Image,
  Mail,
  Phone,
  Handshake,
  StickyNote,
  CalendarCheck,
  Activity,
} from "lucide-react";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

const priorityColor: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-slate-100 text-slate-500",
};

const eventStatusColor: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  confirmed: "bg-emerald-50 text-emerald-600",
  in_prep: "bg-blue-50 text-blue-600",
  active: "bg-purple-50 text-purple-600",
  completed: "bg-emerald-50 text-emerald-600",
  invoiced: "bg-teal-50 text-teal-600",
};

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tTasks = useTranslations("tasks");
  const tEvents = useTranslations("events");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<(Event & { client?: Contact })[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<(Interaction & { contact?: Contact })[]>([]);
  const [username, setUsername] = useState("");

  const totalPipeline = contacts
    .filter((c) => c.stage !== "lost")
    .reduce((sum, contact) => {
      const contactEvents = events.filter((e) => e.client_id === contact.id);
      return sum + contactEvents.reduce((s, e) => s + (e.price_ht || 0), 0);
    }, 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const eventsThisMonth = events.filter((e) => {
    const d = new Date(e.event_date);
    return d >= monthStart && d <= monthEnd;
  });

  const openTasks = tasks.filter((t) => t.status !== "done");
  const activeLeads = contacts.filter(
    (c) => c.stage !== "won" && c.stage !== "lost"
  );

  const myAssignee = username === "TanguyC" ? "tanguy" : username === "JulesG" ? "jules" : "";

  const pendingTasks = tasks
    .filter((t) => t.status !== "done" && (!myAssignee || t.assignee === myAssignee || t.assignee === "both"))
    .sort((a, b) => {
      const pOrder = { high: 0, medium: 1, low: 2 };
      const pa = pOrder[a.priority] ?? 1;
      const pb = pOrder[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      if (a.deadline) return -1;
      if (b.deadline) return 1;
      return 0;
    });

  const upcomingEvents = events
    .filter((e) => new Date(e.event_date) >= now)
    .sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    )
    .slice(0, 5);

  const portfolioEvents = events.filter((e) => e.is_portfolio_visible);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Get logged-in user
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) setUsername((authData.user as { email?: string }).email || "");

      const [eventsRes, tasksRes, contactsRes, interactionsRes] = await Promise.all([
        supabase
          .from("events")
          .select("*, client:contacts(*)")
          .order("event_date", { ascending: true }),
        supabase
          .from("tasks")
          .select("*")
          .order("deadline", { ascending: true }),
        supabase.from("contacts").select("*"),
        supabase
          .from("interactions")
          .select("*, contact:contacts(*)")
          .order("date", { ascending: false })
          .limit(10),
      ]);
      if (eventsRes.data) setEvents(eventsRes.data as (Event & { client?: Contact })[]);
      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
      if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
      if (interactionsRes.data) setInteractions(interactionsRes.data as (Interaction & { contact?: Contact })[]);
      setLoading(false);
    }
    load();
  }, []);

  async function toggleTask(task: Task) {
    const supabase = createClient();
    const nextStatus = task.status === "todo" ? "in_progress" : "done";
    const completedAt = nextStatus === "done" ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus, completed_at: completedAt })
      .eq("id", task.id);
    if (!error) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: nextStatus, completed_at: completedAt } : t
        )
      );
      toast.success("Task updated");
    }
  }

  async function togglePortfolio(event: Event & { client?: Contact }) {
    const supabase = createClient();
    const next = !event.is_portfolio_visible;
    const { error } = await supabase
      .from("events")
      .update({ is_portfolio_visible: next })
      .eq("id", event.id);
    if (!error) {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === event.id ? { ...e, is_portfolio_visible: next } : e
        )
      );
      toast.success("Portfolio updated");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const statCards = [
    { label: t("totalPipeline"), value: formatCurrency(totalPipeline), icon: DollarSign, color: "border-l-emerald-500 bg-emerald-50/50", iconColor: "text-emerald-600" },
    { label: t("eventsThisMonth"), value: eventsThisMonth.length, icon: CalendarDays, color: "border-l-blue-500 bg-blue-50/50", iconColor: "text-blue-600" },
    { label: t("openTasks"), value: openTasks.length, icon: CheckSquare, color: "border-l-amber-500 bg-amber-50/50", iconColor: "text-amber-600" },
    { label: t("activeLeads"), value: activeLeads.length, icon: Users, color: "border-l-purple-500 bg-purple-50/50", iconColor: "text-purple-600" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("title")}</h1>
        <p className="text-slate-500 mt-1">{t("welcome")}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border-l-4 ${stat.color} p-5 bg-white dark:bg-card shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{stat.value}</p>
              </div>
              <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tasks + Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{t("myTasks")}</h2>
            <Link href="/tasks" className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
              {tCommon("viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {pendingTasks.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">{t("noTasks")}</p>
            ) : (
              <div className="space-y-0.5">
                {pendingTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task)}
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                        task.status === "in_progress"
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 hover:border-amber-400"
                      }`}
                    >
                      {task.status === "in_progress" && (
                        <div className="h-2 w-2 rounded-sm bg-amber-500" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                      {task.deadline && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {formatShortDate(task.deadline)}
                        </p>
                      )}
                    </div>
                    <Badge className={`${priorityColor[task.priority]} border-0 text-[10px] px-1.5 font-semibold`}>
                      {tTasks(`priority.${task.priority}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{t("upcomingEvents")}</h2>
            <Link href="/events" className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1">
              {tCommon("viewAll")} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">{t("noEvents")}</p>
            ) : (
              <div className="space-y-0.5">
                {upcomingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-center">
                      <span className="text-[10px] font-semibold text-slate-400 leading-none uppercase">
                        {new Intl.DateTimeFormat("fr-FR", { month: "short" })
                          .format(new Date(event.event_date))}
                      </span>
                      <span className="text-sm font-bold text-slate-800 leading-tight">
                        {new Date(event.event_date).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{event.title}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {event.client?.company || event.client?.full_name || ""}
                        {event.location_city ? ` \u2022 ${event.location_city}` : ""}
                      </p>
                    </div>
                    <Badge className={`${eventStatusColor[event.status]} border-0 text-[10px] px-1.5 font-semibold`}>
                      {tEvents(`status.${event.status}`)}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Portfolio Management */}
      <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{t("portfolio")}</h2>
          </div>
          <span className="text-xs text-slate-400">{portfolioEvents.length} {portfolioEvents.length === 1 ? "event" : "events"} visible</span>
        </div>
        <div className="p-4">
          {events.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">{t("noEvents")}</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-colors ${
                    event.is_portfolio_visible
                      ? "border-amber-200 bg-amber-50/50"
                      : "border-slate-100 bg-white"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <Link href={`/events/${event.id}`} className="text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-amber-600 truncate block">
                      {event.title}
                    </Link>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {event.location_city} \u2022 {formatShortDate(event.event_date)}
                    </p>
                  </div>
                  <Badge className={`${eventStatusColor[event.status]} border-0 text-[10px] px-1.5 font-semibold`}>
                    {tEvents(`status.${event.status}`)}
                  </Badge>
                  <button
                    onClick={() => togglePortfolio(event)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      event.is_portfolio_visible
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {event.is_portfolio_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {event.is_portfolio_visible ? "Visible" : "Hidden"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
          {t("quickActions")}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { href: "/events", icon: CalendarPlus, color: "bg-blue-50 text-blue-600", label: t("newEvent"), sub: tEvents("title") },
            { href: "/contacts", icon: UserPlus, color: "bg-purple-50 text-purple-600", label: t("newContact"), sub: tCommon("name") },
            { href: "/tasks", icon: ListTodo, color: "bg-amber-50 text-amber-600", label: t("newTask"), sub: tTasks("title") },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-border bg-white dark:bg-card p-4 hover:border-slate-200 hover:shadow-sm transition-all"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${action.color}`}>
                <action.icon className="h-4 w-4" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                <p className="text-xs text-slate-400">{action.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-card rounded-2xl border border-slate-100 dark:border-border shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{t("recentActivity")}</h2>
          </div>
        </div>
        <div className="p-4">
          {interactions.length === 0 && tasks.filter((t) => t.status === "done").length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No recent activity</p>
          ) : (
            <div className="space-y-0.5">
              {/* Mix completed tasks and recent interactions, sorted by date */}
              {[
                ...interactions.slice(0, 8).map((i) => ({
                  type: "interaction" as const,
                  date: i.date,
                  icon: i.type === "email" ? Mail : i.type === "call" ? Phone : i.type === "meeting" ? Handshake : i.type === "event" ? CalendarCheck : StickyNote,
                  title: i.summary,
                  subtitle: (i.contact as Contact | undefined)?.full_name || "",
                  badge: i.type,
                  badgeColor: "bg-blue-50 text-blue-600",
                })),
                ...tasks.filter((t) => t.status === "done" && t.completed_at).slice(0, 4).map((t) => ({
                  type: "task" as const,
                  date: t.completed_at!,
                  icon: CheckSquare,
                  title: t.title,
                  subtitle: "Task completed",
                  badge: "done",
                  badgeColor: "bg-emerald-50 text-emerald-600",
                })),
              ]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 8)
                .map((item, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.subtitle} \u2022 {formatShortDate(item.date)}</p>
                    </div>
                    <Badge className={`${item.badgeColor} border-0 text-[10px] px-1.5 font-semibold`}>
                      {item.badge}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
