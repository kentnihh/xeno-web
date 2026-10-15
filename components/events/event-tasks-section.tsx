"use client";

import { useState, useTransition } from "react";
import {
  Layers,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  User,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  createEventTask,
  updateEventTask,
  deleteEventTask,
  toggleTaskStatus,
} from "@/app/(dashboard)/events/actions";
import { TaskModal } from "./task-modal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { EventTask, Profile, TaskPriority, TaskStatus } from "@/types/database";

const PRIORITY_BADGES: Record<TaskPriority, { label: string; cls: string }> = {
  low: { label: "Low", cls: "bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-300 border border-neutral-300 dark:border-white/10 font-bold" },
  medium: { label: "Medium", cls: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30 font-bold" },
  high: { label: "High", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold" },
  urgent: { label: "Urgent", cls: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold" },
};

const STATUS_BADGES: Record<TaskStatus, { label: string; cls: string }> = {
  todo: { label: "To Do", cls: "bg-neutral-100 text-neutral-700 dark:bg-white/[0.08] dark:text-neutral-300 border border-neutral-300 dark:border-white/10 font-bold" },
  in_progress: { label: "In Progress", cls: "bg-[#007aff]/15 text-[#007aff] dark:text-[#3894ff] border border-[#007aff]/30 font-bold" },
  done: { label: "Done", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold" },
};

export function EventTasksSection({
  eventId,
  initialTasks,
  crewProfiles,
  canManage = true,
}: {
  eventId: string;
  initialTasks: EventTask[];
  crewProfiles: Profile[];
  canManage?: boolean;
}) {
  const [tasks, setTasks] = useState<EventTask[]>(initialTasks);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<EventTask | null>(null);
  const [deletingTask, setDeletingTask] = useState<EventTask | null>(null);
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [quickTitle, setQuickTitle] = useState("");

  const filteredTasks = tasks.filter((t) => (filter === "all" ? true : t.status === filter));

  const handleToggle = (task: EventTask) => {
    setErrorMsg(null);
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));

    startTransition(async () => {
      const res = await toggleTaskStatus(task.id, task.status, eventId);
      if (!res.success) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
        setErrorMsg(res.error || "Gagal mengubah status tugas.");
      }
    });
  };

  const confirmDelete = async () => {
    if (!deletingTask) return;
    const target = deletingTask;
    setTasks((prev) => prev.filter((t) => t.id !== target.id));

    const res = await deleteEventTask(target.id, eventId);
    if (!res.success) {
      setTasks((prev) => [...prev, target]);
      throw new Error(res.error || "Gagal menghapus tugas.");
    }
  };

  const handleModalSubmit = (fd: FormData) => {
    setErrorMsg(null);
    startTransition(async () => {
      if (editingTask) {
        const res = await updateEventTask(fd);
        if (res.success && res.task) {
          setTasks((prev) => prev.map((t) => (t.id === res.task!.id ? res.task! : t)));
          setIsModalOpen(false);
          setEditingTask(null);
        } else {
          setErrorMsg(res.error || "Gagal memperbarui tugas.");
        }
      } else {
        const res = await createEventTask(fd);
        if (res.success && res.task) {
          setTasks((prev) => [...prev, res.task!]);
          setIsModalOpen(false);
        } else {
          setErrorMsg(res.error || "Gagal membuat tugas.");
        }
      }
    });
  };


  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const fd = new FormData();
    fd.append("event_id", eventId);
    fd.append("title", quickTitle.trim());
    fd.append("priority", "medium");
    fd.append("status", "todo");
    setQuickTitle("");

    startTransition(async () => {
      const res = await createEventTask(fd);
      if (res.success && res.task) {
        setTasks((prev) => [...prev, res.task!]);
      } else {
        setErrorMsg(res.error || "Gagal menambah tugas.");
      }
    });
  };

  return (
    <div className="apple-card p-6 space-y-4 border border-border shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#007aff]" />
          <h2 className="text-sm font-bold text-foreground">Tugas Kru Operasional</h2>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="apple-btn-primary px-3.5 py-1.5 text-xs font-semibold gap-1.5 shadow-md shadow-[#007aff]/30"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Tambah Tugas</span>
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border overflow-x-auto text-xs">
        {(["all", "todo", "in_progress", "done"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === tab
                ? "bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "all" ? "Semua" : STATUS_BADGES[tab].label}
          </button>
        ))}
      </div>

      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/70 rounded-xl font-medium">
            Tidak ada tugas operasional dalam kategori ini.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const assigneeName = task.assignee?.full_name;
            const priorityBadge = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES.medium;
            const statusBadge = STATUS_BADGES[task.status] || STATUS_BADGES.todo;

            return (
              <div
                key={task.id}
                className="p-3.5 rounded-xl bg-card border border-border hover:border-[#007aff] transition-colors space-y-2 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => handleToggle(task)}
                        className="mt-0.5 text-muted-foreground/50 hover:text-emerald-500 cursor-pointer transition-colors"
                      >
                        {task.status === "done" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/40 hover:text-foreground" />
                        )}
                      </button>
                    ) : (
                      <div className="mt-0.5 text-muted-foreground/50">
                        {task.status === "done" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground/40" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold leading-snug break-words ${task.status === "done" ? "line-through text-muted-foreground/50" : "text-foreground"}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-line line-clamp-2 font-medium">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTask(task);
                          setIsModalOpen(true);
                        }}
                        className="p-1 rounded-lg text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        title="Edit Tugas"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingTask(task)}
                        className="p-1 rounded-lg text-muted-foreground/70 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-[10px]">
                  <span className={`px-2 py-0.5 rounded-full font-bold uppercase border ${priorityBadge.cls}`}>
                    {priorityBadge.label}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusBadge.cls}`}>
                    {statusBadge.label}
                  </span>

                  {assigneeName ? (
                    <span className="flex items-center gap-1 text-[#007aff] font-bold bg-[#007aff]/10 px-2 py-0.5 rounded-full border border-[#007aff]/20">
                      <User className="w-3 h-3 text-[#007aff]" />
                      {assigneeName}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-neutral-500 font-medium">Unassigned</span>
                  )}

                  {task.due_date && (
                    <span className="flex items-center gap-1 text-neutral-500 dark:text-neutral-400 ml-auto font-medium">
                      <Calendar className="w-3 h-3 text-[#007aff]" />
                      {new Date(task.due_date).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {canManage && (
        <form onSubmit={handleQuickAdd} className="flex gap-2 pt-2 border-t border-neutral-200 dark:border-white/[0.08]">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Tambah tugas cepat (Enter)..."
            className="apple-input flex-1 px-3.5 py-2 text-xs"
          />
          <button
            type="submit"
            disabled={!quickTitle.trim() || isPending}
            className="apple-btn-primary px-3 py-2 text-xs disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      )}

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        eventId={eventId}
        task={editingTask}
        crewProfiles={crewProfiles}
        onSubmit={handleModalSubmit}
        isPending={isPending}
      />

      <ConfirmModal
        isOpen={!!deletingTask}
        title="Konfirmasi Hapus Tugas"
        itemName={deletingTask?.title}
        onConfirm={confirmDelete}
        onClose={() => setDeletingTask(null)}
      />
    </div>
  );
}
