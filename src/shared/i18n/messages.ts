import type { Language } from "../../store/appStore";

export type AppI18n = {
  search: string;
  installed: string;
  searchPlaceholder: string;
  searchAction: string;
  checkUpdates: string;
  installedSkills: string;
  updateAll: string;
  noInstalled: string;
  updateResult: string;
  subSkillDiscovery: string;
  installCommand: string;
  globalInstall: string;
  globalInstallHint: string;
  installAll: string;
  installAllHint: string;
  copyMode: string;
  copyModeHint: string;
  fullDepth: string;
  fullDepthHint: string;
  targetAgents: string;
  projectInstall: string;
  projectInstallHint: string;
  projectFolder: string;
  projectFolderPlaceholder: string;
  subSkills: string;
  noSubSkills: string;
  cancel: string;
  installSkill: string;
  runningCommand: string;
  searchEmpty: string;
  installDone: string;
  installDoneBody: string;
  installFailed: string;
  installFailedBody: string;
  projectPathRequired: string;
  projectPathRequiredBody: string;
  source: string;
  selectAll: string;
  deselectAll: string;
  recommendedSkills: string;
  recentSearches: string;
};

export const messages: Record<Language, AppI18n> = {
  zh: {
    search: "搜索",
    installed: "已安装",
    searchPlaceholder: "搜索技能，例如 react、python、analysis...",
    searchAction: "搜索",
    checkUpdates: "检查更新",
    installedSkills: "已安装技能",
    updateAll: "全部更新",
    noInstalled: "还没有安装任何技能，先去搜索页找一个。",
    updateResult: "检查结果",
    subSkillDiscovery: "子技能探测命令",
    installCommand: "安装命令",
    globalInstall: "全局安装",
    globalInstallHint: "为所有项目安装",
    installAll: "安装全部",
    installAllHint: "包含所有子技能，不会自动选择全部 Agent",
    copyMode: "复制模式",
    copyModeHint: "对应 --copy，复制文件而不是软链接",
    fullDepth: "深度扫描",
    fullDepthHint: "对应 --full-depth，递归扫描全部子目录",
    targetAgents: "目标 Agent",
    projectInstall: "项目安装",
    projectInstallHint: "安装到指定项目目录",
    projectFolder: "项目文件夹",
    projectFolderPlaceholder: "输入项目路径，或点击选择文件夹",
    subSkills: "子技能",
    noSubSkills: "没有可识别的子技能，或当前仓库无法列出子技能。",
    cancel: "取消",
    installSkill: "安装技能",
    runningCommand: "当前命令",
    searchEmpty: "搜索技能后，结果会在这里展示并可直接安装。",
    installDone: "安装完成",
    installDoneBody: "技能已安装并同步",
    installFailed: "安装失败",
    installFailedBody: "请查看日志",
    projectPathRequired: "请先选择项目目录",
    projectPathRequiredBody: "项目安装模式下必须设置项目路径",
    source: "来源",
    selectAll: "全选",
    deselectAll: "取消全选",
    recommendedSkills: "推荐技能",
    recentSearches: "最近搜索",
  },
  en: {
    search: "Search",
    installed: "Installed",
    searchPlaceholder: "Find skills, for example react, python, analysis...",
    searchAction: "Search",
    checkUpdates: "Check Updates",
    installedSkills: "Installed Skills",
    updateAll: "Update All",
    noInstalled: "No skills installed yet. Search for one first.",
    updateResult: "Update Check Result",
    subSkillDiscovery: "Sub Skill Discovery",
    installCommand: "Install Command",
    globalInstall: "Global Install",
    globalInstallHint: "Install for all projects",
    installAll: "Install All",
    installAllHint: "Include all sub-skills without auto-selecting all agents",
    copyMode: "Copy Mode",
    copyModeHint: "Maps to --copy and copies files instead of symlinks",
    fullDepth: "Deep Scan",
    fullDepthHint: "Maps to --full-depth and scans nested directories",
    targetAgents: "Target Agents",
    projectInstall: "Project Install",
    projectInstallHint: "Install into a specific project folder",
    projectFolder: "Project Folder",
    projectFolderPlaceholder: "Enter a project path or choose a folder",
    subSkills: "Sub Skills",
    noSubSkills: "No recognizable sub-skills were found, or this repo could not list them.",
    cancel: "Cancel",
    installSkill: "Install Skill",
    runningCommand: "Running Command",
    searchEmpty: "Search for a skill and results will appear here for direct install.",
    installDone: "Install Complete",
    installDoneBody: "Skill installed and synced",
    installFailed: "Install Failed",
    installFailedBody: "Check the logs for details",
    projectPathRequired: "Please choose a project folder first",
    projectPathRequiredBody: "Project install requires a non-empty project path",
    source: "Source",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    recommendedSkills: "Recommended",
    recentSearches: "Recent Searches",
  },
};
