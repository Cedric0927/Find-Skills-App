import { useCallback, useState } from "react";
import { parseSkillsListOutput } from "../../../lib/skills";
import { useAppStore } from "../../../store/appStore";
import { skillsClient } from "../../../shared/services/skillsClient";

export function useInstalledSkills() {
  const { settings, installConfig, installed_cache, setInstalledCache } = useAppStore();
  const [installedScope, setInstalledScope] = useState<"global" | "project">(settings.is_global ? "global" : "project");

  const refreshInstalledSkills = useCallback(
    async (scope: "global" | "project") => {
      try {
        if (scope === "project" && !installConfig.projectPath.trim()) {
          await setInstalledCache([]);
          return;
        }
        const output = await skillsClient.list(
          scope === "global",
          scope === "global" ? null : (installConfig.projectPath.trim() || null),
        );
        await setInstalledCache(parseSkillsListOutput(output));
      } catch {
        await setInstalledCache([]);
      }
    },
    [installConfig.projectPath, setInstalledCache],
  );

  return {
    installed_cache,
    installedScope,
    setInstalledScope,
    refreshInstalledSkills,
  };
}
