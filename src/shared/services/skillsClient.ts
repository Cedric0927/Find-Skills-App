import { invoke } from "@tauri-apps/api/core";

type AddOptions = {
  id: string;
  source: string;
  isGlobal: boolean;
  agents: string[];
  skills: string[];
  currentDir: string | null;
  copyMode: boolean;
  fullDepth: boolean;
  allMode: boolean;
};

export const skillsClient = {
  search: (id: string, query: string) =>
    invoke<string>("execute_npx_skills_find_with_logs", {
      id,
      query,
    }),
  list: (isGlobal: boolean, currentDir: string | null) =>
    invoke<string>("execute_npx_skills_list", {
      isGlobal,
      currentDir,
    }),
  listSubSkills: (source: string) =>
    invoke<string>("execute_npx_skills_add_list", {
      source,
    }),
  add: (options: AddOptions) => invoke("execute_npx_skills_add", options),
  checkUpdate: () => invoke<string>("execute_npx_skills_check", {}),
  updateAll: (id: string) => invoke("execute_npx_skills_update", { id }),
  pickProjectFolder: () => invoke<string | null>("pick_project_folder"),
};
