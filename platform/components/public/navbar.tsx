"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { Menu, X, LogIn } from "lucide-react";
import { useState } from "react";
import { useLocale } from "next-intl";

export function PublicNavbar() {
  const t = useTranslations("website.nav");
  const [open, setOpen] = useState(false);
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { href: "/", label: t("home") },
    { href: "/services", label: t("services") },
    { href: "/portfolio", label: t("portfolio") },
  ];

  function switchLocale() {
    const next = locale === "fr" ? "en" : "fr";
    router.replace(pathname, { locale: next });
  }

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-extrabold text-xl tracking-tight text-slate-900">
            Simu<span className="text-amber-500">Para</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-0 hover:after:w-full after:bg-amber-500 after:transition-all after:duration-200"
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={switchLocale}
            className="text-xs font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-900 transition-colors border border-slate-200 rounded-full px-3 py-1"
          >
            {locale === "fr" ? "EN" : "FR"}
          </button>
          <Link
            href="/contact"
            className="text-sm font-semibold bg-slate-900 text-white px-5 py-2 rounded-full hover:bg-slate-800 transition-colors"
          >
            {t("contact")}
          </Link>
          <Link
            href="/login"
            className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Login"
          >
            <LogIn className="w-4 h-4" />
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 -mr-2" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t border-slate-100 bg-white px-6 py-6 space-y-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-base font-medium py-3 text-slate-700 hover:text-slate-900 border-b border-slate-50 last:border-0"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-3 pt-4">
            <button
              onClick={switchLocale}
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 border border-slate-200 rounded-full px-3 py-1.5"
            >
              {locale === "fr" ? "English" : "Français"}
            </button>
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold bg-slate-900 text-white px-5 py-2 rounded-full"
            >
              {t("contact")}
            </Link>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Login"
            >
              <LogIn className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
