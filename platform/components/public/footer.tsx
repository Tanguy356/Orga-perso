import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";

export function PublicFooter() {
  const t = useTranslations("website");

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/services", label: t("nav.services") },
    { href: "/portfolio", label: t("nav.portfolio") },
    { href: "/contact", label: t("nav.contact") },
  ];

  return (
    <footer className="bg-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <span className="font-extrabold text-xl tracking-tight">
              Simu<span className="text-amber-500">Para</span>
            </span>
            <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              {t("footer.navigation")}
            </h4>
            <nav className="space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
              {t("footer.contact")}
            </h4>
            <div className="space-y-3 text-sm text-slate-400">
              <p>contact@simupara.fr</p>
              <p>France</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} SimuPara
          </p>
          <p className="text-xs text-slate-500">
            {t("footer.legal")}
          </p>
        </div>
      </div>
    </footer>
  );
}
