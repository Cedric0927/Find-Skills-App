import type { Language } from "../../store/appStore";

export type AgentCategory = {
  id: string;
  label: Record<Language, string>;
  description: Record<Language, string>;
  agents: string[];
};

export const AGENT_CATEGORIES: AgentCategory[] = [
  {
    id: "ai-native-ides",
    label: { zh: "AI 原生 IDE", en: "AI-Native IDEs" },
    description: {
      zh: "为 AI 深度定制的编辑器，提供沉浸式编程体验",
      en: "Editors built from the ground up for AI pair programming.",
    },
    agents: ["cursor", "windsurf", "trae", "antigravity"],
  },
  {
    id: "cli-agents",
    label: { zh: "命令行智能体", en: "CLI Agents" },
    description: {
      zh: "运行在终端的自主代理，可执行文件操作和命令",
      en: "Autonomous agents running in your terminal with full system access.",
    },
    agents: ["claude-code", "codex", "gemini", "amp", "kiro-cli", "kilo", "opencode"],
  },
  {
    id: "editor-plugins",
    label: { zh: "编辑器插件 / 助手", en: "Editor Plugins & Assistants" },
    description: {
      zh: "集成在 VS Code 等编辑器中的 AI 辅助工具",
      en: "AI companions integrated into existing editors like VS Code.",
    },
    agents: ["copilot", "continue", "roo", "aider", "goose"],
  },
  {
    id: "autonomous-agents",
    label: { zh: "自主代理 / 数字员工", en: "Autonomous Agents" },
    description: {
      zh: "具备长期记忆和跨应用操作能力的独立 AI 代理",
      en: "Independent AI agents with long-term memory and cross-app capabilities.",
    },
    agents: ["clawdbot", "droid"],
  },
];
