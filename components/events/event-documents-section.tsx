"use client";

import { useState, useRef, useTransition } from "react";
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileArchive,
  File,
  Download,
  Trash2,
  Loader2,
  LayoutGrid,
  List,
  Search,
  AlertTriangle,
  FolderOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  createEventDocumentMetadata,
  deleteEventDocument,
  getDocumentSignedUrl,
} from "@/app/(dashboard)/events/document-actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { formatFileSize, formatDate } from "@/lib/utils";
import type { EventDocument } from "@/types/database";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function getFileTypeCategory(fileName: string, mimeType: string): "pdf" | "image" | "spreadsheet" | "document" | "archive" | "other" {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf" || mimeType.includes("pdf")) return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext) || mimeType.startsWith("image/")) return "image";
  if (["xls", "xlsx", "csv"].includes(ext) || mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "spreadsheet";
  if (["doc", "docx", "txt", "rtf", "odt"].includes(ext) || mimeType.includes("word") || mimeType.includes("document")) return "document";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext) || mimeType.includes("zip") || mimeType.includes("archive")) return "archive";
  return "other";
}

function getFileIcon(category: string) {
  switch (category) {
    case "pdf":
      return <FileText className="w-5 h-5 text-rose-500" />;
    case "image":
      return <ImageIcon className="w-5 h-5 text-purple-500" />;
    case "spreadsheet":
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    case "document":
      return <FileText className="w-5 h-5 text-[#007aff]" />;
    case "archive":
      return <FileArchive className="w-5 h-5 text-amber-500" />;
    default:
      return <File className="w-5 h-5 text-muted-foreground" />;
  }
}

