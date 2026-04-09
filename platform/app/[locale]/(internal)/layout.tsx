"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Columns3,
  CheckSquare,
  Users,
  Banknote,
  Calendar,
  FileText,
  Globe,
  LogOut,
  Menu,
  Moon,
  Sun,
} from "lucide-react";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { GlobalSearch } from "@/components/global-search";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, key: "dashboard" },
  { href: "/events", icon: Columns3, key: "events" },
  { href: "/tasks", icon: CheckSquare, key: "tasks" },
  { href: "/contacts", icon: Users, key: "contacts" },
  { href: "/finance", icon: Banknote, key: "finance" },
  { href: "/calendar", icon: Calendar, key: "calendar" },
  { href: "/documents", icon: FileText, key: "documents" },
] as const;

function SidebarContent({ pathname, username }: { pathname: string; username: string }) {
  const t = useTranslations("nav");
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const initials = username === "TanguyC" ? "TC" : username === "JulesG" ? "JG" : username.slice(0, 2).toUpperCase();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-white">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-extrabold text-lg tracking-tight">
            Simu<span className="text-amber-500">Para</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-0.5">
        {navItems.map(({ href, icon: Icon, key }) => {
          const isActive = pathname.includes(href);
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-amber-500/10 text-amber-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-slate-800 pt-3 mt-3 space-y-2">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors flex-1"
          >
            <Globe className="w-4 h-4" />
            {t("website")}
          </Link>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-lg text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
            title="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <span className="text-sm font-medium text-slate-300 flex-1 truncate">{username}</span>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-white/5 hover:text-white transition-colors"
            title={t("logout")}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((res: { data: { user: { email?: string } | null }; error: unknown }) => {
      if (!res.data.user) {
        router.push("/login");
      } else {
        setAuthenticated(true);
        setUsername(res.data.user.email || "");
      }
    });
  }, [router]);

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col">
        <SidebarContent pathname={pathname} username={username} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Top bar (mobile) */}
          <header className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 bg-white">
            <button
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-extrabold tracking-tight">
              Simu<span className="text-amber-500">Para</span>
            </span>
            <div className="w-9" />
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-background p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <GlobalSearch />
        </div>

        <SheetContent side="left" className="w-60 p-0 border-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent pathname={pathname} username={username} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
