import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import type { SkillResult } from "../../store/appStore";

type InstalledSkill = { name: string; path: string; agents: string };

type SkillCardProps = {
  skill: SkillResult | InstalledSkill;
  sourceLabel: string;
  onClick?: () => void;
  compact?: boolean;
};

export function SkillCard({ skill, sourceLabel, onClick, compact = false }: SkillCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl border border-zinc-800/50 bg-zinc-900/20 p-5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/40 overflow-hidden",
        onClick && "cursor-pointer",
        compact ? "h-32" : "h-40",
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold text-zinc-200 group-hover:text-primary transition-colors duration-200">{skill.name}</h3>
          {"agents" in skill && skill.agents && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">{skill.agents}</span>
          )}
        </div>
        <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{"description" in skill ? skill.description : skill.path}</p>
      </div>

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3">
        {"source" in skill ? (
          <span className="text-xs font-mono text-zinc-600 group-hover:text-zinc-400 transition-colors truncate">
            {sourceLabel}: {skill.source}
          </span>
        ) : (
          <span className="text-xs text-zinc-600">{skill.agents || "Installed"}</span>
        )}
      </div>
    </motion.div>
  );
}
