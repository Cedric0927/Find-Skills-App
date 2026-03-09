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
  version: string;
  install_date: string;
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
  history: string[];
  installed_cache: InstalledCacheItem[];
  searchQuery: string;
  searchStatus: "idle" | "loading" | "error";
  searchResults: SkillResult[];
  searchError?: string;
  installJobs: Record<string, InstallJob>;
  loadConfig: () => Promise<void>;
  saveConfig: () => Promise<void>;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;
  addHistory: (query: string) => Promise<void>;
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

export const useAppStore = create<AppState>((set, get) => ({
  settings: defaultSettings,
  history: [],
  installed_cache: [],
  searchQuery: "",
  searchStatus: "idle",
  searchResults: [],
  installJobs: {},
  loadConfig: async () => {
    const store = await storePromise;
    const settings = { ...defaultSettings, ...((await store.get<Settings>("settings")) ?? {}) };
    const history = (await store.get<string[]>("history")) ?? [];
    const installed_cache = (await store.get<InstalledCacheItem[]>("installed_cache")) ?? [];
    set({ settings, history, installed_cache });
  },
  saveConfig: async () => {
    const store = await storePromise;
    const { settings, history, installed_cache } = get();
    await store.set("settings", settings);
    await store.set("history", history);
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
  addHistory: async (query) => {
    const store = await storePromise;
    const trimmed = query.trim();
    if (!trimmed) return;
    const history = [trimmed, ...get().history.filter((item) => item !== trimmed)].slice(0, 10);
    set({ history });
    await store.set("history", history);
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
