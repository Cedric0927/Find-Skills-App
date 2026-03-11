import { useEffect, useMemo, useState } from "react";
import { buildAddCommand, buildAddListCommand, parseSkillsSubList } from "../../../lib/skills";
import { useAppStore, type SkillResult } from "../../../store/appStore";
import { skillsClient } from "../../../shared/services/skillsClient";
import { notify } from "../../../shared/services/notifier";
import type { AppI18n } from "../../../shared/i18n/messages";

export function useInstallFlow(t: AppI18n) {
  const { installConfig, projectHistory, addProjectHistory, updateInstallConfig, upsertInstallJob, finishInstallJob } = useAppStore();
  const [selectedSkill, setSelectedSkill] = useState<SkillResult | null>(null);
  const [subSkills, setSubSkills] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedSkill) {
      return;
    }
    const run = async () => {
      try {
        const output = await skillsClient.listSubSkills(selectedSkill.source);
        setSubSkills(parseSkillsSubList(output));
      } catch {
        setSubSkills([]);
      }
    };
    void run();
  }, [selectedSkill]);

  const listCommandPreview = useMemo(
    () => (selectedSkill ? buildAddListCommand(selectedSkill.source) : ""),
    [selectedSkill],
  );
  const installCommandPreview = useMemo(
    () => (selectedSkill ? buildAddCommand(selectedSkill.source, installConfig) : ""),
    [selectedSkill, installConfig],
  );

  const handleSearchSelect = (skill: SkillResult) => {
    setSelectedSkill(skill);
    setSubSkills([]);
    void updateInstallConfig({ skills: [] });
  };

  const toggleAgent = (agent: string) => {
    const exists = installConfig.agents.includes(agent);
    const agents = exists ? installConfig.agents.filter((item) => item !== agent) : [...installConfig.agents, agent];
    void updateInstallConfig({ agents });
  };

  const toggleSkill = (skill: string) => {
    const exists = installConfig.skills.includes(skill);
    const skills = exists ? installConfig.skills.filter((item) => item !== skill) : [...installConfig.skills, skill];
    void updateInstallConfig({ skills });
  };

  const handlePickProjectFolder = async () => {
    try {
      const selected = await skillsClient.pickProjectFolder();
      if (selected) {
        await updateInstallConfig({ projectPath: selected, isGlobal: false });
        await addProjectHistory(selected);
      }
    } catch {
      return;
    }
  };

  const installSelectedSkill = async () => {
    if (!selectedSkill) {
      return false;
    }
    if (!installConfig.isGlobal && !installConfig.projectPath.trim()) {
      await notify(t.projectPathRequired, t.projectPathRequiredBody);
      return false;
    }

    const id = `${Date.now()}`;
    const command = buildAddCommand(selectedSkill.source, installConfig);
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

    try {
      await skillsClient.add({
        id,
        source: selectedSkill.source,
        isGlobal: installConfig.isGlobal,
        agents: installConfig.agents,
        skills: installConfig.skills,
        currentDir: installConfig.isGlobal ? null : (installConfig.projectPath.trim() || null),
        copyMode: installConfig.copyMode,
        fullDepth: installConfig.fullDepth,
        allMode: installConfig.allMode,
      });
      return true;
    } catch (error) {
      finishInstallJob(id, "error", String(error));
      await notify(t.installFailed, String(error));
      return false;
    }
  };

  return {
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
  };
}
