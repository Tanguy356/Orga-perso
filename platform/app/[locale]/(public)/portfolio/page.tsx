"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Calendar, Quote, ExternalLink, Newspaper } from "lucide-react";

interface PortfolioEvent {
  id: string;
  title: string;
  event_date: string;
  location_city: string;
  testimonial: string | null;
  testimonial_author: string | null;
}

const PRESS_ARTICLES = [
  {
    title: "Les Echos",
    description: "6 innovations not to miss at VivaTech",
    url: "https://www.lesechos.fr/tech-medias/hightech/6-innovations-a-ne-pas-manquer-au-salon-vivatech-1953006",
  },
  {
    title: "La Provence",
    description: "3 innovations not to miss at VivaTech",
    url: "https://www.laprovence.com/article/economie/70737536648005/les-trois-innovations-quil-ne-fallait-surtout-pas-louper-a-vivatech",
  },
  {
    title: "Radio Nova",
    description: "Ultra-augmented reality paragliding",
    url: "https://www.nova.fr/news/faire-du-parapente-en-realite-ultra-augmentee-pour-voyager-tout-en-restant-chez-soi-236468-19-06-2023/",
  },
  {
    title: "BPI France",
    description: "3 innovations not to miss at VivaTech",
    url: "https://partenaire-bpi.sudouest.fr/les-trois-innovations-quil-ne-fallait-surtout-pas-louper-a-vivatech/",
  },
  {
    title: "Simulateur VR",
    description: "Paragliding simulator review",
    url: "https://simulateur-vr.com/simulateur-de-parapente/",
  },
];

export default function PortfolioPage() {
  const t = useTranslations("website.portfolio");
  const [events, setEvents] = useState<PortfolioEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("events")
        .select("id, title, event_date, location_city, testimonial, testimonial_author")
        .eq("is_portfolio_visible", true)
        .order("event_date", { ascending: false });
      if (data) setEvents(data as PortfolioEvent[]);
      setLoading(false);
    }
    load();
  }, []);

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

      {/* Press Section */}
      <section className="pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center gap-2 mb-8">
            <Newspaper className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600">
              {t("pressTitle")}
            </h2>
            <span className="text-sm text-slate-400 ml-2">— {t("pressSubtitle")}</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESS_ARTICLES.map((article) => (
              <a
                key={article.url}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 hover:border-amber-200 hover:shadow-md transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-white leading-none">
                    {article.title.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
                      {article.title}
                    </h3>
                    <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {article.description}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="pb-20 md:pb-28 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-6 pt-16 md:pt-20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-600 mb-8">
            {t("eventsTitle")}
          </h2>

          {loading ? (
            <div className="text-center py-16 text-slate-400">...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border border-slate-100">
              {t("eventsEmpty")}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="group rounded-2xl border border-slate-100 bg-white overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                    <span className="text-slate-300 text-sm">Photo</span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 mb-2">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      {event.location_city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {event.location_city}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(event.event_date).getFullYear()}
                      </span>
                    </div>
                    {event.testimonial && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex gap-2">
                          <Quote className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-slate-500 italic leading-relaxed">
                              {event.testimonial}
                            </p>
                            {event.testimonial_author && (
                              <p className="text-xs font-medium text-slate-700 mt-1">
                                — {event.testimonial_author}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
