import React, { useState, useRef, useEffect } from "react";
import { Folder, ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";

interface ProjectFolderSelectorProps {
  value: string;
  history: string[];
  onChange: (value: string) => void;
  onPick: () => void;
  onBlur?: () => void;
  placeholder: string;
  label?: string;
  hint?: string;
}

export const ProjectFolderSelector: React.FC<ProjectFolderSelectorProps> = ({
  value,
  history,
  onChange,
  onPick,
  onBlur,
  placeholder,
  label,
  hint,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-3" ref={containerRef}>
      {label && <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">{label}</label>}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onFocus={() => setIsOpen(true)}
              onBlur={() => {
                onBlur?.();
                setIsOpen(false);
              }}
              placeholder={placeholder}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 pr-10 text-sm text-zinc-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
            />
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <ChevronDown size={16} className={cn("transition-transform duration-200", isOpen && "rotate-180")} />
              </button>
            )}
          </div>
          <button
            onClick={onPick}
            className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <Folder size={16} />
          </button>
        </div>

        {isOpen && history.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 overflow-hidden animate-in fade-in zoom-in duration-200">
            {history.map((path, index) => (
              <button
                key={`${path}-${index}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur before click
                  onChange(path);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors truncate flex items-center gap-2"
              >
                <Folder size={14} className="text-zinc-500 shrink-0" />
                <span className="truncate">{path}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
};
