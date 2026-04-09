import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { Sparkles, Wrench, Users, ArrowRight, Euro, MapPin, Newspaper, Handshake } from "lucide-react";

export default function HomePage() {
  const t = useTranslations("website");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white">
        {/* Decorative orb */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-br from-amber-100 via-orange-50 to-transparent rounded-full blur-3xl opacity-60 -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-slate-100 to-transparent rounded-full blur-3xl opacity-50 translate-y-1/4 -translate-x-1/4 pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-32 md:pb-36">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.05]">
              {t("hero.title1")}
              <br />
              <span className="text-amber-500">{t("hero.title2")}</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-amber-600 transition-colors text-base"
              >
                {t("hero.cta")}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 font-semibold px-8 py-3.5 rounded-full hover:border-slate-300 hover:bg-slate-50 transition-colors text-base"
              >
                {t("hero.services")}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0 md:divide-x md:divide-slate-700">
            {[
              { icon: Euro, title: t("stats.allInclusive"), desc: t("stats.allInclusiveDesc") },
              { icon: MapPin, title: t("stats.coverage"), desc: t("stats.coverageDesc") },
              { icon: Newspaper, title: t("stats.experience"), desc: t("stats.experienceDesc") },
            ].map((stat) => (
              <div key={stat.title} className="flex items-center gap-4 md:justify-center md:px-8">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{stat.title}</div>
                  <div className="text-sm text-slate-400">{stat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-28 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-16">
            {t("benefits.title")}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, color: "amber", title: t("benefits.corporate"), desc: t("benefits.corporateDesc") },
              { icon: Wrench, color: "slate", title: t("benefits.service"), desc: t("benefits.serviceDesc") },
              { icon: Users, color: "amber", title: t("benefits.teambuilding"), desc: t("benefits.teambuildingDesc") },
            ].map((card) => (
              <div
                key={card.title}
                className="group bg-white rounded-2xl p-8 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${
                  card.color === "amber" ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
                }`}>
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-slate-900 mb-3">{card.title}</h3>
                <p className="text-slate-500 leading-relaxed text-[15px]">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collaboration */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start gap-6 md:gap-12 bg-slate-50 rounded-2xl p-8 md:p-12 border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Handshake className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 mb-2">
                {t("collab.label")}
              </p>
              <a
                href="https://www.agence-numero6.fr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl md:text-2xl font-extrabold text-slate-900 hover:text-amber-600 transition-colors"
              >
                Agence Numero6
              </a>
              <p className="mt-3 text-slate-500 leading-relaxed max-w-2xl">
                {t("collab.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-24">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-4">
              {t("cta.title")}
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              {t("cta.subtitle")}
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-amber-500 text-white font-semibold px-8 py-3.5 rounded-full hover:bg-amber-600 transition-colors text-base"
            >
              {t("cta.button")}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
