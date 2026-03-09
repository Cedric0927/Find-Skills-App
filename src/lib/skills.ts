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

function extractSkillSource(line: string) {
  const match = line.match(/^([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+@[A-Za-z0-9._-]+(?:[A-Za-z0-9._-]*[A-Za-z0-9_-])?)(?:\s+(.*))?$/);
  if (!match) {
    return null;
  }

  return {
    source: match[1],
    meta: match[2]?.trim() ?? "",
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

  if (config.allMode) {
    args.push("--all");
  } else {
    if (config.agents.length > 0) {
      args.push("-a", config.agents.join(","));
    }

    if (config.skills.length > 0) {
      args.push("-s", config.skills.join(","));
    }
  }

  if (config.copyMode) {
    args.push("--copy");
  }

  if (config.fullDepth) {
    args.push("--full-depth");
  }

  args.push("-y");
  return buildSkillsCommand(args);
}

export function parseSkillsFindOutput(output: string): SkillResult[] {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const results: SkillResult[] = [];

  for (const line of lines) {
    const parsed = extractSkillSource(line);
    if (!parsed) {
      continue;
    }

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
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const match = line.match(/^([^@]+)@([^\s]+)\s+(.*)$/);
    if (match) {
      return {
        name: match[1],
        version: match[2],
        install_date: match[3] || new Date().toISOString().slice(0, 10),
      };
    }
    return {
      name: line,
      version: "unknown",
      install_date: new Date().toISOString().slice(0, 10),
    };
  });
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
