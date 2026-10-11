"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar as CalIcon, Clock, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface Props {
  name: string;
  label?: string;
  defaultValue?: string;
  required?: boolean;
  withTime?: boolean;
}

const M = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
const D = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function DateTimePicker({ name, label, defaultValue, required = false, withTime = true }: Props) {
  const init = defaultValue ? new Date(defaultValue) : new Date();
  const [val, setVal] = useState<Date>(init);
  const [open, setOpen] = useState(false);
  const [m, setM] = useState(init.getMonth());
  const [y, setY] = useState(init.getFullYear());
  const [h, setH] = useState(String(init.getHours()).padStart(2, "0"));
  const [min, setMin] = useState(String(Math.floor(init.getMinutes() / 15) * 15).padStart(2, "0"));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    if (open) document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  const update = (d: Date, nh: string, nm: string) => {
    const next = new Date(d);
    if (withTime) {
      next.setHours(parseInt(nh, 10) || 0);
      next.setMinutes(parseInt(nm, 10) || 0);
      next.setSeconds(0);
    }
    setVal(next);
  };

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const labelText = val.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
    (withTime ? `, ${h}:${min} WIB` : "");
  return (
    <div className="relative" ref={ref}>
      {label && (
        <label className="block text-xs font-bold text-foreground mb-1.5 flex items-center gap-1.5">
          <CalIcon className="w-3.5 h-3.5 text-[#007aff]" />
          <span>{label}</span>
          {required && <span className="text-[#ff453a]">*</span>}
        </label>
      )}
      <input type="hidden" name={name} value={val.toISOString()} required={required} />
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="apple-input w-full flex items-center justify-between px-3.5 py-2.5 text-left text-sm cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <CalIcon className="w-4 h-4 text-[#007aff]" />
          <span className="font-bold text-foreground">{labelText}</span>
        </span>
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 p-3.5 rounded-2xl bg-card backdrop-blur-2xl border border-border shadow-2xl w-72 text-foreground">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-border">
            <button
              type="button"
              onClick={() => (m === 0 ? (setM(11), setY(y - 1)) : setM(m - 1))}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold">{M[m]} {y}</span>
            <button
              type="button"
              onClick={() => (m === 11 ? (setM(0), setY(y + 1)) : setM(m + 1))}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {D.map((d) => (
              <span key={d} className="text-[10px] font-bold text-muted-foreground">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDay }).map((_, i) => (<div key={`e-${i}`} className="h-6" />))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1;
              const sel = val.getDate() === d && val.getMonth() === m && val.getFullYear() === y;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { update(new Date(y, m, d), h, min); if (!withTime) setOpen(false); }}
                  className={`h-6 w-6 mx-auto text-xs rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                    sel
                      ? "bg-[#007aff] text-white font-bold shadow-sm shadow-[#007aff]/50"
                      : "text-foreground hover:bg-muted font-semibold"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {withTime && (
            <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Jam:</span>
              <div className="flex gap-1">
                <select
                  value={h}
                  onChange={(e) => { setH(e.target.value); update(val, e.target.value, min); }}
                  className="apple-input px-2 py-0.5 text-xs bg-muted text-foreground border-border font-bold cursor-pointer"
                >
                  {Array.from({ length: 24 }).map((_, i) => {
                    const s = String(i).padStart(2, "0");
                    return <option key={s} value={s} className="bg-card text-foreground">{s}</option>;
                  })}
                </select>
                <span className="text-muted-foreground self-center font-bold">:</span>
                <select
                  value={min}
                  onChange={(e) => { setMin(e.target.value); update(val, h, e.target.value); }}
                  className="apple-input px-2 py-0.5 text-xs bg-muted text-foreground border-border font-bold cursor-pointer"
                >
                  {["00", "15", "30", "45"].map((x) => (<option key={x} value={x} className="bg-card text-foreground">{x}</option>))}
                </select>
              </div>
            </div>
          )}

          <div className="mt-2.5 pt-2 border-t border-border flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="apple-btn-primary px-3 py-1 text-xs gap-1 font-semibold"
            >
              <Check className="w-3 h-3 stroke-[2.5]" /> <span>OK</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