function getFileBadgeColor(category: string) {
  switch (category) {
    case "pdf":
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20";
    case "image":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "spreadsheet":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "document":
      return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "archive":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function EventDocumentsSection({
  eventId,
  initialDocuments,
  canManage = true,
}: {
  eventId: string;
  initialDocuments: EventDocument[];
  canManage?: boolean;
}) {
  const [documents, setDocuments] = useState<EventDocument[]>(initialDocuments);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "pdf" | "image" | "document" | "other">("all");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<EventDocument | null>(null);
  const [, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);

    const fileList = Array.from(files);
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > MAX_FILE_SIZE) {
        setErrorMsg(`Berkas "${file.name}" melebihi batas maksimal 50MB.`);
        continue;
      }

      setUploadStatus(`Mengunggah "${file.name}" (${i + 1}/${fileList.length})...`);

      try {
        const supabase = createClient();
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `${eventId}/${Date.now()}_${cleanName}`;

        const { error: storageError } = await supabase.storage
          .from("bucket-files")
          .upload(storagePath, file, { cacheControl: "3600", upsert: false });

        if (storageError) {
          throw new Error(storageError.message || "Gagal mengunggah berkas ke storage.");
        }

        const res = await createEventDocumentMetadata({
          event_id: eventId,
          file_name: file.name,
          file_url: storagePath,
          file_type: file.type || "application/octet-stream",
          file_size: file.size,
        });

        if (!res.success || !res.data) {
          throw new Error(res.error || "Gagal menyimpan metadata berkas.");
        }

        const newDocument = res.data;
        setDocuments((prev) => [newDocument, ...prev]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Gagal mengunggah berkas";
        setErrorMsg(`Gagal mengunggah ${file.name}: ${message}`);
        break;
      }
    }

    setUploadStatus(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDownload = async (doc: EventDocument) => {
    setDownloadingId(doc.id);
    setErrorMsg(null);
    try {
      const res = await getDocumentSignedUrl(doc.file_url, 3600);
      if (res.success && res.url) {
        window.open(res.url, "_blank");
      } else {
        setErrorMsg(res.error || "Gagal mendapatkan tautan berkas.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat mengunduh berkas.");
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDoc) return;
    const target = deleteDoc;
    setDeleteDoc(null);

    setDocuments((prev) => prev.filter((d) => d.id !== target.id));

    startTransition(async () => {
      const res = await deleteEventDocument(target.id, eventId, target.file_url);
      if (!res.success) {
        setDocuments((prev) => [target, ...prev]);
        setErrorMsg(res.error || "Gagal menghapus berkas.");
      }
    });
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.file_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeFilter === "all") return true;
    const cat = getFileTypeCategory(doc.file_name, doc.file_type);
    if (activeFilter === "pdf") return cat === "pdf";
    if (activeFilter === "image") return cat === "image";
    if (activeFilter === "document") return cat === "document" || cat === "spreadsheet";
    if (activeFilter === "other") return cat === "archive" || cat === "other";
    return true;
  });

  const totalBytes = documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0);

  return (
    <div className="space-y-6">
      {canManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) handleUploadFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`apple-card p-6 md:p-8 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center group ${
            isDragging
              ? "border-[#007aff] bg-[#007aff]/10 scale-[1.01]"
              : "border-border hover:border-[#007aff]/60 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleUploadFiles(e.target.files);
            }}
          />

          <div className="w-12 h-12 rounded-2xl bg-[#007aff]/10 group-hover:bg-[#007aff]/20 text-[#007aff] flex items-center justify-center mb-3 transition-colors">
            {uploadStatus ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 group-hover:scale-110 transition-transform" />
            )}
          </div>

          <div className="text-sm font-bold text-foreground">
            {uploadStatus || "Tarik & lepas berkas ke sini, atau klik untuk memilih"}
          </div>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Mendukung PDF rundown, gambar/layout, dokumen spreadsheet, dan arsip (Maks. 50MB).
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#007aff]" />
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">
                Berkas Acara
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] bg-muted text-muted-foreground font-semibold">
                {documents.length} berkas • {formatFileSize(totalBytes)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Semua dokumen tersimpan aman di Supabase Storage.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Tampilan Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === "list"
                  ? "bg-card text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Tampilan Tabel"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
            {[
              { id: "all", label: "Semua" },
              { id: "pdf", label: "PDF" },
              { id: "image", label: "Gambar" },
              { id: "document", label: "Dokumen" },
              { id: "other", label: "Lainnya" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as typeof activeFilter)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeFilter === f.id
                    ? "bg-[#007aff] text-white shadow-xs font-semibold"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px] sm:max-w-xs">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama berkas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="apple-input pl-8.5 pr-3 py-1.5 text-xs w-full"
            />
          </div>
        </div>
      </div>

      {filteredDocuments.length === 0 && (
        <div className="apple-card p-12 rounded-3xl text-center flex flex-col items-center justify-center border border-border">
          <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-foreground">Belum ada berkas</div>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            {searchQuery
              ? "Tidak ada berkas yang sesuai dengan kata kunci pencarian."
              : "Unggah rundown acara, denah tata panggung, atau berkas izin di atas."}
          </p>
        </div>
      )}

      {viewMode === "grid" && filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const cat = getFileTypeCategory(doc.file_name, doc.file_type);
            const isDownloading = downloadingId === doc.id;

            return (
              <div
                key={doc.id}
                className="apple-card p-4 rounded-2xl border border-border flex flex-col justify-between hover:border-[#007aff]/40 transition-all group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-muted/70 flex items-center justify-center shrink-0">
                      {getFileIcon(cat)}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getFileBadgeColor(
                        cat
                      )}`}
                    >
                      {cat}
                    </span>
                  </div>

                  <div
                    className="text-xs font-bold text-foreground truncate group-hover:text-[#007aff] transition-colors"
                    title={doc.file_name}
                  >
                    {doc.file_name}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1.5 font-medium">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span>•</span>
                    <span>{formatDate(doc.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 mt-3 border-t border-border/60">
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {doc.uploader?.full_name || "Staf Xeno"}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDownload(doc)}
                      disabled={isDownloading}
                      className="p-1.5 rounded-xl bg-muted hover:bg-[#007aff] text-muted-foreground hover:text-white transition-all cursor-pointer"
                      title="Unduh / Buka Berkas"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setDeleteDoc(doc)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white transition-all cursor-pointer"
                        title="Hapus Berkas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "list" && filteredDocuments.length > 0 && (
        <div className="apple-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Berkas</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Ukuran</th>
                  <th className="py-3 px-4">Tanggal Unggah</th>
                  <th className="py-3 px-4">Pengunggah</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium text-foreground">
                {filteredDocuments.map((doc) => {
                  const cat = getFileTypeCategory(doc.file_name, doc.file_type);
                  const isDownloading = downloadingId === doc.id;

                  return (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 max-w-xs">
                          <div className="w-7 h-7 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
                            {getFileIcon(cat)}
                          </div>
                          <span className="truncate font-semibold" title={doc.file_name}>
                            {doc.file_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${getFileBadgeColor(
                            cat
                          )}`}
                        >
                          {cat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{formatFileSize(doc.file_size)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(doc.created_at)}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {doc.uploader?.full_name || "Staf Xeno"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            disabled={isDownloading}
                            className="p-1.5 rounded-lg bg-muted hover:bg-[#007aff] text-muted-foreground hover:text-white transition-all cursor-pointer"
                            title="Unduh / Buka Berkas"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => setDeleteDoc(doc)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-600 dark:text-rose-400 hover:text-white transition-all cursor-pointer"
                              title="Hapus Berkas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteDoc}
        title="Konfirmasi Hapus Berkas"
        itemName={deleteDoc?.file_name}
        message={deleteDoc ? `Berkas "${deleteDoc.file_name}" akan dihapus permanen dari Supabase Storage. Tindakan ini tidak dapat dibatalkan.` : undefined}
        confirmLabel="Hapus Berkas"
        onConfirm={confirmDelete}
        onClose={() => setDeleteDoc(null)}
      />
    </div>
  );
}

