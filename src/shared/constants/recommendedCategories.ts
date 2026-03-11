import { Globe, Layers, Package, Terminal, type LucideIcon } from "lucide-react";
import type { Language } from "../../store/appStore";

export type RecommendedCategory = {
  id: string;
  label: Record<Language, string>;
  icon: LucideIcon;
  tags: string[];
};

export const RECOMMENDED_CATEGORIES: RecommendedCategory[] = [
  {
    id: "frontend",
    label: { zh: "前端开发", en: "Frontend" },
    icon: Globe,
    tags: ["React", "Vue", "Next.js", "Tailwind", "TypeScript", "Vite", "Astro"],
  },
  {
    id: "backend",
    label: { zh: "后端与数据库", en: "Backend & DB" },
    icon: Package,
    tags: ["Rust", "Go", "Python", "Node", "PostgreSQL", "Supabase", "Redis"],
  },
  {
    id: "ai-tools",
    label: { zh: "AI 与智能体", en: "AI & Agents" },
    icon: Terminal,
    tags: ["OpenAI", "DeepSeek", "Claude", "Gemini", "LangChain", "Llama"],
  },
  {
    id: "devops-tools",
    label: { zh: "开发工具", en: "Dev Tools" },
    icon: Layers,
    tags: ["Tauri", "Docker", "Git", "Kubernetes", "Nginx", "Linux", "Vercel"],
  },
];
