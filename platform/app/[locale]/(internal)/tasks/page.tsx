"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import type {
  Task,
  TaskStatus,
  TaskPriority,
  Assignee,
  Event,
  Contact,
} from "@/lib/supabase/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Loader2,
  Check,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Calendar,
  User,
  Pencil,
  Trash2,
  LinkIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const priorityColor: Record<string, string> = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const statusIcon: Record<string, React.ReactNode> = {
  todo: <div className="h-2 w-2 rounded-full border-2 border-slate-400/40" />,
  in_progress: <div className="h-2 w-2 rounded-full bg-blue-500" />,
  done: <Check className="h-3 w-3 text-emerald-600" />,
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline) < new Date(new Date().toDateString());
}

function isThisWeek(deadline: string | null): boolean {
  if (!deadline) return false;
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1); // Monday
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  const d = new Date(deadline);
  return d >= start && d <= end;
}

function sortTasks(tasks: Task[]): Task[] {
  const pOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return [...tasks].sort((a, b) => {
    const pa = pOrder[a.priority] ?? 1;
    const pb = pOrder[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskForm {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee: Assignee;
  deadline: string;
  event_id: string;
  contact_id: string;
}

const emptyForm: TaskForm = {
  title: "",
  description: "",
  priority: "medium",
  assignee: "tanguy",
  deadline: "",
  event_id: "",
  contact_id: "",
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // Fetch
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const [tasksRes, eventsRes, contactsRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*, event:events(*), contact:contacts(*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("id, title")
          .order("event_date", { ascending: false }),
        supabase
          .from("contacts")
          .select("id, full_name, company")
          .order("full_name", { ascending: true }),
      ]);
      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (contactsRes.data) setContacts(contactsRes.data as Contact[]);
      setLoading(false);
    }
    load();
  }, []);

  // Filtered tasks
  const filtered = useMemo(() => {
    switch (activeTab) {
      case "mine":
        return tasks.filter((t) => t.assignee === "tanguy");
      case "overdue":
        return tasks.filter(
          (t) => t.status !== "done" && isOverdue(t.deadline)
        );
      case "week":
        return tasks.filter(
          (t) => t.status !== "done" && isThisWeek(t.deadline)
        );
      default:
        return tasks;
    }
  }, [tasks, activeTab]);

  // Group by status
  const grouped = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
    for (const task of filtered) {
      groups[task.status].push(task);
    }
    return {
      todo: sortTasks(groups.todo),
      in_progress: sortTasks(groups.in_progress),
      done: sortTasks(groups.done),
    };
  }, [filtered]);

  // CRUD
  const toggleStatus = useCallback(
    async (task: Task) => {
      const supabase = createClient();
      let nextStatus: TaskStatus;
      if (task.status === "todo") nextStatus = "in_progress";
      else if (task.status === "in_progress") nextStatus = "done";
      else nextStatus = "todo";

      const completedAt =
        nextStatus === "done" ? new Date().toISOString() : null;

      const { error } = await supabase
        .from("tasks")
        .update({ status: nextStatus, completed_at: completedAt })
        .eq("id", task.id);

      if (!error) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: nextStatus, completed_at: completedAt }
              : t
          )
        );
      }
    },
    []
  );

  function openCreate() {
    setEditingTask(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority,
      assignee: task.assignee,
      deadline: task.deadline ? task.deadline.slice(0, 10) : "",
      event_id: task.event_id || "",
      contact_id: task.contact_id || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    const supabase = createClient();

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
      assignee: form.assignee,
      deadline: form.deadline || null,
      event_id: form.event_id || null,
      contact_id: form.contact_id || null,
    };

    if (editingTask) {
      const { data, error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", editingTask.id)
        .select("*, event:events(*), contact:contacts(*)")
        .single();

      if (!error && data) {
        setTasks((prev) =>
          prev.map((t) => (t.id === editingTask.id ? (data as Task) : t))
        );
      }
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...payload, status: "todo" as TaskStatus })
        .select("*, event:events(*), contact:contacts(*)")
        .single();

      if (!error && data) {
        setTasks((prev) => [data as Task, ...prev]);
      }
    }

    setSaving(false);
    setDialogOpen(false);
  }

  async function handleDelete(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (expandedId === id) setExpandedId(null);
    }
  }

  // Field updater
  function setField<K extends keyof TaskForm>(key: K, value: TaskForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  // ----- Task row -----
  function TaskRow({ task }: { task: Task }) {
    const expanded = expandedId === task.id;
    const overdue = task.status !== "done" && isOverdue(task.deadline);

    return (
      <div className="group">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors">
          {/* Status toggle */}
          <button
            onClick={() => toggleStatus(task)}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
              task.status === "done"
                ? "border-emerald-500 bg-emerald-100 dark:bg-emerald-900/30"
                : task.status === "in_progress"
                  ? "border-blue-500 bg-blue-100 dark:bg-blue-900/30"
                  : "border-slate-400/30 hover:border-amber-500"
            }`}
          >
            {statusIcon[task.status]}
          </button>

          {/* Title (clickable to expand) */}
          <button
            onClick={() =>
              setExpandedId(expanded ? null : task.id)
            }
            className="flex-1 min-w-0 text-left"
          >
            <span
              className={`text-sm font-medium truncate block ${
                task.status === "done"
                  ? "line-through text-slate-400"
                  : ""
              }`}
            >
              {task.title}
            </span>
          </button>

          {/* Priority */}
          <Badge
            className={`${priorityColor[task.priority]} border-0 text-[10px] px-1.5 shrink-0`}
          >
            {t(`priority.${task.priority}`)}
          </Badge>

          {/* Assignee */}
          <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">
            {t(`assignee.${task.assignee}`)}
          </Badge>

          {/* Deadline */}
          {task.deadline && (
            <span
              className={`text-xs shrink-0 flex items-center gap-1 ${
                overdue
                  ? "text-red-600 dark:text-red-400 font-medium"
                  : "text-slate-500"
              }`}
            >
              {overdue && <AlertTriangle className="h-3 w-3" />}
              <Clock className="h-3 w-3" />
              {formatShortDate(task.deadline)}
            </span>
          )}

          {/* Expand indicator */}
          <span className="text-slate-400">
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </span>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div className="ml-8 mr-3 mb-2 pl-3 border-l-2 border-muted space-y-3 pb-2">
            {task.description && (
              <p className="text-sm text-slate-500 whitespace-pre-wrap">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-slate-500">
              {task.event && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {task.event.title}
                </span>
              )}
              {task.contact && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {task.contact.full_name}
                  {task.contact.company ? ` (${task.contact.company})` : ""}
                </span>
              )}
              {task.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(task.deadline)}
                </span>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="xs"
                onClick={() => openEdit(task)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                {tCommon("edit")}
              </Button>
              <Button
                variant="destructive"
                size="xs"
                onClick={() => handleDelete(task.id)}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {tCommon("delete")}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----- Status group -----
  function StatusGroup({
    status,
    tasks,
  }: {
    status: TaskStatus;
    tasks: Task[];
  }) {
    if (tasks.length === 0) return null;
    return (
      <div>
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="flex items-center justify-center h-5 w-5">
            {statusIcon[status]}
          </span>
          <h3 className="text-sm font-semibold">{t(`status.${status}`)}</h3>
          <span className="text-xs text-slate-400">({tasks.length})</span>
        </div>
        <div className="space-y-0.5">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      </div>
    );
  }

  // ---

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{t("title")}</h1>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Plus className="h-4 w-4 mr-1" />
          {t("new")}
        </Button>
      </div>

      {/* Filter tabs */}
      <Tabs
        defaultValue="all"
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as string)}
      >
        <TabsList>
          <TabsTrigger value="all">{t("filters.all")}</TabsTrigger>
          <TabsTrigger value="mine">{t("filters.mine")}</TabsTrigger>
          <TabsTrigger value="overdue">{t("filters.overdue")}</TabsTrigger>
          <TabsTrigger value="week">{t("filters.thisWeek")}</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardContent className="py-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Check className="h-10 w-10 text-slate-400/30 mb-3" />
                  <p className="text-sm text-slate-500">
                    {tCommon("noResults")}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <StatusGroup status="todo" tasks={grouped.todo} />
                  <StatusGroup status="in_progress" tasks={grouped.in_progress} />
                  <StatusGroup status="done" tasks={grouped.done} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? tCommon("edit") : t("new")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="task-title">{tCommon("name")}</Label>
              <Input
                id="task-title"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className="mt-1"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="task-desc">{tCommon("description")}</Label>
              <Textarea
                id="task-desc"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Priority + Assignee row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{tCommon("priority")}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(val) =>
                    setField("priority", val as TaskPriority)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">{t("priority.high")}</SelectItem>
                    <SelectItem value="medium">
                      {t("priority.medium")}
                    </SelectItem>
                    <SelectItem value="low">{t("priority.low")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{tCommon("assignee")}</Label>
                <Select
                  value={form.assignee}
                  onValueChange={(val) =>
                    setField("assignee", val as Assignee)
                  }
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tanguy">
                      {t("assignee.tanguy")}
                    </SelectItem>
                    <SelectItem value="jules">
                      {t("assignee.jules")}
                    </SelectItem>
                    <SelectItem value="both">{t("assignee.both")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <Label htmlFor="task-deadline">{tCommon("deadline")}</Label>
              <Input
                id="task-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => setField("deadline", e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Linked event + contact */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="flex items-center gap-1">
                  <LinkIcon className="h-3 w-3" />
                  Event
                </Label>
                <Select
                  value={form.event_id}
                  onValueChange={(val) => setField("event_id", val || "")}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {events.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Contact
                </Label>
                <Select
                  value={form.contact_id}
                  onValueChange={(val) => setField("contact_id", val || "")}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.full_name}
                        {c.company ? ` (${c.company})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              {tCommon("cancel")}
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()} className="bg-amber-500 hover:bg-amber-600 text-white">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {editingTask ? tCommon("save") : tCommon("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
