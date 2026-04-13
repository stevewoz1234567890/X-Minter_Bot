import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type BotState = {
  /** X user id (snowflake) → last processed tweet id for that user. */
  lastSeenByUser: Record<string, string>;
};

export async function loadBotState(path: string): Promise<BotState> {
  try {
    const raw = await readFile(path, 'utf8');
    const j = JSON.parse(raw) as Record<string, unknown>;
    if (j.lastSeenByUser && typeof j.lastSeenByUser === 'object' && !Array.isArray(j.lastSeenByUser)) {
      return { lastSeenByUser: j.lastSeenByUser as Record<string, string> };
    }
    return { lastSeenByUser: {} };
  } catch {
    return { lastSeenByUser: {} };
  }
}

export async function saveBotState(path: string, state: BotState): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(state, null, 2), 'utf8');
}
