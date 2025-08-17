// src/utils/score.ts
export interface RoundInput {
  contractType: "standard" | "dictator";
  napoleonId: string;
  secretaryId: string; // 若為獨裁制，此欄等於 napoleonId
  extraTricks: number; // 正值表示超吃，負值代表缺少
  playerIds: string[]; // 四位或五位玩家 uid
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
  const isFourPlayer = playerIds.length === 4;
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
      if (isFourPlayer) {
        // 四人模式：拿破崙 +100，秘書 +50，2個防家各 -75
        scores[napoleonId] = 100 + extraCount * 20;
        scores[secretaryId] = 50 + extraCount * 10;
        defenders.forEach((id) => {
          scores[id] = -75 + extraCount * -15;
        });
      } else {
        // 五人模式：拿破崙 +100，秘書 +50，3個防家各 -50
        scores[napoleonId] = 100 + extraCount * 20;
        scores[secretaryId] = 50 + extraCount * 10;
        defenders.forEach((id) => {
          scores[id] = -50 + extraCount * -10;
        });
      }
    } else {
      // 失敗：倒約分
      if (isFourPlayer) {
        // 四人模式：拿破崙 -40×缺少張數，秘書 -20×缺少張數，2個防家各 +30×缺少張數
        scores[napoleonId] = -40 * missingCount;
        scores[secretaryId] = -20 * missingCount;
        defenders.forEach((id) => {
          scores[id] = 30 * missingCount;
        });
      } else {
        // 五人模式：拿破崙 -40×缺少張數，秘書 -20×缺少張數，3個防家各 +20×缺少張數
        scores[napoleonId] = -40 * missingCount;
        scores[secretaryId] = -20 * missingCount;
        defenders.forEach((id) => {
          scores[id] = 20 * missingCount;
        });
      }
    }
  } else {
    // 獨裁制
    if (extraTricks >= 0) {
      // 成功
      if (isFourPlayer) {
        // 四人模式：拿破崙 +300，3個防家各 -100
        scores[napoleonId] = 300 + extraCount * 30;
        defenders.forEach((id) => {
          scores[id] = -100 + extraCount * -10;
        });
      } else {
        // 五人模式：拿破崙 +400，4個防家各 -100
        scores[napoleonId] = 400 + extraCount * 40;
        defenders.forEach((id) => {
          scores[id] = -100 + extraCount * -10;
        });
      }
    } else {
      // 失敗
      if (isFourPlayer) {
        // 四人模式：拿破崙 -45×缺少張數，3個防家各 +15×缺少張數
        scores[napoleonId] = -45 * missingCount;
        defenders.forEach((id) => {
          scores[id] = 15 * missingCount;
        });
      } else {
        // 五人模式：拿破崙 -40×缺少張數，4個防家各 +10×缺少張數
        scores[napoleonId] = -40 * missingCount;
        defenders.forEach((id) => {
          scores[id] = 10 * missingCount;
        });
      }
    }
  }

  return scores;
}
