"use client";

import { useState, useEffect, useMemo } from "react";
import { ModalShell } from "@/components/users/modal-shell";
import { Combobox } from "@/components/ui/combobox";
import { DateTimePicker } from "@/components/ui/date-time-picker";
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

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultGcalStart(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

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
  const initialDueDate = task?.due_date ? toLocalInput(task.due_date) : "";

  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || "medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status || "todo");
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [addToGcal, setAddToGcal] = useState(!!task?.gcal_event_id);
  const [gcalStart, setGcalStart] = useState<Date>(() =>
    task?.gcal_start ? new Date(task.gcal_start) : defaultGcalStart()
  );
  const [gcalEnd, setGcalEnd] = useState<Date>(() =>
    task?.gcal_end
      ? new Date(task.gcal_end)
      : new Date((task?.gcal_start ? new Date(task.gcal_start) : defaultGcalStart()).getTime() + 3600000)
  );

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
      setDueDate(task?.due_date ? toLocalInput(task.due_date) : "");
      setAddToGcal(!!task?.gcal_event_id);
      const s = task?.gcal_start ? new Date(task.gcal_start) : defaultGcalStart();
      setGcalStart(s);
      setGcalEnd(task?.gcal_end ? new Date(task.gcal_end) : new Date(s.getTime() + 3600000));
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

  const handleToggleGcal = (checked: boolean) => {
    setAddToGcal(checked);
    if (checked && !task?.gcal_start) {
      const s = dueDate ? new Date(dueDate) : defaultGcalStart();
      setGcalStart(s);
      setGcalEnd(new Date(s.getTime() + 3600000));
    }
  };

  const handleGcalStartChange = (next: Date) => {
    const duration = gcalEnd.getTime() - gcalStart.getTime();
    setGcalStart(next);
    setGcalEnd(new Date(next.getTime() + (duration > 0 ? duration : 3600000)));
  };

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
    if (dueDate) fd.append("due_date", new Date(dueDate).toISOString());
    fd.append("gcal_enabled", addToGcal ? "1" : "0");
    if (addToGcal) {
      fd.append("gcal_start", gcalStart.toISOString());
      fd.append("gcal_end", gcalEnd.toISOString());
    }

    onSubmit(fd);
  };

  return (
    <ModalShell
      title={isEditing ? "Edit Tugas Kru" : "Tambah Tugas Kru"}
      subtitle="Tugas operasional acara"
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {isEditing && task?.creator?.full_name && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground">
            <span className="text-[11px] text-muted-foreground/80">Dibuat oleh:</span>
            <span className="font-semibold text-foreground">{task.creator.full_name}</span>
          </div>
        )}
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

        <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addToGcal}
              onChange={(e) => handleToggleGcal(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border cursor-pointer"
            />
            <span className="text-xs font-medium text-foreground">
              <span className="font-bold block">Tambahkan ke Google Calendar</span>
              <span className="text-muted-foreground text-[11px] block mt-0.5">
                {isEditing
                  ? "Hilangkan centang untuk menghapus tugas ini dari Google Calendar."
                  : "Tugas akan muncul di kalender tim pada tanggal dan jam yang dipilih."}
              </span>
            </span>
          </label>

          {addToGcal && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DateTimePicker
                name="gcal_start_picker"
                label="Mulai"
                value={gcalStart}
                onChange={handleGcalStartChange}
                withTime
              />
              <DateTimePicker
                name="gcal_end_picker"
                label="Selesai"
                value={gcalEnd}
                onChange={setGcalEnd}
                withTime
              />
            </div>
          )}
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

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="apple-btn-secondary w-full sm:w-auto px-4 py-2 text-xs justify-center text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="apple-btn-primary w-full sm:w-auto px-4 py-2 text-xs justify-center gap-1.5 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
            <span>{isEditing ? "Simpan Perubahan" : "Tambah Tugas"}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
