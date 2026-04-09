"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
  isBefore,
  startOfDay,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addYears,
  subYears,
  startOfYear,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import type { Event, Task, EventStatus } from "@/lib/supabase/types";

const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getStatusColor(status: EventStatus): string {
  const colors: Record<EventStatus, string> = {
    draft: "bg-gray-400",
    confirmed: "bg-blue-500",
    in_prep: "bg-amber-500",
    active: "bg-emerald-500",
    completed: "bg-green-700",
    invoiced: "bg-purple-500",
  };
  return colors[status] || "bg-gray-400";
}

function getStatusBadgeVariant(
  status: EventStatus
): "default" | "secondary" | "outline" {
  if (status === "active" || status === "confirmed") return "default";
  if (status === "completed" || status === "invoiced") return "secondary";
  return "outline";
}

export default function CalendarPage() {
  const t = useTranslations("calendar");
  const te = useTranslations("events");
  const tt = useTranslations("tasks");
  const locale = useLocale();
  const WEEKDAYS = locale === "fr" ? WEEKDAYS_FR : WEEKDAYS_EN;
  const tc = useTranslations("common");

  type ViewMode = "day" | "week" | "month" | "year";

  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [view, setView] = useState<ViewMode>("month");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();

    const [eventsRes, tasksRes] = await Promise.all([
      supabase.from("events").select("*").order("event_date", { ascending: true }),
      supabase.from("tasks").select("*").order("deadline", { ascending: true }),
    ]);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (tasksRes.data) setTasks(tasksRes.data);
    setLoading(false);
  }

  // Calendar grid data
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Get the day of week for the first day (0 = Sunday in getDay)
    // We want Monday = 0, so adjust
    let startDow = getDay(monthStart);
    startDow = startDow === 0 ? 6 : startDow - 1; // Convert Sunday=0 to Monday-based

    // Add padding for days before month start
    const paddingBefore: null[] = Array.from({ length: startDow }, () => null);

    return [...paddingBefore, ...days];
  }, [currentMonth]);

  // Events indexed by date string
  const eventsByDate = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of events) {
      const dateKey = format(new Date(event.event_date), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      existing.push(event);
      map.set(dateKey, existing);
    }
    return map;
  }, [events]);

  // Tasks indexed by deadline date string
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (!task.deadline) continue;
      const dateKey = format(new Date(task.deadline), "yyyy-MM-dd");
      const existing = map.get(dateKey) || [];
      existing.push(task);
      map.set(dateKey, existing);
    }
    return map;
  }, [tasks]);

  const goToPrev = useCallback(() => {
    if (view === "day") {
      setSelectedDay((d) => subDays(d || new Date(), 1));
    } else if (view === "week") {
      setCurrentMonth((m) => subWeeks(m, 1));
    } else if (view === "month") {
      setCurrentMonth((m) => subMonths(m, 1));
    } else {
      setCurrentMonth((m) => subYears(m, 1));
    }
  }, [view]);

  const goToNext = useCallback(() => {
    if (view === "day") {
      setSelectedDay((d) => addDays(d || new Date(), 1));
    } else if (view === "week") {
      setCurrentMonth((m) => addWeeks(m, 1));
    } else if (view === "month") {
      setCurrentMonth((m) => addMonths(m, 1));
    } else {
      setCurrentMonth((m) => addYears(m, 1));
    }
  }, [view]);

  const goToToday = useCallback(() => {
    setCurrentMonth(new Date());
    setSelectedDay(new Date());
  }, []);

  // Navigation header text
  const navigationTitle = useMemo(() => {
    if (view === "day") {
      const d = selectedDay || new Date();
      return format(d, "EEEE d MMMM yyyy");
    }
    if (view === "week") {
      const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
      return `${format(weekStart, "d MMM")} - ${format(weekEnd, "d MMM yyyy")}`;
    }
    if (view === "year") {
      return format(currentMonth, "yyyy");
    }
    return format(currentMonth, "MMMM yyyy");
  }, [view, currentMonth, selectedDay]);

  // Week view days
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentMonth, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentMonth, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentMonth]);

  // Year view: 12 mini-month grids
  const yearMonths = useMemo(() => {
    const yearStart = startOfYear(currentMonth);
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [currentMonth]);

  const getMiniMonthDays = useCallback((monthDate: Date) => {
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(monthDate);
    const days = eachDayOfInterval({ start: mStart, end: mEnd });
    let startDow = getDay(mStart);
    startDow = startDow === 0 ? 6 : startDow - 1;
    const paddingBefore: null[] = Array.from({ length: startDow }, () => null);
    return [...paddingBefore, ...days];
  }, []);

  // Selected day data
  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const dateKey = format(selectedDay, "yyyy-MM-dd");
    return eventsByDate.get(dateKey) || [];
  }, [selectedDay, eventsByDate]);

  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    const dateKey = format(selectedDay, "yyyy-MM-dd");
    return tasksByDate.get(dateKey) || [];
  }, [selectedDay, tasksByDate]);

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
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex rounded-full overflow-hidden border border-slate-200">
            {(["day", "week", "month", "year"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => { setView(v); if ((v === "day" || v === "week") && !selectedDay) setSelectedDay(new Date()); }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === v
                    ? "bg-amber-500 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t(v)}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={goToToday}>
            {t("today")}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrev}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-lg font-semibold">
          {navigationTitle}
        </h2>
        <Button variant="ghost" size="icon" onClick={goToNext}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* ============ DAY VIEW ============ */}
      {view === "day" && (() => {
        const dayDate = selectedDay || new Date();
        const dateKey = format(dayDate, "yyyy-MM-dd");
        const dayEvts = eventsByDate.get(dateKey) || [];
        const dayTsks = tasksByDate.get(dateKey) || [];
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800">
              {format(dayDate, "EEEE d MMMM yyyy")}
            </h2>

            {dayEvts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <CalendarDays className="w-4 h-4" />
                  {te("title")}
                </h3>
                <div className="space-y-3">
                  {dayEvts.map((event) => (
                    <Card key={event.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-base">{event.title}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1.5">
                              <Badge variant={getStatusBadgeVariant(event.status)}>
                                {te(`status.${event.status}`)}
                              </Badge>
                              {event.location_city && (
                                <span className="text-sm text-muted-foreground">
                                  {event.location_city}
                                </span>
                              )}
                              {event.client && (
                                <span className="text-sm text-muted-foreground">
                                  {event.client.full_name || event.client.company}
                                </span>
                              )}
                            </div>
                            {event.event_end_date && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {format(new Date(event.event_date), "HH:mm")} - {format(new Date(event.event_end_date), "HH:mm")}
                              </p>
                            )}
                          </div>
                          <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${getStatusColor(event.status)}`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {dayTsks.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-3">{tt("title")}</h3>
                <div className="space-y-3">
                  {dayTsks.map((task) => {
                    const overdue =
                      task.deadline &&
                      isBefore(new Date(task.deadline), startOfDay(new Date())) &&
                      task.status !== "done";
                    return (
                      <Card key={task.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${overdue ? "bg-red-500" : "bg-gray-400"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-base">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <Badge variant={task.priority === "high" ? "destructive" : "secondary"}>
                                  {tt(`priority.${task.priority}`)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {tt(`assignee.${task.assignee}`)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {dayEvts.length === 0 && dayTsks.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mb-2" />
                  <p className="text-sm">{tc("noResults")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        );
      })()}

      {/* ============ WEEK VIEW ============ */}
      {view === "week" && (
        <div>
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {weekDays.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvts = eventsByDate.get(dateKey) || [];
              const dayTsks = tasksByDate.get(dateKey) || [];
              const today = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={`bg-card min-h-[300px] p-2 ${today ? "bg-amber-50" : ""}`}
                >
                  {/* Column header */}
                  <div className="text-center mb-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={`inline-flex items-center justify-center w-7 h-7 text-sm font-semibold rounded-full ${
                        today ? "bg-amber-500 text-white" : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                  </div>

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvts.map((event) => (
                      <div
                        key={event.id}
                        className="rounded px-1.5 py-1 bg-muted/70 text-xs truncate cursor-default"
                        title={event.title}
                      >
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusColor(event.status)}`} />
                          <span className="truncate">{event.title}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tasks */}
                  <div className="space-y-1 mt-1">
                    {dayTsks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded px-1.5 py-1 border border-dashed border-slate-300 text-xs truncate cursor-default"
                        title={task.title}
                      >
                        <span className="truncate">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ MONTH VIEW (existing) ============ */}
      {view === "month" && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Grid */}
          <div className="flex-1">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {calendarDays.map((day, idx) => {
                if (!day) {
                  return (
                    <div
                      key={`pad-${idx}`}
                      className="bg-card min-h-[80px] p-1.5"
                    />
                  );
                }

                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(dateKey) || [];
                const dayTasks = tasksByDate.get(dateKey) || [];
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);
                const inMonth = isSameMonth(day, currentMonth);

                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDay(day)}
                    className={`bg-card min-h-[80px] p-1.5 text-left transition-colors hover:bg-accent/50 ${
                      isSelected
                        ? "ring-2 ring-primary ring-inset"
                        : ""
                    } ${!inMonth ? "opacity-40" : ""}`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${
                        today
                          ? "bg-amber-500 text-white"
                          : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Event dots */}
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`w-2 h-2 rounded-full ${getStatusColor(
                            event.status
                          )}`}
                          title={event.title}
                        />
                      ))}
                      {dayTasks.slice(0, 3).map((task) => {
                        const overdue =
                          task.deadline &&
                          isBefore(
                            new Date(task.deadline),
                            startOfDay(new Date())
                          ) &&
                          task.status !== "done";
                        return (
                          <div
                            key={task.id}
                            className={`w-2 h-2 rounded-full ${
                              overdue ? "bg-red-500" : "bg-gray-400"
                            }`}
                            title={task.title}
                          />
                        );
                      })}
                      {dayEvents.length + dayTasks.length > 6 && (
                        <span className="text-[10px] text-muted-foreground ml-0.5">
                          +{dayEvents.length + dayTasks.length - 6}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day Detail Panel */}
          <div className="lg:w-80 shrink-0">
            {selectedDay ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    {format(selectedDay, "EEEE d MMMM yyyy")}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setSelectedDay(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Events for this day */}
                  {selectedDayEvents.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" />
                        {te("title")}
                      </h3>
                      <div className="space-y-2">
                        {selectedDayEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                          >
                            <div
                              className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getStatusColor(
                                event.status
                              )}`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {event.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  variant={getStatusBadgeVariant(event.status)}
                                >
                                  {te(`status.${event.status}`)}
                                </Badge>
                                {event.location_city && (
                                  <span className="text-xs text-muted-foreground">
                                    {event.location_city}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDayEvents.length > 0 &&
                    selectedDayTasks.length > 0 && <Separator />}

                  {/* Tasks for this day */}
                  {selectedDayTasks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        {tt("title")}
                      </h3>
                      <div className="space-y-2">
                        {selectedDayTasks.map((task) => {
                          const overdue =
                            task.deadline &&
                            isBefore(
                              new Date(task.deadline),
                              startOfDay(new Date())
                            ) &&
                            task.status !== "done";
                          return (
                            <div
                              key={task.id}
                              className="flex items-start gap-2 p-2 rounded-md bg-muted/50"
                            >
                              <div
                                className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                  overdue ? "bg-red-500" : "bg-gray-400"
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge
                                    variant={
                                      task.priority === "high"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {tt(`priority.${task.priority}`)}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {tt(`assignee.${task.assignee}`)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {selectedDayEvents.length === 0 &&
                    selectedDayTasks.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {tc("noResults")}
                      </p>
                    )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <CalendarDays className="w-8 h-8 mb-2" />
                  <p className="text-sm">{tc("noResults")}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ============ YEAR VIEW ============ */}
      {view === "year" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {yearMonths.map((monthDate) => {
            const miniDays = getMiniMonthDays(monthDate);
            const isCurrentMonth = isSameMonth(monthDate, new Date());
            return (
              <button
                key={format(monthDate, "yyyy-MM")}
                onClick={() => {
                  setCurrentMonth(monthDate);
                  setView("month");
                }}
                className={`rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 ${
                  isCurrentMonth ? "border-amber-400 border-2" : "border-border"
                }`}
              >
                <h3 className="text-sm font-semibold mb-2">
                  {format(monthDate, "MMMM")}
                </h3>
                {/* Mini weekday headers */}
                <div className="grid grid-cols-7 gap-px mb-0.5">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                    <div
                      key={`${format(monthDate, "yyyy-MM")}-wd-${i}`}
                      className="text-center text-[9px] text-muted-foreground"
                    >
                      {d}
                    </div>
                  ))}
                </div>
                {/* Mini day grid */}
                <div className="grid grid-cols-7 gap-px">
                  {miniDays.map((day, idx) => {
                    if (!day) {
                      return <div key={`mini-pad-${format(monthDate, "yyyy-MM")}-${idx}`} className="h-5" />;
                    }
                    const dateKey = format(day, "yyyy-MM-dd");
                    const hasEvents = (eventsByDate.get(dateKey) || []).length > 0;
                    const hasTasks = (tasksByDate.get(dateKey) || []).length > 0;
                    const today = isToday(day);
                    return (
                      <div key={dateKey} className="flex flex-col items-center h-5 justify-center relative">
                        <span
                          className={`text-[10px] leading-none ${
                            today ? "font-bold text-amber-600" : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {(hasEvents || hasTasks) && (
                          <div className="flex gap-px absolute -bottom-0.5">
                            {hasEvents && <div className="w-1 h-1 rounded-full bg-amber-500" />}
                            {hasTasks && <div className="w-1 h-1 rounded-full bg-slate-400" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
