import { Download } from "lucide-react";
import { ProjectFolderSelector } from "../../components/ProjectFolderSelector";
import { cn } from "../../lib/utils";
import { SkillCard } from "../../shared/components/SkillCard";
import type { AppI18n } from "../../shared/i18n/messages";

type InstalledItem = { name: string; path: string; agents: string };

type InstalledViewProps = {
  t: AppI18n;
  installedScope: "global" | "project";
  installedCache: InstalledItem[];
  projectPath: string;
  projectHistory: string[];
  onScopeChange: (scope: "global" | "project") => void;
  onUpdateAll: () => void;
  onProjectPathChange: (value: string) => void;
  onProjectPick: () => Promise<void>;
  onProjectBlur: () => Promise<void>;
};

export function InstalledView({
  t,
  installedScope,
  installedCache,
  projectPath,
  projectHistory,
  onScopeChange,
  onUpdateAll,
  onProjectPathChange,
  onProjectPick,
  onProjectBlur,
}: InstalledViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-200">{t.installedSkills}</h2>
        <div className="flex items-center gap-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-1 flex items-center gap-1">
            <button
              onClick={() => onScopeChange("global")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs transition-colors",
                installedScope === "global" ? "bg-primary/20 text-primary" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t.globalInstall}
            </button>
            <button
              onClick={() => onScopeChange("project")}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs transition-colors",
                installedScope === "project" ? "bg-primary/20 text-primary" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {t.projectInstall}
            </button>
          </div>
          <button
            onClick={onUpdateAll}
            className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
          >
            <Download size={14} /> {t.updateAll}
          </button>
        </div>
      </div>

      {installedScope === "project" && (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <ProjectFolderSelector
            value={projectPath}
            history={projectHistory}
            onChange={onProjectPathChange}
            onPick={async () => onProjectPick()}
            onBlur={() => void onProjectBlur()}
            placeholder={t.projectFolderPlaceholder}
            label={t.projectFolder}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {installedCache.map((item) => (
          <SkillCard key={`${item.name}-${item.path}`} skill={item} sourceLabel={t.source} compact />
        ))}
      </div>
      {installedCache.length === 0 && (
        <div className="text-center py-20 text-zinc-600 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
          {installedScope === "project" && !projectPath.trim() ? t.projectPathRequired : t.noInstalled}
        </div>
      )}
    </div>
  );
}
