import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CheckSquare, Download, Globe, Layers, XCircle } from "lucide-react";
import { ProjectFolderSelector } from "../../components/ProjectFolderSelector";
import { formatSkillLabel } from "../../lib/skills";
import { cn } from "../../lib/utils";
import { AGENT_CATEGORIES } from "../../shared/constants/agentCategories";
import type { AppI18n } from "../../shared/i18n/messages";
import type { Language, SkillResult, InstallConfig } from "../../store/appStore";

type InstallDialogProps = {
  open: boolean;
  selectedSkill: SkillResult | null;
  subSkills: string[];
  config: InstallConfig;
  projectHistory: string[];
  language: Language;
  t: AppI18n;
  listCommandPreview: string;
  installCommandPreview: string;
  onClose: () => void;
  onInstall: () => void;
  onToggleAgent: (agent: string) => void;
  onToggleSkill: (skill: string) => void;
  onPickProjectFolder: () => Promise<void>;
  onProjectPathChange: (value: string) => void;
  onProjectBlur: () => Promise<void>;
  onUpdateConfig: (partial: Partial<InstallConfig>) => Promise<void>;
};

export function InstallDialog({
  open,
  selectedSkill,
  subSkills,
  config,
  projectHistory,
  language,
  t,
  listCommandPreview,
  installCommandPreview,
  onClose,
  onInstall,
  onToggleAgent,
  onToggleSkill,
  onPickProjectFolder,
  onProjectPathChange,
  onProjectBlur,
  onUpdateConfig,
}: InstallDialogProps) {
  return (
    <AnimatePresence>
      {open && selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-100">{selectedSkill.name}</h2>
                  <p className="text-sm text-zinc-400 mt-1">{selectedSkill.description}</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <XCircle size={20} className="text-zinc-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    config.isGlobal ? "border-primary/50 bg-primary/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
                  )}
                  onClick={() => void onUpdateConfig({ isGlobal: true })}
                >
                  <div className="flex items-center gap-3">
                    <Globe size={20} className={config.isGlobal ? "text-primary" : "text-zinc-500"} />
                    <div>
                      <div className="font-medium text-sm">{t.globalInstall}</div>
                      <div className="text-xs text-zinc-500">{t.globalInstallHint}</div>
                    </div>
                  </div>
                </div>
                <div
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    !config.isGlobal ? "border-primary/50 bg-primary/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
                  )}
                  onClick={() => void onUpdateConfig({ isGlobal: false })}
                >
                  <div className="flex items-center gap-3">
                    <Layers size={20} className={!config.isGlobal ? "text-primary" : "text-zinc-500"} />
                    <div>
                      <div className="font-medium text-sm">{t.projectInstall}</div>
                      <div className="text-xs text-zinc-500">{t.projectInstallHint}</div>
                    </div>
                  </div>
                </div>
              </div>

              {!config.isGlobal && (
                <ProjectFolderSelector
                  value={config.projectPath}
                  history={projectHistory}
                  onChange={onProjectPathChange}
                  onPick={async () => onPickProjectFolder()}
                  onBlur={() => void onProjectBlur()}
                  placeholder={t.projectFolderPlaceholder}
                  label={t.projectFolder}
                  hint={t.projectInstallHint}
                />
              )}

              <div
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all",
                  config.allMode ? "border-primary/50 bg-primary/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
                )}
                onClick={() => void onUpdateConfig({ allMode: !config.allMode, skills: config.allMode ? config.skills : [] })}
              >
                <div className="flex items-center gap-3">
                  <Layers size={20} className={config.allMode ? "text-primary" : "text-zinc-500"} />
                  <div>
                    <div className="font-medium text-sm">{t.installAll}</div>
                    <div className="text-xs text-zinc-500">{t.installAllHint}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    config.copyMode ? "border-primary/50 bg-primary/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
                  )}
                  onClick={() => void onUpdateConfig({ copyMode: !config.copyMode })}
                >
                  <div className="font-medium text-sm">{t.copyMode}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t.copyModeHint}</div>
                </div>
                <div
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    config.fullDepth ? "border-primary/50 bg-primary/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
                  )}
                  onClick={() => void onUpdateConfig({ fullDepth: !config.fullDepth })}
                >
                  <div className="font-medium text-sm">{t.fullDepth}</div>
                  <div className="text-xs text-zinc-500 mt-1">{t.fullDepthHint}</div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 block">{t.targetAgents}</label>
                <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                  {AGENT_CATEGORIES.map((category) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-400">{category.label[language]}</span>
                        <button
                          onClick={() => {
                            const categoryAgents = [...category.agents];
                            const allSelected = categoryAgents.every((agent) => config.agents.includes(agent));
                            const agents = allSelected
                              ? config.agents.filter((agent) => !categoryAgents.includes(agent))
                              : [...new Set([...config.agents, ...categoryAgents])];
                            void onUpdateConfig({ agents });
                          }}
                          className="text-[11px] text-zinc-500 hover:text-primary transition-colors"
                        >
                          {category.agents.every((agent) => config.agents.includes(agent)) ? t.deselectAll : t.selectAll}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {category.agents.map((agent) => (
                          <button
                            key={agent}
                            onClick={() => onToggleAgent(agent)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-sm border transition-all flex items-center gap-1.5",
                              config.agents.includes(agent)
                                ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700",
                            )}
                          >
                            {config.agents.includes(agent) && <CheckCircle2 size={12} />}
                            {agent}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {!config.allMode && (
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 block">{t.subSkills}</label>
                  {subSkills.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {subSkills.map((skill) => (
                        <label
                          key={skill}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer transition-colors"
                        >
                          <div
                            className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                              config.skills.includes(skill) ? "bg-primary border-primary" : "border-zinc-600",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={config.skills.includes(skill)}
                              onChange={() => onToggleSkill(skill)}
                            />
                            {config.skills.includes(skill) && <CheckSquare size={10} className="text-white" />}
                          </div>
                          <div className="min-w-0">
                            <span className="block text-sm text-zinc-300">{formatSkillLabel(skill)}</span>
                            <span className="block text-[11px] font-mono text-zinc-500 truncate">{skill}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-500">
                      {t.noSubSkills}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">{t.runningCommand}</label>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-[11px] font-mono text-zinc-400 break-all">
                  <div className="text-zinc-500 mb-1">{t.subSkillDiscovery}</div>
                  <div>{listCommandPreview}</div>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-[11px] font-mono text-zinc-400 break-all">
                  <div className="text-zinc-500 mb-1">{t.installCommand}</div>
                  <div>{installCommandPreview}</div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={onInstall}
                className="px-5 py-2.5 rounded-xl text-sm font-medium bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
              >
                <Download size={16} />
                {t.installSkill}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
