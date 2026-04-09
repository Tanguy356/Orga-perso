"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/lib/i18n/navigation";
import {
  CalendarDays,
  Users,
  CheckSquare,
  FileText,
  Search,
  Banknote,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "event" | "contact" | "task" | "document";
  title: string;
  subtitle: string;
  href: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  // Cmd+K to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const lower = q.toLowerCase();

    const [eventsRes, contactsRes, tasksRes, docsRes] = await Promise.all([
      supabase.from("events").select("id, title, location_city, event_date"),
      supabase.from("contacts").select("id, full_name, company, city"),
      supabase.from("tasks").select("id, title, status, assignee"),
      supabase.from("documents").select("id, name, category"),
    ]);

    const found: SearchResult[] = [];

    for (const e of (eventsRes.data || []) as { id: string; title: string; location_city: string; event_date: string }[]) {
      if (e.title.toLowerCase().includes(lower) || (e.location_city || "").toLowerCase().includes(lower)) {
        found.push({ id: e.id, type: "event", title: e.title, subtitle: e.location_city || "", href: `/events/${e.id}` });
      }
    }
    for (const c of (contactsRes.data || []) as { id: string; full_name: string; company: string; city: string }[]) {
      if (c.full_name.toLowerCase().includes(lower) || (c.company || "").toLowerCase().includes(lower)) {
        found.push({ id: c.id, type: "contact", title: c.full_name, subtitle: c.company || c.city || "", href: `/contacts/${c.id}` });
      }
    }
    for (const t of (tasksRes.data || []) as { id: string; title: string; status: string; assignee: string }[]) {
      if (t.title.toLowerCase().includes(lower)) {
        found.push({ id: t.id, type: "task", title: t.title, subtitle: t.status, href: "/tasks" });
      }
    }
    for (const d of (docsRes.data || []) as { id: string; name: string; category: string }[]) {
      if (d.name.toLowerCase().includes(lower)) {
        found.push({ id: d.id, type: "document", title: d.name, subtitle: d.category, href: "/documents" });
      }
    }

    setResults(found.slice(0, 12));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 200);
    return () => clearTimeout(timeout);
  }, [query, search]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  }

  const typeIcon = {
    event: CalendarDays,
    contact: Users,
    task: CheckSquare,
    document: FileText,
  };

  const typeColor = {
    event: "text-blue-500",
    contact: "text-purple-500",
    task: "text-amber-500",
    document: "text-slate-500",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-full max-w-lg">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, contacts, tasks, documents..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
            />
            <kbd className="text-[10px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">ESC</kbd>
          </div>
          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto p-2">
              {results.map((result) => {
                const Icon = typeIcon[result.type];
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelect(result)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon className={`w-4 h-4 ${typeColor[result.type]} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{result.title}</p>
                      <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 uppercase">{result.type}</span>
                  </button>
                );
              })}
            </div>
          )}
          {query && results.length === 0 && (
            <div className="py-8 text-center text-sm text-slate-400">No results found</div>
          )}
          {!query && (
            <div className="py-6 text-center text-xs text-slate-400">
              Type to search across events, contacts, tasks and documents
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
