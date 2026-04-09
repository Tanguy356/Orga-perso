import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import {
  Check,
  Building2,
  PartyPopper,
  Presentation,
  Users,
  ArrowRight,
  Wind,
  Wrench,
  UserCheck,
  Truck,
  Video,
  Palette,
  CalendarDays,
  MapPin,
} from "lucide-react";

export default function ServicesPage() {
  const t = useTranslations("website.services");

  const included = [
    { key: "simulator", icon: Wind },
    { key: "installation", icon: Wrench },
    { key: "animator", icon: UserCheck },
    { key: "assembly", icon: Truck },
  ] as const;

  const extras = [
    { key: "video", icon: Video },
    { key: "device", icon: Palette },
    { key: "multiDay", icon: CalendarDays },
    { key: "transport", icon: MapPin },
  ] as const;

  const useCases = [
    { key: "corporate", icon: Building2, color: "bg-amber-50 text-amber-600" },
    { key: "municipality", icon: PartyPopper, color: "bg-slate-100 text-slate-600" },
    { key: "tradeshow", icon: Presentation, color: "bg-amber-50 text-amber-600" },
    { key: "teambuilding", icon: Users, color: "bg-slate-100 text-slate-600" },
  ] as const;

  return (
    <>
      {/* Header */}
      <section className="bg-white pt-16 pb-12 md:pt-24 md:pb-16">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
            {t("title")}
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-2xl">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* The experience */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-4">
            {t("experience")}
          </h2>
          <p className="text-slate-600 leading-relaxed max-w-3xl text-lg">
            {t("experienceDesc")}
          </p>
        </div>
      </section>

      {/* Included services */}
      <section className="py-16 md:py-20 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-8">
            {t("included")}
          </h2>
          <div className="grid md:grid-cols-2 gap-5">
            {included.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-6 border border-slate-100 flex gap-5"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-slate-900">{t(`items.${key}`)}</h3>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {t(`items.${key}Desc`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-8">
            {t("extras")}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {extras.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="rounded-2xl border-2 border-dashed border-slate-200 p-5 hover:border-amber-300 transition-colors"
              >
                <Icon className="w-5 h-5 text-slate-400 mb-3" />
                <h3 className="font-bold text-sm text-slate-900 mb-1">{t(`extraItems.${key}`)}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t(`extraItems.${key}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 md:py-20 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-8">
            {t("useCases")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {useCases.map(({ key, icon: Icon, color }) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-6 border border-slate-100 flex gap-5 items-start"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{t(`cases.${key}`)}</h3>
                  <p className="text-sm text-slate-500">{t(`cases.${key}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical specs */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-8">
            {t("specs")}
          </h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { value: "5.5m", label: "Hauteur / Height" },
              { value: "3.5m", label: "Largeur / Width" },
              { value: "4.0m", label: "Profondeur / Depth" },
            ].map((spec) => (
              <div key={spec.label} className="text-center">
                <div className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-2">
                  {spec.value}
                </div>
                <div className="text-sm text-slate-400">{spec.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-6">{t("cta")}</h2>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-amber-500 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-amber-600 transition-colors"
          >
            {t("cta")}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
