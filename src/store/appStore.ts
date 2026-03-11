import { create } from "zustand";
import { Store } from "@tauri-apps/plugin-store";

export type Language = "zh" | "en";

export type Settings = {
  is_global: boolean;
  shortcut: string;
  theme: "dark" | "light";
  language: Language;
};

export type InstalledCacheItem = {
  name: string;
  path: string;
  agents: string;
};

export type SkillResult = {
  source: string;
  name: string;
  description: string;
  repository: string;
};

export type InstallConfig = {
  isGlobal: boolean;
  projectPath: string;
  agents: string[];
  skills: string[];
  copyMode: boolean;
  fullDepth: boolean;
  allMode: boolean;
};

export type InstallJob = {
  id: string;
  source: string;
  command: string;
  status: "pending" | "installing" | "success" | "error";
  logs: string[];
  progress: number;
  startedAt: number;
  finishedAt?: number;
  errorMessage?: string;
};

export type AppState = {
  settings: Settings;
  installConfig: InstallConfig;
  history: string[];
  projectHistory: string[];
  installed_cache: InstalledCacheItem[];
  searchQuery: string;
  searchStatus: "idle" | "loading" | "error";
  searchResults: SkillResult[];
  searchError?: string;
  installJobs: Record<string, InstallJob>;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  updateInstallConfig: (partial: Partial<InstallConfig>) => Promise<void>;
  addHistory: (query: string) => Promise<void>;
  addProjectHistory: (path: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SkillResult[]) => void;
  setSearchStatus: (status: AppState["searchStatus"], error?: string) => void;
  upsertInstallJob: (job: InstallJob) => void;
  appendInstallLog: (id: string, line: string) => void;
  finishInstallJob: (id: string, status: "success" | "error", errorMessage?: string) => void;
  setInstalledCache: (items: InstalledCacheItem[]) => Promise<void>;
};

const storePromise = Store.load("config.json");

const defaultSettings: Settings = {
  is_global: true,
  shortcut: "Alt+Space",
  theme: "dark",
  language: "zh",
};

const defaultInstallConfig: InstallConfig = {
  isGlobal: true,
  projectPath: "",
  agents: [],
  skills: [],
  copyMode: false,
  fullDepth: false,
  allMode: true,
};

export const useAppStore = create<AppState>((set, get) => ({
  settings: defaultSettings,
  installConfig: defaultInstallConfig,
  history: [],
  projectHistory: [],
  installed_cache: [],
  searchQuery: "",
  searchStatus: "idle",
  searchResults: [],
  installJobs: {},
  loadConfig: async () => {
    const store = await storePromise;
    const settings = { ...defaultSettings, ...((await store.get<Settings>("settings")) ?? {}) };
    const installConfig = {
      ...defaultInstallConfig,
      isGlobal: settings.is_global,
      ...((await store.get<InstallConfig>("install_config")) ?? {}),
    };
    const rawHistory = (await store.get<string[]>("history")) ?? [];
    // Case-insensitive deduplication for history
    const seen = new Set<string>();
    const history = rawHistory.filter((item) => {
      const lower = item.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });

    const rawProjectHistory = (await store.get<string[]>("project_history")) ?? [];
    const seenProject = new Set<string>();
    const projectHistory = rawProjectHistory.filter((item) => {
      const lower = item.toLowerCase();
      if (seenProject.has(lower)) return false;
      seenProject.add(lower);
      return true;
    });

    const installed_cache = (await store.get<InstalledCacheItem[]>("installed_cache")) ?? [];
    set({ settings, installConfig, history, projectHistory, installed_cache });
  },
  saveConfig: async () => {
    const store = await storePromise;
    const { settings, installConfig, history, projectHistory, installed_cache } = get();
    await store.set("settings", settings);
    await store.set("install_config", installConfig);
    await store.set("history", history);
    await store.set("project_history", projectHistory);
    await store.set("installed_cache", installed_cache);
    await store.save();
  },
  updateSettings: async (partial) => {
    const store = await storePromise;
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    await store.set("settings", next);
    await store.save();
  },
  updateInstallConfig: async (partial) => {
    const store = await storePromise;
    const next = { ...get().installConfig, ...partial };
    set({ installConfig: next });
    await store.set("install_config", next);
    await store.save();
  },
  addHistory: async (query) => {
    const store = await storePromise;
    const trimmed = query.trim();
    if (!trimmed) return;
    const current = get().history;
    const history = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
    set({ history });
    await store.set("history", history);
    await store.save();
  },
  addProjectHistory: async (path) => {
    const store = await storePromise;
    const trimmed = path.trim();
    if (!trimmed) return;
    const current = get().projectHistory;
    const projectHistory = [trimmed, ...current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
    set({ projectHistory });
    await store.set("project_history", projectHistory);
    await store.save();
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  setSearchStatus: (status, error) => set({ searchStatus: status, searchError: error }),
  upsertInstallJob: (job) =>
    set((state) => ({
      installJobs: { ...state.installJobs, [job.id]: job },
    })),
  appendInstallLog: (id, line) =>
    set((state) => {
      const current = state.installJobs[id];
      if (!current) return state;
      const logs = [...current.logs, line].slice(-400);
      const progress = Math.min(90, logs.length * 4);
      return {
        installJobs: {
          ...state.installJobs,
          [id]: { ...current, logs, progress },
        },
      };
    }),
  finishInstallJob: (id, status, errorMessage) =>
    set((state) => {
      const current = state.installJobs[id];
      if (!current) return state;
      return {
        installJobs: {
          ...state.installJobs,
          [id]: {
            ...current,
            status,
            errorMessage,
            finishedAt: Date.now(),
            progress: status === "success" ? 100 : current.progress,
          },
        },
      };
    }),
  setInstalledCache: async (items) => {
    const store = await storePromise;
    set({ installed_cache: items });
    await store.set("installed_cache", items);
    await store.save();
  },
}));
