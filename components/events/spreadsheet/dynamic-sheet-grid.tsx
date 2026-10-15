"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Edit2, Check } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import type { SheetData, SheetColumn, SheetRow } from "@/types/database";

interface DynamicSheetGridProps {
  data: SheetData;
  onChange: (updatedData: SheetData) => void;
  readOnly?: boolean;
}

export function DynamicSheetGrid({ data, onChange, readOnly = false }: DynamicSheetGridProps) {
  const [activeCell, setActiveCell] = useState<{ rowIdx: number; colId: string } | null>(null);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colNameDraft, setColNameDraft] = useState("");
  const [deletingCol, setDeletingCol] = useState<SheetColumn | null>(null);
  const [deletingRowIdx, setDeletingRowIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const colInputRef = useRef<HTMLInputElement>(null);
  const counterRef = useRef(0);

  const columns = useMemo(() => data.columns || [], [data.columns]);
  const rows = useMemo(() => data.rows || [], [data.rows]);

  useEffect(() => {
    if (activeCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [activeCell]);

  useEffect(() => {
    if (editingColId && colInputRef.current) {
      colInputRef.current.focus();
      colInputRef.current.select();
    }
  }, [editingColId]);

  const handleCellChange = useCallback(
    (rowIdx: number, colId: string, value: string) => {
      const nextRows = rows.map((r, idx) => (idx === rowIdx ? { ...r, [colId]: value } : r));
      onChange({ columns, rows: nextRows });
    },
    [columns, rows, onChange]
  );

  const handleAddRow = () => {
    counterRef.current += 1;
    const newRowId = `row_${rows.length + 1}_${counterRef.current}`;
    const newRow: SheetRow = { id: newRowId };
    columns.forEach((col) => { newRow[col.id] = ""; });
    const nextRows = [...rows, newRow];
    onChange({ columns, rows: nextRows });
    if (columns.length > 0) {
      setActiveCell({ rowIdx: rows.length, colId: columns[0].id });
    }
  };

  const confirmDeleteRow = () => {
    if (deletingRowIdx === null || rows.length <= 1) return;
    const nextRows = rows.filter((_, idx) => idx !== deletingRowIdx);
    onChange({ columns, rows: nextRows });
    if (activeCell?.rowIdx === deletingRowIdx) setActiveCell(null);
  };

  const handleAddColumn = () => {
    counterRef.current += 1;
    const newColId = `col_${columns.length + 1}_${counterRef.current}`;
    const newColName = `Kolom ${columns.length + 1}`;
    const nextCols: SheetColumn[] = [...columns, { id: newColId, name: newColName }];
    const nextRows = rows.map((row) => ({ ...row, [newColId]: "" }));
    onChange({ columns: nextCols, rows: nextRows });
    setEditingColId(newColId);
    setColNameDraft(newColName);
  };

  const handleSaveColName = () => {
    if (!editingColId) return;
    const trimmed = colNameDraft.trim() || "Kolom";
    const nextCols = columns.map((c) => (c.id === editingColId ? { ...c, name: trimmed } : c));
    onChange({ columns: nextCols, rows });
    setEditingColId(null);
    setColNameDraft("");
  };

  const confirmDeleteColumn = () => {
    if (!deletingCol || columns.length <= 1) return;
    const colId = deletingCol.id;
    const nextCols = columns.filter((c) => c.id !== colId);
    const nextRows = rows.map((row) => {
      const copy = { ...row };
      delete copy[colId];
      return copy;
    });
    onChange({ columns: nextCols, rows: nextRows });
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        if (colIdx > 0) setActiveCell({ rowIdx, colId: columns[colIdx - 1].id });
        else if (rowIdx > 0) setActiveCell({ rowIdx: rowIdx - 1, colId: columns[columns.length - 1].id });
      } else {
        if (colIdx < columns.length - 1) setActiveCell({ rowIdx, colId: columns[colIdx + 1].id });
        else if (rowIdx < rows.length - 1) setActiveCell({ rowIdx: rowIdx + 1, colId: columns[0].id });
        else handleAddRow();
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rowIdx < rows.length - 1) setActiveCell({ rowIdx: rowIdx + 1, colId: columns[colIdx].id });
      else handleAddRow();
    } else if (e.key === "Escape") {
      setActiveCell(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold uppercase tracking-wider">{columns.length} Kolom • {rows.length} Baris</span>
          <span>•</span>
          <span>Navigasi: <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Enter</kbd> / <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">Tab</kbd></span>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddColumn}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card hover:bg-muted text-foreground border border-border text-xs font-medium cursor-pointer transition-colors"
            >
              <Plus className="w-3 h-3 text-[#007aff]" />
              <span>Tambah Kolom</span>
            </button>
            <button
              type="button"
              onClick={handleAddRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#007aff] hover:bg-[#0071eb] text-white text-xs font-semibold cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Baris</span>
            </button>
          </div>
        )}
      </div>

      <div className="apple-card overflow-hidden border border-border shadow-xs bg-card">
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto">
          <table className="w-full border-collapse text-xs select-text">
            <thead>
              <tr className="bg-muted/70 sticky top-0 z-10 border-b border-border divide-x divide-border">
                <th className="w-10 px-2 py-2 text-center font-bold text-muted-foreground text-[10px] bg-muted/90 select-none">#</th>
                {columns.map((col) => (
                  <th key={col.id} className="min-w-[140px] px-2.5 py-2 text-left font-semibold text-foreground group relative select-none">
                    {editingColId === col.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={colInputRef}
                          type="text"
                          value={colNameDraft}
                          onChange={(e) => setColNameDraft(e.target.value)}
                          onBlur={handleSaveColName}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveColName();
                            if (e.key === "Escape") setEditingColId(null);
                          }}
                          className="w-full px-1.5 py-0.5 text-xs bg-background border border-[#007aff] rounded outline-none font-semibold text-foreground"
                        />
                        <button type="button" onClick={handleSaveColName} className="p-1 hover:text-emerald-500 text-muted-foreground">
                          <Check className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          onDoubleClick={() => { if (!readOnly) { setEditingColId(col.id); setColNameDraft(col.name); } }}
                          className="truncate cursor-pointer hover:text-[#007aff]"
                          title="Klik ganda untuk ubah nama kolom"
                        >
                          {col.name}
                        </span>
                        {!readOnly && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                            <button
                              type="button"
                              onClick={() => { setEditingColId(col.id); setColNameDraft(col.name); }}
                              className="p-0.5 text-muted-foreground hover:text-foreground"
                              title="Ubah nama kolom"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            {columns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setDeletingCol(col)}
                                className="p-0.5 text-muted-foreground hover:text-rose-500 ml-0.5 cursor-pointer"
                                title="Hapus kolom"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row, rowIdx) => (
                <tr key={row.id || `r-${rowIdx}`} className="hover:bg-muted/30 divide-x divide-border transition-colors group">
                  <td className="w-10 px-1 py-1.5 text-center font-mono text-[10px] text-muted-foreground bg-muted/40 group-hover:bg-muted/60 relative select-none">
                    <span className="group-hover:hidden">{rowIdx + 1}</span>
                    {!readOnly && rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDeletingRowIdx(rowIdx)}
                        className="hidden group-hover:inline-flex items-center justify-center text-muted-foreground hover:text-rose-500 cursor-pointer w-full"
                        title="Hapus baris"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                  {columns.map((col, colIdx) => {
                    const isCellActive = activeCell?.rowIdx === rowIdx && activeCell?.colId === col.id;
                    const cellValue = row[col.id] !== undefined && row[col.id] !== null ? String(row[col.id]) : "";
                    return (
                      <td
                        key={col.id}
                        onClick={() => { if (!readOnly) setActiveCell({ rowIdx, colId: col.id }); }}
                        className={`p-0 relative cursor-text min-w-[140px] ${
                          isCellActive ? "ring-2 ring-inset ring-[#007aff] z-2 bg-blue-50/20 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        {isCellActive && !readOnly ? (
                          <input
                            ref={inputRef}
                            type="text"
                            value={cellValue}
                            onChange={(e) => handleCellChange(rowIdx, col.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                            onBlur={() => setActiveCell(null)}
                            className="w-full h-full px-2.5 py-1.5 text-xs bg-transparent border-none outline-none font-normal text-foreground focus:ring-0"
                          />
                        ) : (
                          <div className="px-2.5 py-1.5 min-h-[30px] text-xs text-foreground whitespace-pre-wrap break-words">
                            {cellValue || <span className="text-muted-foreground/20 italic">-</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deletingCol}
        title="Konfirmasi Hapus Kolom"
        itemName={deletingCol?.name}
        message={deletingCol ? `Apakah Anda yakin ingin menghapus kolom "${deletingCol.name}"? Semua data dalam kolom ini akan dihapus permanen.` : undefined}
        onConfirm={confirmDeleteColumn}
        onClose={() => setDeletingCol(null)}
      />

      <ConfirmModal
        isOpen={deletingRowIdx !== null}
        title="Konfirmasi Hapus Baris"
        itemName={deletingRowIdx !== null ? `Baris ${deletingRowIdx + 1}` : undefined}
        message={deletingRowIdx !== null ? `Apakah Anda yakin ingin menghapus baris ke-${deletingRowIdx + 1}? Semua data pada baris ini akan dihapus.` : undefined}
        onConfirm={confirmDeleteRow}
        onClose={() => setDeletingRowIdx(null)}
      />
    </div>
  );
}
