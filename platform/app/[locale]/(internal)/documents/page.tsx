"use client";

import { useEffect, useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import {
  Plus,
  Search,
  FileText,
  ExternalLink,
  Loader2,
  Upload,
  File,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type {
  Document as Doc,
  DocumentCategory,
  DocumentType,
  Event,
} from "@/lib/supabase/types";

const CATEGORIES: DocumentCategory[] = [
  "strategy",
  "product",
  "operations",
  "marketing",
  "finance",
  "legal",
  "other",
];

const DOC_TYPES: DocumentType[] = [
  "contract",
  "tech_spec",
  "presentation",
  "template",
  "legal",
  "photo",
  "other",
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function getCategoryColor(category: DocumentCategory): string {
  const colors: Record<DocumentCategory, string> = {
    strategy: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    product: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    operations: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    marketing: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    finance: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    legal: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  };
  return colors[category] || colors.other;
}

export default function DocumentsPage() {
  const t = useTranslations("documents");
  const tc = useTranslations("common");

  const [documents, setDocuments] = useState<Doc[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState<DocumentCategory>("other");
  const [formDocType, setFormDocType] = useState<DocumentType>("other");
  const [formFileUrl, setFormFileUrl] = useState("");
  const [formEventId, setFormEventId] = useState<string>("");
  const [formFile, setFormFile] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const supabase = createClient();

    const [docsRes, eventsRes] = await Promise.all([
      supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: false }),
    ]);

    if (docsRes.data) setDocuments(docsRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
    setLoading(false);
  }

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    let docs = documents;

    // Filter by category
    if (activeCategory !== "all") {
      docs = docs.filter((d) => d.category === activeCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter((d) => d.name.toLowerCase().includes(q));
    }

    return docs;
  }, [documents, activeCategory, searchQuery]);

  function resetForm() {
    setFormName("");
    setFormCategory("other");
    setFormDocType("other");
    setFormFileUrl("");
    setFormEventId("");
    setFormFile(null);
  }

  async function handleUpload() {
    if (!formName) return;
    setSaving(true);

    const supabase = createClient();
    let fileUrl = formFileUrl;
    let fileSize = 0;

    // If a file was selected, upload to Supabase Storage
    if (formFile) {
      const fileExt = formFile.name.split(".").pop();
      const filePath = `documents/${Date.now()}-${formFile.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, formFile);

      if (uploadError) {
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("documents").getPublicUrl(uploadData.path);

      fileUrl = publicUrl;
      fileSize = formFile.size;
    }

    // If just a URL was pasted (Google Drive etc.)
    if (!fileUrl) {
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("documents").insert({
      name: formName,
      category: formCategory,
      doc_type: formDocType,
      file_url: fileUrl,
      file_size: fileSize,
      event_id: formEventId || null,
      uploaded_by: "tanguy",
    });

    if (!error) {
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  }

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
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <Upload className="w-4 h-4" />
                {t("upload")}
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("upload")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="doc-name">{tc("name")}</Label>
                <Input
                  id="doc-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={tc("name")}
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label>{tc("category")}</Label>
                <Select
                  value={formCategory}
                  onValueChange={(v) => setFormCategory(v as DocumentCategory)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {t(`category.${cat}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Document Type */}
              <div className="space-y-1.5">
                <Label>{tc("type")}</Label>
                <Select
                  value={formDocType}
                  onValueChange={(v) => setFormDocType(v as DocumentType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((dtype) => (
                      <SelectItem key={dtype} value={dtype}>
                        {t(`type.${dtype}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* File Upload */}
              <div className="space-y-1.5">
                <Label htmlFor="doc-file">File</Label>
                <Input
                  id="doc-file"
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setFormFile(file);
                    if (file) setFormFileUrl("");
                  }}
                />
              </div>

              {/* Or URL */}
              <div className="space-y-1.5">
                <Label htmlFor="doc-url">URL (Google Drive, etc.)</Label>
                <Input
                  id="doc-url"
                  type="url"
                  value={formFileUrl}
                  onChange={(e) => {
                    setFormFileUrl(e.target.value);
                    if (e.target.value) setFormFile(null);
                  }}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              {/* Event (optional) */}
              <div className="space-y-1.5">
                <Label>Event</Label>
                <Select value={formEventId} onValueChange={(v) => setFormEventId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="-" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {tc("cancel")}
              </DialogClose>
              <Button
                onClick={handleUpload}
                disabled={saving || !formName || (!formFileUrl && !formFile)}
              >
                {saving ? tc("loading") : tc("create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tc("search")}
          className="pl-8"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {t(`category.${cat}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Document Grid */}
        <TabsContent value={activeCategory} className="mt-4">
          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="w-10 h-10 mb-2" />
              <p>{tc("noResults")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDocuments.map((doc) => {
                const cardContent = (
                  <Card className={`h-full transition-shadow ${doc.file_url ? "hover:ring-2 hover:ring-amber-200" : "opacity-80"}`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${doc.file_url ? "bg-amber-50" : "bg-slate-100"}`}>
                          <File className={`w-5 h-5 ${doc.file_url ? "text-amber-600" : "text-slate-400"}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium text-sm truncate transition-colors ${doc.file_url ? "group-hover:text-amber-600" : "text-slate-600"}`}>
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {format(new Date(doc.created_at), "dd/MM/yyyy")}
                            {doc.file_size > 0 && (
                              <span> - {formatFileSize(doc.file_size)}</span>
                            )}
                            {!doc.file_url && (
                              <span className="ml-1 text-amber-500">— no file attached</span>
                            )}
                          </p>
                        </div>
                        {doc.file_url && (
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center h-5 px-2 rounded-full text-xs font-medium ${getCategoryColor(doc.category)}`}>
                          {t(`category.${doc.category}`)}
                        </span>
                        <Badge variant="outline">{t(`type.${doc.doc_type}`)}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
                return doc.file_url ? (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="block group">
                    {cardContent}
                  </a>
                ) : (
                  <div key={doc.id} className="block cursor-default">
                    {cardContent}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
