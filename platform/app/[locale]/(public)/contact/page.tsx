"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, MapPin, CheckCircle, ArrowRight } from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("website.contact");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: formData.get("name"),
          company: formData.get("company"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          event_date: formData.get("eventDate"),
          event_type: formData.get("eventType"),
          message: formData.get("message"),
        }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // Handle error silently — form stays visible
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{t("form.success")}</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col md:flex-row">
      {/* Left panel — dark */}
      <div className="bg-slate-900 text-white px-8 py-16 md:px-12 md:py-24 md:w-2/5 flex flex-col justify-center relative overflow-hidden">
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

        <div className="relative">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            {t("title")}
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-6">
            {t("subtitle")}
          </p>
          <div className="bg-white/5 rounded-xl p-4 mb-12 border border-white/10">
            <p className="text-sm text-slate-300 leading-relaxed">
              {t("hint")}
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-0.5">{t("info.email")}</p>
                <p className="font-medium">contact@simupara.fr</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400 mb-0.5">{t("info.location")}</p>
                <p className="font-medium">{t("info.locationValue")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 px-8 py-16 md:px-16 md:py-24 flex items-center">
        <form onSubmit={handleSubmit} className="w-full max-w-lg mx-auto space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-slate-700 text-sm font-medium">{t("form.name")}</Label>
              <Input id="name" name="name" required className="mt-1.5 border-slate-200 focus-visible:ring-amber-500" />
            </div>
            <div>
              <Label htmlFor="company" className="text-slate-700 text-sm font-medium">{t("form.company")}</Label>
              <Input id="company" name="company" className="mt-1.5 border-slate-200 focus-visible:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email" className="text-slate-700 text-sm font-medium">{t("form.email")}</Label>
              <Input id="email" name="email" type="email" required className="mt-1.5 border-slate-200 focus-visible:ring-amber-500" />
            </div>
            <div>
              <Label htmlFor="phone" className="text-slate-700 text-sm font-medium">{t("form.phone")}</Label>
              <Input id="phone" name="phone" className="mt-1.5 border-slate-200 focus-visible:ring-amber-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="eventDate" className="text-slate-700 text-sm font-medium">{t("form.eventDate")}</Label>
              <Input id="eventDate" name="eventDate" type="date" className="mt-1.5 border-slate-200 focus-visible:ring-amber-500" />
            </div>
            <div>
              <Label htmlFor="eventType" className="text-slate-700 text-sm font-medium">{t("form.eventType")}</Label>
              <Input id="eventType" name="eventType" className="mt-1.5 border-slate-200 focus-visible:ring-amber-500" />
            </div>
          </div>
          <div>
            <Label htmlFor="message" className="text-slate-700 text-sm font-medium">{t("form.message")}</Label>
            <Textarea id="message" name="message" rows={4} className="mt-1.5 border-slate-200 focus-visible:ring-amber-500" />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold px-6 py-3.5 rounded-full hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {loading ? t("form.sending") : t("form.submit")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
