import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Download,
  Globe,
  Languages,
  Layers,
  Package,
  RefreshCw,
  Search,
  Settings,
  Terminal,
  XCircle,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  buildAddCommand,
  formatSkillLabel,
  parseSkillsFindOutput,
  parseSkillsListOutput,
  parseSkillsSubList,
} from "./lib/skills";
import { useAppStore, type InstallConfig, type Language, type SkillResult } from "./store/appStore";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ViewMode = "search" | "installed" | "settings";

const AGENT_CATEGORIES = [
  {
    "id": "ai-native-ides",
    "label": { "zh": "AI 原生 IDE", "en": "AI-Native IDEs" },
    "description": { "zh": "为 AI 深度定制的编辑器，提供沉浸式编程体验", "en": "Editors built from the ground up for AI pair programming." },
    "agents": ["cursor", "windsurf", "trae", "antigravity"]
  },
  {
    "id": "cli-agents",
    "label": { "zh": "命令行智能体", "en": "CLI Agents" },
    "description": { "zh": "运行在终端的自主代理，可执行文件操作和命令", "en": "Autonomous agents running in your terminal with full system access." },
    "agents": ["claude-code", "codex", "gemini", "amp", "kiro-cli", "kilo", "opencode"]
  },
  {
    "id": "editor-plugins",
    "label": { "zh": "编辑器插件 / 助手", "en": "Editor Plugins & Assistants" },
    "description": { "zh": "集成在 VS Code 等编辑器中的 AI 辅助工具", "en": "AI companions integrated into existing editors like VS Code." },
    "agents": ["copilot", "continue", "roo", "aider", "goose"]
  },
  {
    "id": "autonomous-agents",
    "label": { "zh": "自主代理 / 数字员工", "en": "Autonomous Agents" },
    "description": { "zh": "具备长期记忆和跨应用操作能力的独立 AI 代理", "en": "Independent AI agents with long-term memory and cross-app capabilities." },
    "agents": ["clawdbot", "droid"]
  },
] as const;

const messages: Record<Language, Record<string, string>> = {
  zh: {
    search: "搜索", installed: "已安装", settings: "设置", searchPlaceholder: "搜索技能，例如 react、python、analysis...", searchAction: "搜索", checkUpdates: "检查更新", installedSkills: "已安装技能", updateAll: "全部更新", noInstalled: "还没有安装任何技能，先去搜索页找一个。", appSettings: "应用设置", globalShortcut: "全局快捷键", save: "保存", shortcutHint: "用于全局打开搜索窗口。", globalInstallDefault: "默认全局安装", globalInstallDefaultHint: "默认附带 -g 参数安装技能", updateResult: "检查结果", subSkillDiscovery: "子技能探测命令", installCommand: "安装命令", globalInstall: "全局安装", globalInstallHint: "为所有项目安装", installAll: "安装全部", installAllHint: "包含所有子技能", targetAgents: "目标 Agent", projectInstall: "项目安装", projectInstallHint: "安装到指定项目目录", projectFolder: "项目文件夹", chooseFolder: "选择文件夹", projectFolderPlaceholder: "输入项目路径，或点击选择文件夹", subSkills: "子技能", noSubSkills: "没有可识别的子技能，或当前仓库无法列出子技能。", cancel: "取消", installSkill: "安装技能", runningCommand: "当前命令", searchEmpty: "搜索技能后，结果会在这里展示并可直接安装。", installDone: "安装完成", installDoneBody: "技能已安装并同步", installFailed: "安装失败", installFailedBody: "请查看日志", language: "语言", languageToggle: "中 / EN", source: "来源", selectAll: "全选", deselectAll: "取消全选"
  },
  en: {
    search: "Search", installed: "Installed", settings: "Settings", searchPlaceholder: "Find skills, for example react, python, analysis...", searchAction: "Search", checkUpdates: "Check Updates", installedSkills: "Installed Skills", updateAll: "Update All", noInstalled: "No skills installed yet. Search for one first.", appSettings: "Application Settings", globalShortcut: "Global Shortcut", save: "Save", shortcutHint: "Used to open the search window globally.", globalInstallDefault: "Default Global Install", globalInstallDefaultHint: "Install skills globally by default with -g", updateResult: "Update Check Result", subSkillDiscovery: "Sub Skill Discovery", installCommand: "Install Command", globalInstall: "Global Install", globalInstallHint: "Install for all projects", installAll: "Install All", installAllHint: "Include all sub-skills", targetAgents: "Target Agents", projectInstall: "Project Install", projectInstallHint: "Install into a specific project folder", projectFolder: "Project Folder", chooseFolder: "Choose Folder", projectFolderPlaceholder: "Enter a project path or choose a folder", subSkills: "Sub Skills", noSubSkills: "No recognizable sub-skills were found, or this repo could not list them.", cancel: "Cancel", installSkill: "Install Skill", runningCommand: "Running Command", searchEmpty: "Search for a skill and results will appear here for direct install.", installDone: "Install Complete", installDoneBody: "Skill installed and synced", installFailed: "Install Failed", installFailedBody: "Check the logs for details", language: "Language", languageToggle: "ZH / En", source: "Source", selectAll: "Select All", deselectAll: "Deselect"
  },
};

