"use client";

import { useState, useRef, useEffect, useId } from "react";
import { Search, Check, ChevronsUpDown, X, Plus } from "lucide-react";

export interface ComboboxOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowCustom?: boolean;
  customOptionPrefix?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Pilih salah satu...",
  searchPlaceholder = "Ketik untuk mencari...",
  emptyText = "Tidak ditemukan opsi yang sesuai.",
  allowCustom = false,
  customOptionPrefix = "Gunakan peran kustom:",
  className = "",
  disabled = false,
  id,
  name,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const generatedId = useId();
  const comboboxId = id || `combobox-${generatedId}`;

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query (case-insensitive)
  const query = searchQuery.trim().toLowerCase();
  const filteredOptions = options.filter((opt) => {
    if (!query) return true;
    const matchLabel = opt.label.toLowerCase().includes(query);
    const matchValue = opt.value.toLowerCase().includes(query);
    const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(query) : false;
    const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(query) : false;
    return matchLabel || matchValue || matchSub || matchBadge;
  });

  const hasExactMatch = options.some(
    (opt) => opt.value.toLowerCase() === query || opt.label.toLowerCase() === query
  );
  const showCustomOption = allowCustom && query.length > 0 && !hasExactMatch;

  // Total selectable items count (filtered + optional custom entry)
  const totalItems = filteredOptions.length + (showCustomOption ? 1 : 0);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listboxRef.current) {
      const items = listboxRef.current.querySelectorAll("li[role='option']");
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % (totalItems || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + totalItems) % (totalItems || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showCustomOption && highlightedIndex === filteredOptions.length) {
        handleSelect(searchQuery.trim());
      } else if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Hidden input for HTML form compatibility if needed */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Combobox Trigger Button (Select2 Style) */}
      <button
        type="button"
        id={comboboxId}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`apple-input w-full px-3.5 py-2.5 text-sm bg-muted text-foreground border-border flex items-center justify-between gap-2 text-left cursor-pointer transition-all ${
          isOpen ? "ring-2 ring-[#007aff]/30 border-[#007aff]" : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-[#007aff]/60"}`}
      >
        <span className="truncate">
          {selectedOption ? (
            <span className="flex items-center gap-2">
              <span className="font-medium text-foreground">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#007aff]/15 text-[#007aff] text-[10px] font-bold uppercase tracking-wider">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : value ? (
            <span className="text-foreground font-medium">{value}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </span>

        <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0 opacity-60" />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 rounded-2xl bg-card border border-border shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          style={{ minWidth: "100%" }}
        >
          {/* Search Input Filter */}
          <div className="p-2 border-b border-border bg-muted/40 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground ml-1.5 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden py-1 px-0.5"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options List */}
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-56 overflow-y-auto p-1 text-xs space-y-0.5 focus:outline-hidden"
          >
            {filteredOptions.length === 0 && !showCustomOption ? (
              <li className="px-3 py-6 text-center text-muted-foreground text-xs select-none">
                {emptyText}
              </li>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer select-none transition-colors ${
                      isHighlighted
                        ? "bg-[#007aff]/15 text-[#007aff] font-semibold"
                        : isSelected
                        ? "bg-muted text-foreground font-semibold"
                        : "text-foreground hover:bg-muted/70"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="px-1.5 py-0.2 rounded bg-muted-foreground/15 text-muted-foreground text-[9px] font-bold uppercase tracking-wider shrink-0">
                          {opt.badge}
                        </span>
                      )}
                      {opt.subLabel && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          • {opt.subLabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#007aff] shrink-0 ml-1.5 stroke-[2.5]" />
                    )}
                  </li>
                );
              })
            )}

            {/* Custom Option Item when allowCustom is true and no exact match */}
            {showCustomOption && (
              <li
                role="option"
                aria-selected={value === searchQuery.trim()}
                onClick={() => handleSelect(searchQuery.trim())}
                onMouseEnter={() => setHighlightedIndex(filteredOptions.length)}
                className={`flex items-center gap-2 px-3 py-2 mt-1 border-t border-border/60 rounded-xl cursor-pointer select-none transition-colors ${
                  highlightedIndex === filteredOptions.length
                    ? "bg-[#007aff]/15 text-[#007aff] font-semibold"
                    : "text-[#007aff] hover:bg-[#007aff]/10"
                }`}
              >
                <Plus className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                <span className="truncate">
                  {customOptionPrefix} <span className="font-bold">"{searchQuery.trim()}"</span>
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
