// src/utils/score.ts
export interface RoundInput {
  contractType: "standard" | "dictator";
  napoleonId: string;
  secretaryId: string; // 若為獨裁制，此欄等於 napoleonId
  extraTricks: number; // 正值表示超吃，負值代表缺少
  playerIds: string[]; // 五位玩家 uid
}

export interface ScoreMap {
  [uid: string]: number;
}

/**
 * 計算一局的各玩家分數。
 * @param input 回合資訊
 */
export function calculateRoundScores(input: RoundInput): ScoreMap {
  const { contractType, napoleonId, secretaryId, extraTricks, playerIds } = input;
  const defenders = playerIds.filter((id) => id !== napoleonId && id !== secretaryId);
  const scores: ScoreMap = {};

  // extraCount: 成功時的超吃張數；missingCount: 失敗時的缺少張數
  const extraCount = Math.max(0, extraTricks);
  const missingCount = Math.max(0, -extraTricks);

  const isDictator = contractType === "dictator" || napoleonId === secretaryId;

  if (!isDictator) {
    // 標準制
    if (extraTricks >= 0) {
      // 成功：成約分 + 超吃分
      scores[napoleonId] = 100 + extraCount * 20;
      scores[secretaryId] = 50 + extraCount * 10;
      defenders.forEach((id) => {
        scores[id] = -50 + extraCount * -10;
      });
    } else {
      // 失敗：倒約分
      scores[napoleonId] = -40 * missingCount;
      scores[secretaryId] = -20 * missingCount;
      defenders.forEach((id) => {
        scores[id] = 20 * missingCount;
      });
    }
  } else {
    // 獨裁制
    if (extraTricks >= 0) {
      // 成功
      scores[napoleonId] = 400 + extraCount * 40;
      defenders.forEach((id) => {
        scores[id] = -100 + extraCount * -10;
      });
    } else {
      // 失敗
      scores[napoleonId] = -40 * missingCount;
      defenders.forEach((id) => {
        scores[id] = 10 * missingCount;
      });
    }
  }

  return scores;
}
