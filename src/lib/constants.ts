export const XP_PER_QUIZ = 20;
export const TOTAL_LESSONS = 7;

interface Level {
  name: string;
  minXp: number;
}

export const LEVELS: Level[] = [
  { name: 'Web3 Newcomer', minXp: 0 },
  { name: 'Web3 Beginner', minXp: 20 },
  { name: 'Web3 Explorer', minXp: 60 },
  { name: 'Web3 Learner', minXp: 100 },
  { name: 'Web3 Thinker', minXp: 140 },
  { name: 'Web3 Insider', minXp: 180 },
  { name: 'Web3 Master', minXp: 220 },
];

export function getLevel(xp: number) {
  let current = LEVELS[0];
  let next: Level | null = LEVELS[1] ?? null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].minXp) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }
  const levelIndex = LEVELS.indexOf(current) + 1;
  const progressIntoLevel = next
    ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100
    : 100;
  return {
    level: levelIndex,
    name: current.name,
    nextName: next?.name ?? null,
    progressIntoLevel: Math.min(100, Math.round(progressIntoLevel)),
  };
}
