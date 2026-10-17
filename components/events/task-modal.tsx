"use client";

import { useState, useEffect, useMemo } from "react";
import { ModalShell } from "@/components/users/modal-shell";
import { Combobox } from "@/components/ui/combobox";
import { Loader2, CheckSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { EventCrew, EventTask, Profile, TaskPriority, TaskStatus } from "@/types/database";

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  task?: EventTask | null;
  assignedCrew?: EventCrew[];
  crewProfiles?: Profile[];
  onSubmit: (formData: FormData) => void;
  isPending: boolean;
}

export function TaskModal({
  isOpen,
  onClose,
  eventId,
  task,
  assignedCrew,
  crewProfiles,
  onSubmit,
  isPending,
}: TaskModalProps) {
  const isEditing = !!task;
  const initialDueDate = task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "";

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "todo");
  const [dueDate, setDueDate] = useState(initialDueDate);

  // Fallback client-side fetch from event_crew if assignedCrew prop was not supplied and no crewProfiles
  const [fetchedCrew, setFetchedCrew] = useState<EventCrew[] | null>(null);

  useEffect(() => {
    // If assignedCrew is explicitly provided or crewProfiles passed or modal closed, do not fetch
    if (assignedCrew !== undefined || (crewProfiles && crewProfiles.length > 0) || !isOpen || !eventId) {
      return;
    }

    let isSubscribed = true;
    async function loadAssignedCrew() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("event_crew")
          .select("*, profile:profiles(*)")
          .eq("event_id", eventId);

        if (!error && data && isSubscribed) {
          setFetchedCrew(data as EventCrew[]);
        }
      } catch (err) {
        console.error("[TaskModal] Gagal memuat kru acara:", err);
      }
    }

    loadAssignedCrew();
    return () => {
      isSubscribed = false;
    };
  }, [assignedCrew, crewProfiles, isOpen, eventId]);

  useEffect(() => {
    if (isOpen) {
      setTitle(task?.title || "");
      setDescription(task?.description || "");
      setAssignedTo(task?.assigned_to || "");
      setPriority(task?.priority || "medium");
      setStatus(task?.status || "todo");
      setDueDate(task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : "");
    }
  }, [isOpen, task]);

  // Derive combobox options strictly from assigned crew on this specific event
  const crewOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; badge?: string; subLabel?: string }> = [
      { value: "", label: "-- Belum Ditugaskan --" },
    ];

    const activeList = assignedCrew !== undefined ? assignedCrew : fetchedCrew;

    if (activeList && activeList.length > 0) {
      for (const c of activeList) {
        if (!c.profile_id) continue;
        options.push({
          value: c.profile_id,
          label: c.profile?.full_name || "Tanpa Nama",
          badge: c.role_in_event?.toUpperCase() || c.profile?.role?.toUpperCase(),
          subLabel: c.profile?.email || undefined,
        });
      }
    } else if (crewProfiles && crewProfiles.length > 0 && assignedCrew === undefined && !fetchedCrew) {
      // Fallback for isolated tests or legacy components where only crewProfiles was passed
      for (const p of crewProfiles) {
        options.push({
          value: p.id,
          label: p.full_name || "Tanpa Nama",
          badge: p.role?.toUpperCase(),
          subLabel: p.email || undefined,
        });
      }
    }

    // If editing a task that has a pre-existing assignee not in the list, keep them displayed
    if (task?.assigned_to && !options.some((o) => o.value === task.assigned_to)) {
      options.push({
        value: task.assigned_to,
        label: task.assignee?.full_name || "Kru Sebelumnya",
        badge: "TERDAFTAR",
        subLabel: task.assignee?.email || undefined,
      });
    }

    return options;
  }, [assignedCrew, fetchedCrew, crewProfiles, task]);

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
          <Combobox
            options={crewOptions}
            value={assignedTo}
            onChange={setAssignedTo}
            allowClear
            placeholder="Pilih staf / kru acara..."
            searchPlaceholder="Cari nama kru acara atau jabatan..."
            emptyText={
              (assignedCrew && assignedCrew.length === 0) || (fetchedCrew && fetchedCrew.length === 0)
                ? "Belum ada kru yang ditugaskan ke acara ini. Tambahkan kru terlebih dahulu di bagian Tim Kru Ditugaskan."
                : "Kru tidak ditemukan."
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Prioritas</label>
            <Combobox
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={(val) => setPriority(val as TaskPriority)}
              placeholder="Pilih prioritas..."
              searchPlaceholder="Cari prioritas..."
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground block mb-1.5">Status</label>
            <Combobox
              options={STATUS_OPTIONS}
              value={status}
              onChange={(val) => setStatus(val as TaskStatus)}
              placeholder="Pilih status..."
              searchPlaceholder="Cari status..."
            />
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
