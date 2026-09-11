/** 上映開始までに必要な安全余裕（分）。環境変数で上書き可能 */
export const SECOND_MOVIE_SAFETY_BUFFER_MINUTES = Number(
  process.env.SECOND_MOVIE_SAFETY_BUFFER_MINUTES ?? 2,
);

/** conceptName ベースのデフォルト移動時間（DB未設定時のフォールバック） */
export const DEFAULT_WALK_MINUTES_BY_CONCEPT: Record<string, Record<string, number>> = {
  Starry: { Starry: 0, Abyss: 2, Cyber: 3 },
  Abyss: { Starry: 2, Abyss: 0, Cyber: 2 },
  Cyber: { Starry: 3, Abyss: 2, Cyber: 0 },
};

export function fallbackWalkMinutes(fromConcept: string, toConcept: string): number {
  return DEFAULT_WALK_MINUTES_BY_CONCEPT[fromConcept]?.[toConcept] ?? 3;
}
