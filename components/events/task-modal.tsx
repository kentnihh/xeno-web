"use client";

import { useState } from "react";
import { ModalShell } from "@/components/users/modal-shell";
import { Loader2, CheckSquare } from "lucide-react";
import type { EventTask, Profile, TaskPriority, TaskStatus } from "@/types/database";

export function TaskModal({
  isOpen,
  onClose,
  eventId,
  task,
  crewProfiles,
  onSubmit,
  isPending,
}: {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  task?: EventTask | null;
  crewProfiles: Profile[];
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}) {
  const isEditing = !!task;
  const initialDueDate = task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "";

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "todo");
  const [dueDate, setDueDate] = useState(initialDueDate);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const fd = new FormData();
    fd.append("event_id", eventId);
    if (task?.id) fd.append("task_id", task.id);
    fd.append("title", title.trim());
    if (description.trim()) fd.append("description", description.trim());
    if (assignedTo) fd.append("assigned_to", assignedTo);
    fd.append("priority", priority);
    fd.append("status", status);
    if (dueDate) fd.append("due_date", dueDate);

    onSubmit(fd);
  };

  return (
    <ModalShell
      title={isEditing ? "Edit Tugas Kru" : "Tambah Tugas Kru"}
      subtitle="Tugas operasional acara"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Judul Tugas *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Cek Rigging, Rundown MC..."
            className="apple-input w-full px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Assignee</label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer"
          >
            <option value="" className="bg-card text-foreground">-- Belum Ditugaskan --</option>
            {crewProfiles.map((p) => (
              <option key={p.id} value={p.id} className="bg-card text-foreground">
                {p.full_name} ({p.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Prioritas</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer"
            >
              <option value="low" className="bg-card text-foreground">Low</option>
              <option value="medium" className="bg-card text-foreground">Medium</option>
              <option value="high" className="bg-card text-foreground">High</option>
              <option value="urgent" className="bg-card text-foreground">Urgent</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="apple-input w-full px-3.5 py-2 text-sm bg-muted text-foreground border-border cursor-pointer"
            >
              <option value="todo" className="bg-card text-foreground">To Do</option>
              <option value="in_progress" className="bg-card text-foreground">In Progress</option>
              <option value="done" className="bg-card text-foreground">Done</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Due Date</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="apple-input w-full px-3.5 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-foreground block mb-1.5">Deskripsi</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Instruksi tambahan..."
            className="apple-input w-full px-3.5 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary px-4 py-2 text-xs"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="apple-btn-primary px-4 py-2 text-xs gap-1.5 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
            <span>{isEditing ? "Simpan Perubahan" : "Tambah Tugas"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
