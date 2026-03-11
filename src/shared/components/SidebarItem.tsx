import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

type SidebarItemProps = {
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  label: string;
};

export function SidebarItem({ icon: Icon, active, onClick, label }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all duration-200 group relative flex flex-col items-center gap-1",
        active ? "bg-primary/10 text-primary" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50",
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
}