const SidebarItem = ({
  icon: Icon,
  active,
  onClick,
  label,
}: {
  icon: any;
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "p-3 rounded-xl transition-all duration-200 group relative flex flex-col items-center gap-1",
      active
        ? "bg-primary/10 text-primary"
        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50",
    )}
    title={label}
  >
    <Icon size={24} strokeWidth={1.5} />
    {active && (
      <motion.div
        layoutId="active-pill"
        className="absolute inset-0 rounded-xl border border-primary/20 bg-primary/5"
        initial={false}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
  </button>
);

const SkillCard = ({
  skill,
  sourceLabel,
  onClick,
  compact = false,
}: {
  skill: SkillResult | { name: string; path: string; agents: string };
  sourceLabel: string;
  onClick?: () => void;
  compact?: boolean;
}) => (
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
        <h3 className="font-semibold text-zinc-200 group-hover:text-primary transition-colors duration-200">
          {skill.name}
        </h3>
        {"agents" in skill && skill.agents && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            {skill.agents}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-500 line-clamp-2">
        {"description" in skill ? skill.description : skill.path}
      </p>
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

function App() {
  const {
    settings,
    history,
    installed_cache,
    searchQuery,
    searchStatus,
    searchResults,
    searchError,
    loadConfig,
    addHistory,
    setSearchQuery,
    setSearchResults,
    setSearchStatus,
    upsertInstallJob,
    setInstalledCache,
    updateSettings,
  } = useAppStore();

  const t = messages[settings.language];
  const [view, setView] = useState<ViewMode>("search");
  const [selectedSkill, setSelectedSkill] = useState<SkillResult | null>(null);
  const [subSkills, setSubSkills] = useState<string[]>([]);
  const [config, setConfig] = useState<InstallConfig>({
    isGlobal: true,
    projectPath: "",
    agents: [],
    skills: [],
    copyMode: false,
    fullDepth: false,
    allMode: false,
  });
  const [updateOutput, setUpdateOutput] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");


  useEffect(() => {
    void loadConfig();
    void handleList();
  }, [loadConfig]);

  useEffect(() => {
    const init = async () => {
      await invoke("set_global_shortcut", { accelerator: settings.shortcut });
    };
    init();
  }, [settings.shortcut]);

  useEffect(() => {
    setConfig((prev) => ({ ...prev, isGlobal: settings.is_global }));
  }, [settings.is_global]);

  useEffect(() => {
    const unlistenLogs = listen<{ id: string; line: string }>("skills-command-log", (event) => {
      console.log(`[${event.payload.id}] ${event.payload.line}`);
    });

    const unlistenFinished = listen<{ id: string; status: "success" | "error"; message?: string }>("skills-command-finished", (event) => {
      if (event.payload.status === "success") {
        notify(t.installDone, t.installDoneBody);
        void handleList();
      } else {
        notify(t.installFailed, event.payload.message ?? t.installFailedBody);
      }
    });

    return () => {
      unlistenLogs.then((fn) => fn());
      unlistenFinished.then((fn) => fn());
    };
  }, [t.installDone, t.installDoneBody, t.installFailed, t.installFailedBody]);

  useEffect(() => {
    if (!submittedQuery.trim()) {
      setSearchResults([]);
      setSearchStatus("idle");
      return;
    }

    const run = async () => {
      setSearchStatus("loading");
      try {
        const output = await invoke<string>("execute_npx_skills_find_with_logs", {
          id: `search-${Date.now()}`,
          query: submittedQuery,
        });
        const parsed = parseSkillsFindOutput(output);
        setSearchResults(parsed);
        setSearchStatus("idle");
        await addHistory(submittedQuery);
      } catch (error) {
        setSearchStatus("error", String(error));
      }
    };

    void run();
  }, [addHistory, submittedQuery, setSearchResults, setSearchStatus]);

  useEffect(() => {
    if (!selectedSkill) return;

    const fetchSubSkills = async () => {
      try {
        const output = await invoke<string>("execute_npx_skills_add_list", {
          source: selectedSkill.source,
        });
        setSubSkills(parseSkillsSubList(output));
      } catch (error) {
        console.error("Failed to fetch sub-skills", error);
      }
    };

    void fetchSubSkills();
  }, [selectedSkill]);

  const handleSearchSelect = (skill: SkillResult) => {
    setSelectedSkill(skill);
    setSubSkills([]);
    setConfig((prev) => ({ ...prev, skills: [], agents: [], allMode: false, projectPath: prev.projectPath }));
  };

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    setSubmittedQuery(trimmed);
  };

  const handleInstall = async () => {
    if (!selectedSkill) return;

    const id = `${Date.now()}`;
    const command = buildAddCommand(selectedSkill.source, config);
    upsertInstallJob({
      id,
      source: selectedSkill.source,
      command,
      status: "installing",
      logs: [],
      progress: 5,
      startedAt: Date.now(),
    });
    setSelectedSkill(null);

    await invoke("execute_npx_skills_add", {
      id,
      source: selectedSkill.source,
      is_global: config.isGlobal,
      agents: config.agents,
      skills: config.skills,
      current_dir: config.isGlobal ? null : (config.projectPath.trim() || null),
      copy_mode: config.copyMode,
      full_depth: config.fullDepth,
      all_mode: config.allMode,
    });
  };

  const handleList = async () => {
    const output = await invoke<string>("execute_npx_skills_list", {
      is_global: settings.is_global,
    });
    const parsed = parseSkillsListOutput(output);
    await setInstalledCache(parsed);
  };

  const handleCheckUpdate = async () => {
    const output = await invoke<string>("execute_npx_skills_check", {});
    setUpdateOutput(output);
  };

  const handleUpdateAll = async () => {
    const id = `${Date.now()}`;
    upsertInstallJob({
      id,
      source: "update",
      command: "skills update",
      status: "installing",
      logs: [],
      progress: 5,
      startedAt: Date.now(),
    });
    await invoke("execute_npx_skills_update", { id });
  };

  const handlePickProjectFolder = async () => {
    try {
      const selected = await invoke<string | null>("pick_project_folder");
      if (selected) {
        setConfig((prev) => ({ ...prev, projectPath: selected, isGlobal: false }));
      }
    } catch (error) {
      console.error("Failed to pick project folder", error);
    }
  };

  const toggleAgent = (agent: string) => {
    setConfig((prev) => {
      const exists = prev.agents.includes(agent);
      return {
        ...prev,
        agents: exists ? prev.agents.filter((item) => item !== agent) : [...prev.agents, agent],
      };
    });
  };

  const toggleSkill = (skill: string) => {
    setConfig((prev) => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists ? prev.skills.filter((item) => item !== skill) : [...prev.skills, skill],
      };
    });
  };

  const notify = async (title: string, body: string) => {
    let granted = await isPermissionGranted();
    if (!granted) {
      granted = (await requestPermission()) === "granted";
    }
    if (granted) {
      sendNotification({ title, body });
    }
  };

  const toggleLanguage = () => {
    void updateSettings({ language: settings.language === "zh" ? "en" : "zh" });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-zinc-950 font-sans text-zinc-100 selection:bg-primary/30">
      <nav className="w-20 flex flex-col items-center py-8 border-r border-zinc-900 bg-zinc-950/80 backdrop-blur-xl z-20">
        <div className="mb-8 p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg shadow-black/50">
          <Terminal size={24} className="text-primary" />
        </div>

        <div className="flex flex-col gap-4 w-full px-2">
          <SidebarItem icon={Search} active={view === "search"} onClick={() => setView("search")} label={t.search} />
          <SidebarItem
            icon={Package}
            active={view === "installed"}
            onClick={() => {
              setView("installed");
              void handleList();
            }}
            label={t.installed}
          />
          <SidebarItem icon={Settings} active={view === "settings"} onClick={() => setView("settings")} label={t.settings} />
        </div>

        <div className="mt-auto flex flex-col items-center gap-3">
          <button
            onClick={toggleLanguage}
            className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-zinc-300 hover:border-zinc-700 hover:text-white transition-colors"
            title={t.language}
          >
            <Languages size={18} />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950">
        <header className="h-20 px-8 border-b border-zinc-900/50 flex items-center justify-between backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            <div className="relative w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                className="w-full h-10 pl-10 pr-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearch();
                  }
                }}
                autoFocus
              />
            </div>
            <button
              onClick={handleSearch}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 transition-colors whitespace-nowrap shrink-0"
            >
              {t.searchAction}
            </button>
          </div>

          <div className="flex items-center gap-3">
            {view === "installed" && (
              <button
                onClick={handleCheckUpdate}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
              >
                <RefreshCw size={14} /> {t.checkUpdates}
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <AnimatePresence mode="wait">
            {view === "search" && (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >

                {searchStatus === "error" && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3 text-sm">
                    <AlertCircle size={18} />
                    <span>{searchError}</span>
                  </div>
                )}

                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {searchResults.map((skill) => (
                      <SkillCard key={skill.source} skill={skill} sourceLabel={t.source} onClick={() => handleSearchSelect(skill)} />
                    ))}
                  </div>
                ) : (
                  <div className="min-h-[50vh] flex flex-col items-center justify-center text-zinc-600 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                    {searchStatus === "loading" ? (
                      <RefreshCw className="animate-spin mb-4 text-zinc-500" size={32} />
                    ) : (
                      <>
                        <Search size={48} className="mb-4 opacity-20" />
                        <p>{t.searchEmpty}</p>
                        {history.length > 0 && (
                          <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-md px-6">
                            {history.map((item) => (
                              <button
                                key={item}
                                onClick={() => { setSearchQuery(item); setSubmittedQuery(item); }}
                                className="px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-xs hover:border-zinc-700 hover:text-zinc-300 transition-colors"
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {view === "installed" && (
              <motion.div
                key="installed"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-semibold text-zinc-200">{t.installedSkills}</h2>
                  <button
                    onClick={handleUpdateAll}
                    className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
                  >
                    <Download size={14} /> {t.updateAll}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {installed_cache.map((item) => (
                    <SkillCard key={item.name} skill={item} sourceLabel={t.source} compact />
                  ))}
                </div>
                {installed_cache.length === 0 && (
                  <div className="text-center py-20 text-zinc-600 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/10">
                    {t.noInstalled}
                  </div>
                )}
              </motion.div>
            )}

            {view === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-3xl mx-auto space-y-6"
              >
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 backdrop-blur-sm">
                  <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                    <Settings size={20} className="text-primary" /> {t.appSettings}
                  </h2>

                  <div className="space-y-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-medium text-zinc-400">{t.globalShortcut}</label>
                      <div className="flex gap-2">
                        <input
                          value={settings.shortcut}
                          onChange={(event) => updateSettings({ shortcut: event.target.value })}
                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                        />
                        <button className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors">
                          {t.save}
                        </button>
                      </div>
                      <p className="text-xs text-zinc-600">{t.shortcutHint}</p>
                    </div>

                    <div className="flex items-center justify-between py-4 border-t border-zinc-800/50">
                      <div>
                        <div className="text-sm font-medium text-zinc-300">{t.globalInstallDefault}</div>
                        <div className="text-xs text-zinc-500">{t.globalInstallDefaultHint}</div>
                      </div>
                      <div
                        className={cn(
                          "w-10 h-6 rounded-full p-1 cursor-pointer transition-colors duration-200",
                          settings.is_global ? "bg-primary" : "bg-zinc-800",
                        )}
                        onClick={() => updateSettings({ is_global: !settings.is_global })}
                      >
                        <motion.div
                          className="w-4 h-4 bg-white rounded-full shadow-sm"
                          layout
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          initial={false}
                          animate={{ x: settings.is_global ? 16 : 0 }}
                        />
                      </div>
                    </div>

                    {updateOutput && (
                      <div className="mt-6 pt-6 border-t border-zinc-800/50 space-y-4">
                        <div>
                          <div className="text-sm font-medium text-zinc-300 mb-2">{t.updateResult}</div>
                          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-zinc-400 whitespace-pre-wrap max-h-40 overflow-y-auto">
                            {updateOutput}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {selectedSkill && (
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
                  <button onClick={() => setSelectedSkill(null)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
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
                    onClick={() => setConfig((prev) => ({ ...prev, isGlobal: true }))}
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
                    onClick={() => setConfig((prev) => ({ ...prev, isGlobal: false }))}
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
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">{t.projectFolder}</label>
                    <div className="flex gap-2">
                      <input
                        value={config.projectPath}
                        onChange={(event) => setConfig((prev) => ({ ...prev, projectPath: event.target.value }))}
                        placeholder={t.projectFolderPlaceholder}
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      />
                      <button
                        onClick={handlePickProjectFolder}
                        className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-sm text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
                      >
                        {t.chooseFolder}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">{t.projectInstallHint}</p>
                  </div>
                )}

                <div
                  className={cn(
                    "p-4 rounded-xl border cursor-pointer transition-all",
                    config.allMode ? "border-primary/50 bg-primary/5" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700",
                  )}
                  onClick={() => setConfig((prev) => ({ ...prev, allMode: !prev.allMode, skills: prev.allMode ? prev.skills : [] }))}
                >
                  <div className="flex items-center gap-3">
                    <Layers size={20} className={config.allMode ? "text-primary" : "text-zinc-500"} />
                    <div>
                      <div className="font-medium text-sm">{t.installAll}</div>
                      <div className="text-xs text-zinc-500">{t.installAllHint}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 block">{t.targetAgents}</label>
                  <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                    {AGENT_CATEGORIES.map((category) => (
                      <div key={category.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-zinc-400">{category.label[settings.language]}</span>
                          <button
                            onClick={() => {
                              const categoryAgents: string[] = [...category.agents];
                              const allSelected = categoryAgents.every((a) => config.agents.includes(a));
                              setConfig((prev) => ({
                                ...prev,
                                agents: allSelected
                                  ? prev.agents.filter((a) => !categoryAgents.includes(a))
                                  : [...new Set([...prev.agents, ...categoryAgents])],
                              }));
                            }}
                            className="text-[11px] text-zinc-500 hover:text-primary transition-colors"
                          >
                            {category.agents.every((a) => config.agents.includes(a))
                              ? t.deselectAll
                              : t.selectAll}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {category.agents.map((agent) => (
                            <button
                              key={agent}
                              onClick={() => toggleAgent(agent)}
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
                                onChange={() => toggleSkill(skill)}
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
                      <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 px-4 py-6 text-sm text-zinc-500">{t.noSubSkills}</div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedSkill(null)}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleInstall}
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
    </div>
  );
}

export default App;
