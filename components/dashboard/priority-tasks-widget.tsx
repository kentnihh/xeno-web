"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Clock,
  User,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ChevronRight,
  X,
  Search,
} from "lucide-react";
import { formatDate, sortTasksByPriority } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/database";

export interface ConsolidatedTask {
  id: string;
  title: string;
  description?: string | null;
  priority: TaskPriority | string;
  status: TaskStatus | string;
  due_date?: string | null;
  event_id?: string;
  created_at?: string;
  event?: { id?: string; title: string } | null;
  assignee?: { id?: string; full_name: string; role?: string } | null;
  created_by?: string | null;
  creator?: { id?: string; full_name: string; role?: string } | null;
}

export const PRIORITY_BADGE_STYLES: Record<string, string> = {
  urgent: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  high: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  medium: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border-[#007aff]/30",
  low: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
};

export const STATUS_BADGE_STYLES: Record<string, string> = {
  todo: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  in_progress: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  done: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

export const STATUS_LABELS: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Selesai",
};

export function ConsolidatedTasksModal({
  isOpen,
  onClose,
  tasks,
}: {
  isOpen: boolean;
  onClose: () => void;
  tasks: ConsolidatedTask[];
}) {
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const counts = useMemo(() => ({
    urgent: tasks.filter((t) => t.priority === "urgent").length,
    high: tasks.filter((t) => t.priority === "high").length,
    medium: tasks.filter((t) => t.priority === "medium").length,
    low: tasks.filter((t) => t.priority === "low").length,
    total: tasks.length,
  }), [tasks]);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (priorityFilter !== "all") {
      result = result.filter((t) => (t.priority || "").toLowerCase() === priorityFilter);
    }
    if (statusFilter !== "all") {
      result = result.filter((t) => (t.status || "").toLowerCase() === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.event?.title.toLowerCase().includes(q) ||
          t.assignee?.full_name.toLowerCase().includes(q) ||
          t.creator?.full_name?.toLowerCase().includes(q)
      );
    }
    return sortTasksByPriority(result);
  }, [tasks, priorityFilter, statusFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-md">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden text-foreground">
        <div className="p-5 pb-4 border-b border-border flex items-start justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Daftar Tugas Kru Konsolidasi</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#007aff]/15 text-[#007aff] border border-[#007aff]/30">
                {counts.total} Total Tugas
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Konsolidasi tugas kru seluruh portofolio acara Xeno Entertainment
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/30 border-b border-border shrink-0">
          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === "urgent" ? "all" : "urgent")}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              priorityFilter === "urgent"
                ? "bg-rose-500/15 border-rose-500"
                : "bg-card border-border hover:border-rose-500/40"
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400">Urgent</div>
            <div className="text-xl font-extrabold text-foreground">{counts.urgent}</div>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === "high" ? "all" : "high")}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              priorityFilter === "high"
                ? "bg-amber-500/15 border-amber-500"
                : "bg-card border-border hover:border-amber-500/40"
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">High</div>
            <div className="text-xl font-extrabold text-foreground">{counts.high}</div>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === "medium" ? "all" : "medium")}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              priorityFilter === "medium"
                ? "bg-[#007aff]/15 border-[#007aff]"
                : "bg-card border-border hover:border-[#007aff]/40"
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-[#007aff]">Medium</div>
            <div className="text-xl font-extrabold text-foreground">{counts.medium}</div>
          </button>
          <button
            type="button"
            onClick={() => setPriorityFilter(priorityFilter === "low" ? "all" : "low")}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
              priorityFilter === "low"
                ? "bg-slate-500/15 border-slate-500"
                : "bg-card border-border hover:border-slate-500/40"
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-slate-500">Low</div>
            <div className="text-xl font-extrabold text-foreground">{counts.low}</div>
          </button>
        </div>
        {/* Filters and Search Bar */}
        <div className="p-3.5 border-b border-border flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tugas, acara, atau kru..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#007aff]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-muted-foreground text-[11px] font-medium mr-1">Status:</span>
            {(["all", "todo", "in_progress", "done"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer text-[11px] ${
                  statusFilter === s
                    ? "bg-[#007aff] text-white"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "all" ? "Semua" : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Task List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p className="font-semibold text-foreground">Tidak ada tugas ditemukan</p>
              <p>Sesuaikan filter status atau kata kunci pencarian.</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-2xl bg-card border border-border shadow-xs hover:border-[#007aff]/60 transition-all space-y-2 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                        PRIORITY_BADGE_STYLES[(task.priority || "").toLowerCase()] || PRIORITY_BADGE_STYLES.medium
                      }`}
                    >
                      {task.priority || "medium"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        STATUS_BADGE_STYLES[(task.status || "").toLowerCase()] || STATUS_BADGE_STYLES.todo
                      }`}
                    >
                      {STATUS_LABELS[(task.status || "").toLowerCase()] || task.status}
                    </span>
                    <h3 className="text-xs font-bold text-foreground">{task.title}</h3>
                  </div>

                  {task.event && (
                    <Link
                      href={`/events/${task.event.id || task.event_id}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#007aff] hover:underline shrink-0"
                    >
                      <span>Acara: {task.event.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {task.description && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {task.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/60 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-[#007aff]" />
                      <span className="font-medium text-foreground">
                        {task.assignee?.full_name || "Belum Ditugaskan"}
                      </span>
                      {task.assignee?.role && (
                        <span className="text-[10px] uppercase text-muted-foreground">
                          ({task.assignee.role})
                        </span>
                      )}
                    </div>

                    {task.creator?.full_name && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border">
                        <span className="text-muted-foreground/70">Dibuat oleh:</span>
                        <span className="font-semibold text-foreground">{task.creator.full_name}</span>
                      </span>
                    )}
                  </div>

                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>Tenggat: {formatDate(task.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function PriorityTasksWidget({
  tasks,
}: {
  tasks: ConsolidatedTask[];
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const sorted = useMemo(() => sortTasksByPriority(tasks), [tasks]);
  const preview = sorted.slice(0, 4);

  const urgentCount = useMemo(
    () => tasks.filter((t) => t.priority === "urgent" && t.status !== "done").length,
    [tasks]
  );

  return (
    <>
      <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm">Tugas Kru Prioritas</h3>
                  {urgentCount > 0 && (
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                      {urgentCount} Urgent
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Diurutkan berdasarkan tingkat urgensi & tenggat
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs font-semibold text-[#007aff] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Lihat Semua ({tasks.length})
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {preview.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Tidak ada tugas kru aktif saat ini.
            </div>
          ) : (
            <div className="space-y-2">
              {preview.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setModalOpen(true)}
                  className="p-3 rounded-2xl bg-muted/30 border border-border/80 hover:border-[#007aff]/60 hover:bg-muted/60 transition-all cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                          PRIORITY_BADGE_STYLES[(task.priority || "").toLowerCase()] ||
                          PRIORITY_BADGE_STYLES.medium
                        }`}
                      >
                        {task.priority || "medium"}
                      </span>
                      <span className="font-bold text-xs text-foreground truncate">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-medium flex-wrap">
                      {task.event && (
                        <span className="truncate text-foreground/80 font-semibold">
                          {task.event.title}
                        </span>
                      )}
                      {task.assignee?.full_name && (
                        <span className="flex items-center gap-1 truncate">
                          <User className="w-3 h-3 text-[#007aff]" />
                          {task.assignee.full_name}
                        </span>
                      )}
                      {task.creator?.full_name && (
                        <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 truncate">
                          <span>Dibuat:</span>
                          <span className="font-medium text-foreground">{task.creator.full_name}</span>
                        </span>
                      )}
                      {task.due_date && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="mt-4 w-full py-2.5 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          Buka Seluruh Tugas Kru ({tasks.length})
        </button>
      </div>

      <ConsolidatedTasksModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tasks={tasks}
      />
    </>
  );
}
