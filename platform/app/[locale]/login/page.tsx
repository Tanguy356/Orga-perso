"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wind } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: name,
      password,
    });

    if (authError) {
      setError(t("error"));
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect") || "/dashboard";
    router.push(redirect);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-white p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-xl bg-sky-500 flex items-center justify-center mx-auto mb-2">
            <Wind className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-xl">SimuPara</CardTitle>
          <p className="text-sm text-muted-foreground">{t("login")}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">{t("name")}</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-sky-500 hover:bg-sky-600"
            >
              {loading ? t("loggingIn") : t("signIn")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
