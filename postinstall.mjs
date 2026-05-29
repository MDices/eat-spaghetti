import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const MARKETPLACE_NAME = 'mdices';
const PLUGIN_NAME = 'eat';
const GITHUB_REPO = 'mdices/eat-spaghetti';

const claudeDir = join(homedir(), '.claude');
const settingsPath = join(claudeDir, 'settings.json');

let settings = {};
if (existsSync(settingsPath)) {
  try {
    settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  } catch {
    console.warn('Warning: could not parse ~/.claude/settings.json — creating fresh entry');
  }
}

settings.extraKnownMarketplaces ??= {};
settings.extraKnownMarketplaces[MARKETPLACE_NAME] = {
  source: { source: 'github', repo: GITHUB_REPO }
};

settings.enabledPlugins ??= {};
settings.enabledPlugins[`${PLUGIN_NAME}@${MARKETPLACE_NAME}`] = true;

if (!existsSync(claudeDir)) {
  mkdirSync(claudeDir, { recursive: true });
}

writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
console.log(`eat-spaghetti installed — restart Claude Code, then use /eat:spaghetti`);
