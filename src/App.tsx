import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Languages, Package, RefreshCw, Search, Terminal } from "lucide-react";
import { useAppStore } from "./store/appStore";
import { messages } from "./shared/i18n/messages";
import { SidebarItem } from "./shared/components/SidebarItem";
import { SearchView } from "./features/search/SearchView";
import { InstalledView } from "./features/installed/InstalledView";
import { useSkillSearch } from "./features/search/hooks/useSkillSearch";
import { useInstalledSkills } from "./features/installed/hooks/useInstalledSkills";
import { useInstallFlow } from "./features/install/hooks/useInstallFlow";
import { useSkillsCommandEvents } from "./shared/hooks/useSkillsCommandEvents";
import { InstallDialog } from "./features/install/InstallDialog";
import { skillsClient } from "./shared/services/skillsClient";

type ViewMode = "search" | "installed";

function App() {
  const { settings, updateSettings, loadConfig, upsertInstallJob } = useAppStore();
  const t = messages[settings.language];
  const [view, setView] = useState<ViewMode>("search");
  const [updateOutput, setUpdateOutput] = useState("");
  const { searchQuery, searchStatus, searchResults, searchError, history, setSearchQuery, runSearch } = useSkillSearch();
  const { installed_cache, installedScope, setInstalledScope, refreshInstalledSkills } = useInstalledSkills();
  const install = useInstallFlow(t);

  const onInstallSuccess = useCallback(() => {
    void refreshInstalledSkills(installedScope);
  }, [installedScope, refreshInstalledSkills]);

  useSkillsCommandEvents(t, onInstallSuccess);

  const {
    selectedSkill,
    subSkills,
    listCommandPreview,
    installCommandPreview,
    projectHistory,
    installConfig,
    setSelectedSkill,
    handleSearchSelect,
    toggleAgent,
    toggleSkill,
    handlePickProjectFolder,
    installSelectedSkill,
    addProjectHistory,
    updateInstallConfig,
  } = install;

  useEffect(() => {
    const init = async () => {
      await loadConfig();
      const { settings: nextSettings, installConfig: nextConfig } = useAppStore.getState();
      const initialScope = nextSettings.is_global || !nextConfig.projectPath.trim() ? "global" : "project";
      setInstalledScope(initialScope);
      await refreshInstalledSkills(initialScope);
    };
    void init();
  }, [loadConfig, refreshInstalledSkills, setInstalledScope]);

  const handleSearch = () => {
    const trimmed = searchQuery.trim();
    void runSearch(trimmed, true);
  };

  const handleCheckUpdate = async () => {
    const output = await skillsClient.checkUpdate();
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
    await skillsClient.updateAll(id);
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
              void refreshInstalledSkills(installedScope);
            }}
            label={t.installed}
          />
        </div>

        <div className="mt-auto w-full px-2">
          <SidebarItem
            icon={Languages}
            active={false}
            onClick={() => void updateSettings({ language: settings.language === "zh" ? "en" : "zh" })}
            label={settings.language === "zh" ? "English" : "中文"}
          />
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
                <SearchView
                  t={t}
                  language={settings.language}
                  searchStatus={searchStatus}
                  searchResults={searchResults}
                  searchError={searchError}
                  history={history}
                  onSelect={handleSearchSelect}
                  onHistoryClick={(query) => {
                    setSearchQuery(query);
                    void runSearch(query, true);
                  }}
                  onTagClick={(tag) => {
                    setSearchQuery(tag);
                    void runSearch(tag, true);
                  }}
                />
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
                <InstalledView
                  t={t}
                  installedScope={installedScope}
                  installedCache={installed_cache}
                  projectPath={installConfig.projectPath}
                  projectHistory={projectHistory}
                  onScopeChange={(scope) => {
                    setInstalledScope(scope);
                    void refreshInstalledSkills(scope);
                  }}
                  onUpdateAll={handleUpdateAll}
                  onProjectPathChange={(value) => {
                    void updateInstallConfig({ projectPath: value, isGlobal: false });
                    void refreshInstalledSkills("project");
                  }}
                  onProjectPick={async () => {
                    await handlePickProjectFolder();
                    await refreshInstalledSkills("project");
                  }}
                  onProjectBlur={async () => {
                    if (installConfig.projectPath.trim()) {
                      await addProjectHistory(installConfig.projectPath);
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          {updateOutput && view === "installed" && (
            <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 font-mono text-xs text-zinc-400 whitespace-pre-wrap">
              {updateOutput}
            </div>
          )}
        </div>
      </main>

      <InstallDialog
        open={Boolean(selectedSkill)}
        selectedSkill={selectedSkill}
        subSkills={subSkills}
        config={installConfig}
        projectHistory={projectHistory}
        language={settings.language}
        t={t}
        listCommandPreview={listCommandPreview}
        installCommandPreview={installCommandPreview}
        onClose={() => setSelectedSkill(null)}
        onInstall={() => void installSelectedSkill()}
        onToggleAgent={toggleAgent}
        onToggleSkill={toggleSkill}
        onPickProjectFolder={handlePickProjectFolder}
        onProjectPathChange={(value) => void updateInstallConfig({ projectPath: value, isGlobal: false })}
        onProjectBlur={async () => {
          if (installConfig.projectPath.trim()) {
            await addProjectHistory(installConfig.projectPath);
          }
        }}
        onUpdateConfig={updateInstallConfig}
      />
    </div>
  );
}

export default App;
