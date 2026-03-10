import type { InstallConfig, SkillResult } from "../store/appStore";

function quoteArg(value: string) {
  if (!value) {
    return '""';
  }

  return /\s/.test(value) ? `"${value}"` : value;
}

function joinCommand(args: string[]) {
  return args.map(quoteArg).join(" ");
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function extractSkillSource(line: string) {
  const trimmed = line.trim();
  if (/^install with\b/i.test(trimmed) || /^usage:\s*/i.test(trimmed)) {
    return null;
  }

  const match = line.match(/([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+@[A-Za-z0-9._-]+(?:[A-Za-z0-9._-]*[A-Za-z0-9_-])?)/);
  if (!match) {
    return null;
  }

  const source = match[1];
  const sourceIndex = line.indexOf(source);
  const beforeChar = sourceIndex > 0 ? line[sourceIndex - 1] : "";
  const afterChar = line[sourceIndex + source.length] ?? "";
  if (beforeChar === "<" && afterChar === ">") {
    return null;
  }

  const [repoPath = "", skillName = ""] = source.split("@");
  const [owner = "", repo = ""] = repoPath.split("/");
  if (
    owner.toLowerCase() === "owner" &&
    repo.toLowerCase() === "repo" &&
    skillName.toLowerCase() === "skill"
  ) {
    return null;
  }

  const leading = sourceIndex > 0 ? line.slice(0, sourceIndex).trim() : "";
  const trailing = line.slice(sourceIndex + source.length).trim();
  const metaCandidate = [leading, trailing]
    .filter(Boolean)
    .join(" ")
    .replace(/^[-:|]\s*/, "")
    .trim();

  return {
    source,
    meta: metaCandidate,
  };
}

function humanizeSlug(value: string) {
  return value.replace(/[-_]+/g, " ").trim();
}

function extractSubSkillToken(line: string) {
  const cleaned = line
    .replace(/[│└├┌┐┘┬┴┼•○●◆◇■□→←↳]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return null;
  }

  if (/^(tip:|source:|failed|installation failed|canceled|install with)/i.test(cleaned)) {
    return null;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return null;
  }

  if (!/[A-Za-z]/.test(cleaned)) {
    return null;
  }

  const slugMatch = cleaned.match(/([A-Za-z0-9][A-Za-z0-9._-]{2,})/g);
  if (!slugMatch || slugMatch.length === 0) {
    return null;
  }

  const token = slugMatch[0];
  if (["skills", "source", "failed", "install", "using", "global", "without", "prompts"].includes(token.toLowerCase())) {
    return null;
  }

  return token;
}

export function buildSkillsCommand(args: string[]) {
  return joinCommand(["npx", ...args]);
}

export function buildFindCommand(query: string) {
  const trimmed = query.trim();
  return buildSkillsCommand(["skills", "find", trimmed || "<query>"]);
}

export function buildAddListCommand(source: string) {
  return buildSkillsCommand(["skills", "add", source, "-l"]);
}

export function buildListCommand(isGlobal: boolean) {
  return buildSkillsCommand(isGlobal ? ["skills", "list", "-g"] : ["skills", "list"]);
}

export function buildCheckCommand() {
  return buildSkillsCommand(["skills", "check"]);
}

export function buildUpdateCommand() {
  return buildSkillsCommand(["skills", "update"]);
}

export function buildAddCommand(source: string, config: InstallConfig) {
  const args = ["skills", "add", source];

  if (config.isGlobal) {
    args.push("-g");
  }

  if (config.agents.length > 0) {
    config.agents.forEach((agent) => {
      args.push("-a", agent);
    });
  }

  if (config.allMode) {
    args.push("-s", "*");
  } else if (config.skills.length > 0) {
    config.skills.forEach((skill) => {
      args.push("-s", skill);
    });
  }

  if (config.copyMode) {
    args.push("--copy");
  }

  if (config.fullDepth) {
    args.push("--full-depth");
  }

  args.push("-y");
  const command = buildSkillsCommand(args);

  if (!config.isGlobal && config.projectPath.trim()) {
    return `cd ${quoteArg(config.projectPath.trim())}; ${command}`;
  }

  return command;
}

export function parseSkillsFindOutput(output: string): SkillResult[] {
  const lines = output
    .split(/\r?\n/)
    .map((line) => stripAnsi(line).trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const results: SkillResult[] = [];

  for (const line of lines) {
    const parsed = extractSkillSource(line);
    if (!parsed) {
      continue;
    }
    if (seen.has(parsed.source)) {
      continue;
    }
    seen.add(parsed.source);

    results.push({
      source: parsed.source,
      name: humanizeSlug(parsed.source.split("@")[1] ?? parsed.source),
      description: parsed.meta || "Installable skill",
      repository: parsed.source.split("@")[0] ?? parsed.source,
    });
  }

  return results;
}

export function parseSkillsListOutput(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => stripAnsi(line).trim())
    .filter(Boolean);

  const results: Array<{ name: string; path: string; agents: string }> = [];
  const seen = new Set<string>();

  const cleanLine = (line: string) =>
    line
      .replace(/^[\s│├└─•*→-]+/, "")
      .replace(/\s+/g, " ")
      .trim();

  for (const rawLine of lines) {
    const line = cleanLine(rawLine);
    if (/^global skills$/i.test(line)) {
      continue;
    }

    if (/^agents:/i.test(line)) {
      const last = results[results.length - 1];
      if (!last) {
        continue;
      }
      last.agents = line.replace(/^agents:\s*/i, "").trim();
      continue;
    }

    const inlineAgentsMatch = line.match(/\s+agents:\s*(.+)$/i);
    const baseLine = inlineAgentsMatch ? line.slice(0, inlineAgentsMatch.index).trim() : line;
    const agents = inlineAgentsMatch?.[1]?.trim() ?? "";

    const primary = baseLine.match(/^([A-Za-z0-9._-]+)\s+(.+)$/);
    if (!primary) {
      continue;
    }

    const path = primary[2].trim();
    if (!/[\\/.:~]/.test(path)) {
      continue;
    }

    const identity = `${primary[1]}|${path}`;
    if (seen.has(identity)) {
      continue;
    }
    seen.add(identity);

    results.push({ name: primary[1], path, agents });
  }

  return results;
}

export function parseSkillsSubList(output: string) {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const seen = new Set<string>();
  const results: string[] = [];

  for (const line of lines) {
    const token = extractSubSkillToken(line);
    if (!token) {
      continue;
    }

    if (seen.has(token)) {
      continue;
    }

    seen.add(token);
    results.push(token);
  }

  return results;
}

export function formatSkillLabel(value: string) {
  return humanizeSlug(value);
}
