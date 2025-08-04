// src/stores/gameStore.ts
import { defineStore } from "pinia";
import { db } from "@/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { ref, computed } from "vue";
import { calculateRoundScores } from "@/utils/score";
import type { ScoreMap } from "@/utils/score";

export interface Game {
  id: string;
  hostId: string;
  players: string[];
  betAmount: number;
  scores: Record<string, number>;
  status: "ongoing" | "finished";
  createdAt: Date;
  finishedAt?: Date;
}

export interface Round {
  id: string;
  napoleonId: string;
  secretaryId: string;
  contractType: "standard" | "dictator";
  extraTricks: number;
  scores: Record<string, number>;
  createdAt: Date;
}

export const useGameStore = defineStore("game", () => {
  const currentGame = ref<Game | null>(null);
  const currentRounds = ref<Round[]>([]);
  const users = ref<Array<{ uid: string; displayName: string; email: string; role: string }>>([]);
  const finishedGames = ref<Game[]>([]);
  const loading = ref(false);

  // 檢查用戶是否有進行中的場次
  async function checkUserOngoingGame(userId: string): Promise<Game | null> {
    try {
      loading.value = true;
      const gamesRef = collection(db, "games");
      const q = query(
        gamesRef,
        where("players", "array-contains", userId),
        where("status", "==", "ongoing")
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const gameDoc = querySnapshot.docs[0];
        const gameData = gameDoc.data();
        const game: Game = {
          id: gameDoc.id,
          hostId: gameData.hostId,
          players: gameData.players,
          betAmount: gameData.betAmount,
          scores: gameData.scores,
          status: gameData.status,
          createdAt: gameData.createdAt.toDate(),
        };

        currentGame.value = game;
        await loadGameRounds(game.id);
        return game;
      }
      return null;
    } catch (error: any) {
      throw new Error(`檢查進行中場次失敗: ${error.message}`);
    } finally {
      loading.value = false;
    }
  }

  // 載入場次的回合記錄
  async function loadGameRounds(gameId: string) {
    try {
      const roundsRef = collection(db, "games", gameId, "rounds");
      const q = query(roundsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      currentRounds.value = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          napoleonId: data.napoleonId,
          secretaryId: data.secretaryId,
          contractType: data.contractType,
          extraTricks: data.extraTricks,
          scores: data.scores,
          createdAt: data.createdAt.toDate(),
        };
      });
    } catch (error: any) {
      throw new Error(`載入回合記錄失敗: ${error.message}`);
    }
  }

  async function createGame(playerIds: string[], betAmount: number) {
    try {
      if (playerIds.length !== 5) throw new Error("必須選擇五位玩家");
      const scores: Record<string, number> = {};
      playerIds.forEach((id) => (scores[id] = 0));
      const gameDoc = await addDoc(collection(db, "games"), {
        hostId: playerIds[0], // 例如第一位為開局者
        players: playerIds,
        betAmount,
        scores,
        status: "ongoing",
        createdAt: new Date(),
      });
      currentGame.value = {
        id: gameDoc.id,
        hostId: playerIds[0],
        players: playerIds,
        betAmount,
        scores,
        status: "ongoing",
        createdAt: new Date(),
      };
      currentRounds.value = [];
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async function addRound(input: {
    napoleonId: string;
    secretaryId: string;
    contractType: "standard" | "dictator";
    extraTricks: number;
  }) {
    if (!currentGame.value) throw new Error("尚未建立牌局");
    const { id, players, betAmount } = currentGame.value;

    // 計算分數
    const roundScores = calculateRoundScores({
      ...input,
      playerIds: players,
    });

    // 在 rounds 子集合新增回合
    const roundDoc = await addDoc(collection(db, "games", id, "rounds"), {
      ...input,
      scores: roundScores,
      createdAt: new Date(),
    });

    // 更新 games 文件的總分
    const gameRef = doc(db, "games", id);
    const updates: any = {};
    for (const uid in roundScores) {
      updates[`scores.${uid}`] = increment(roundScores[uid]);
    }
    await updateDoc(gameRef, updates);

    // 更新 local state
    for (const uid in roundScores) {
      currentGame.value!.scores[uid] += roundScores[uid];
    }

    // 添加新回合到本地狀態
    const newRound: Round = {
      id: roundDoc.id,
      napoleonId: input.napoleonId,
      secretaryId: input.secretaryId,
      contractType: input.contractType,
      extraTricks: input.extraTricks,
      scores: roundScores,
      createdAt: new Date(),
    };
    currentRounds.value.push(newRound);
  }

  async function loadUsers() {
    try {
      console.log("開始載入用戶資料...");
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: data.uid || doc.id,
          displayName: data.displayName || "未知用戶",
          email: data.email || "",
          role: data.role || "user",
        } as { uid: string; displayName: string; email: string; role: string };
      });

      users.value = usersData;
      console.log(`成功載入 ${users.value.length} 個用戶資料`);
    } catch (error: any) {
      console.error("載入用戶資料失敗:", error);
      throw new Error(`載入用戶資料失敗: ${error.message}`);
    }
  }

  // 結束牌局
  async function finishGame() {
    if (!currentGame.value) throw new Error("尚未建立牌局");

    try {
      const gameRef = doc(db, "games", currentGame.value.id);
      await updateDoc(gameRef, {
        status: "finished",
        finishedAt: new Date(),
      });

      // 將結束的牌局添加到歷史記錄
      const finishedGame = {
        ...currentGame.value,
        status: "finished" as const,
        finishedAt: new Date(),
      };
      finishedGames.value.unshift(finishedGame);

      // 清空當前遊戲狀態
      currentGame.value = null;
      currentRounds.value = [];

      return finishedGame;
    } catch (error: any) {
      throw new Error(`結束牌局失敗: ${error.message}`);
    }
  }

  // 載入歷史牌局
  async function loadFinishedGames() {
    try {
      const gamesRef = collection(db, "games");
      const q = query(gamesRef, where("status", "==", "finished"), orderBy("finishedAt", "desc"));

      const querySnapshot = await getDocs(q);
      finishedGames.value = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          hostId: data.hostId,
          players: data.players,
          betAmount: data.betAmount,
          scores: data.scores,
          status: data.status,
          createdAt: data.createdAt.toDate(),
          finishedAt: data.finishedAt?.toDate(),
        };
      });
    } catch (error: any) {
      throw new Error(`載入歷史牌局失敗: ${error.message}`);
    }
  }

  // 載入特定牌局的回合記錄
  async function loadGameRoundsById(gameId: string) {
    try {
      const roundsRef = collection(db, "games", gameId, "rounds");
      const q = query(roundsRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          napoleonId: data.napoleonId,
          secretaryId: data.secretaryId,
          contractType: data.contractType,
          extraTricks: data.extraTricks,
          scores: data.scores,
          createdAt: data.createdAt.toDate(),
        };
      });
    } catch (error: any) {
      throw new Error(`載入回合記錄失敗: ${error.message}`);
    }
  }

  // 更新回合記錄（管理員功能）
  async function updateRound(
    roundId: string,
    updates: {
      napoleonId: string;
      secretaryId: string;
      contractType: "standard" | "dictator";
      extraTricks: number;
    }
  ) {
    if (!currentGame.value) throw new Error("尚未建立牌局");

    try {
      // 重新計算分數
      const newScores = calculateRoundScores({
        ...updates,
        playerIds: currentGame.value.players,
      });

      // 更新回合記錄
      const roundRef = doc(db, "games", currentGame.value.id, "rounds", roundId);
      await updateDoc(roundRef, {
        ...updates,
        scores: newScores,
        updatedAt: new Date(),
      });

      // 重新載入回合記錄
      await loadGameRounds(currentGame.value.id);

      // 重新計算總分
      await recalculateTotalScores();

      console.log("回合更新成功");
    } catch (error: any) {
      throw new Error(`更新回合失敗: ${error.message}`);
    }
  }

  // 刪除回合記錄（管理員功能）
  async function deleteRound(roundId: string) {
    if (!currentGame.value) throw new Error("尚未建立牌局");

    try {
      // 刪除回合記錄
      const roundRef = doc(db, "games", currentGame.value.id, "rounds", roundId);
      await deleteDoc(roundRef);

      // 重新載入回合記錄
      await loadGameRounds(currentGame.value.id);

      // 重新計算總分
      await recalculateTotalScores();

      console.log("回合刪除成功");
    } catch (error: any) {
      throw new Error(`刪除回合失敗: ${error.message}`);
    }
  }

  // 更新賭注金額（管理員功能）
  async function updateBetAmount(newBetAmount: number) {
    if (!currentGame.value) throw new Error("尚未建立牌局");

    try {
      const gameRef = doc(db, "games", currentGame.value.id);
      await updateDoc(gameRef, {
        betAmount: newBetAmount,
        updatedAt: new Date(),
      });

      // 更新本地狀態
      currentGame.value.betAmount = newBetAmount;

      console.log("賭注金額更新成功");
    } catch (error: any) {
      throw new Error(`更新賭注金額失敗: ${error.message}`);
    }
  }

  // 重新計算總分
  async function recalculateTotalScores() {
    if (!currentGame.value) return;

    try {
      // 重新載入所有回合記錄
      await loadGameRounds(currentGame.value.id);

      // 重新計算總分
      const newScores: Record<string, number> = {};
      currentGame.value.players.forEach((playerId) => {
        newScores[playerId] = 0;
      });

      // 累加所有回合的分數
      currentRounds.value.forEach((round) => {
        Object.keys(round.scores).forEach((playerId) => {
          newScores[playerId] += round.scores[playerId];
        });
      });

      // 更新遊戲總分
      const gameRef = doc(db, "games", currentGame.value.id);
      await updateDoc(gameRef, {
        scores: newScores,
        updatedAt: new Date(),
      });

      // 更新本地狀態
      currentGame.value.scores = newScores;

      console.log("總分重新計算成功");
    } catch (error: any) {
      throw new Error(`重新計算總分失敗: ${error.message}`);
    }
  }

  const monetaryResults = computed(() => {
    if (!currentGame.value) return {} as Record<string, number>;
    const result: Record<string, number> = {};
    currentGame.value.players.forEach((uid) => {
      result[uid] = currentGame.value!.scores[uid] * currentGame.value!.betAmount;
    });
    return result;
  });

  // 刪除歷史牌局（僅管理員可用）
  async function deleteGame(gameId: string) {
    try {
      // 首先刪除該遊戲的所有回合記錄
      const roundsRef = collection(db, "games", gameId, "rounds");
      const roundsSnapshot = await getDocs(roundsRef);

      // 批量刪除回合記錄
      const deletePromises = roundsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // 刪除遊戲本身
      const gameRef = doc(db, "games", gameId);
      await deleteDoc(gameRef);

      // 從本地狀態中移除該遊戲
      finishedGames.value = finishedGames.value.filter((game) => game.id !== gameId);

      console.log("遊戲刪除成功");
    } catch (error: any) {
      throw new Error(`刪除遊戲失敗: ${error.message}`);
    }
  }

  // 更新用戶顯示名稱（僅管理員可用）
  async function updateUserDisplayName(userId: string, newDisplayName: string) {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        displayName: newDisplayName,
        updatedAt: new Date(),
      });

      // 更新本地狀態
      const userIndex = users.value.findIndex((u) => u.uid === userId);
      if (userIndex !== -1) {
        users.value[userIndex].displayName = newDisplayName;
      }

      console.log("用戶顯示名稱更新成功");
    } catch (error: any) {
      throw new Error(`更新用戶顯示名稱失敗: ${error.message}`);
    }
  }

  // 刪除用戶（僅管理員可用）
  async function deleteUser(userId: string) {
    try {
      // 檢查用戶是否參與任何進行中的遊戲
      const gamesRef = collection(db, "games");
      const ongoingGamesQuery = query(
        gamesRef,
        where("players", "array-contains", userId),
        where("status", "==", "ongoing")
      );
      const ongoingGamesSnapshot = await getDocs(ongoingGamesQuery);

      if (!ongoingGamesSnapshot.empty) {
        throw new Error("無法刪除參與進行中遊戲的用戶");
      }

      // 只刪除用戶資料，保留所有遊戲和回合記錄
      const userRef = doc(db, "users", userId);
      await deleteDoc(userRef);

      // 從本地狀態中移除用戶
      users.value = users.value.filter((u) => u.uid !== userId);

      console.log("用戶刪除成功（遊戲和回合記錄已保留）");
    } catch (error: any) {
      throw new Error(`刪除用戶失敗: ${error.message}`);
    }
  }

  return {
    currentGame,
    currentRounds,
    users,
    finishedGames,
    loading,
    createGame,
    addRound,
    loadUsers,
    checkUserOngoingGame,
    loadGameRounds,
    finishGame,
    loadFinishedGames,
    loadGameRoundsById,
    updateRound,
    deleteRound,
    updateBetAmount,
    recalculateTotalScores,
    deleteGame,
    updateUserDisplayName,
    deleteUser,
    monetaryResults,
  };
});
