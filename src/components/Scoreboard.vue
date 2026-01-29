<template>
  <div class="scoreboard-container">
    <div class="scoreboard-card">
      <div class="scoreboard-header">
        <h2>歷史牌局記錄</h2>
        <button @click="goToGameSetup" class="btn-primary">建立新牌局</button>
      </div>

      <!-- 總分排行榜 -->
      <div class="leaderboard-section">
        <h3>總分排行榜</h3>
        <div class="leaderboard-table">
          <LeaderboardTable 
            :players="formattedPlayers"
            :currentUserId="authStore.user?.uid"
          />
        </div>
      </div>

      <!-- 當前進行中牌局 -->
      <div v-if="currentGame && currentGame.status === 'ongoing'" class="current-game-section">
        <h3>當前進行中牌局</h3>
        <div class="game-card current">
          <div class="game-info">
            <div class="game-meta">
              <span class="bet-amount">賭注: ${{ currentGame.betAmount }}</span>
              <span class="round-count">回合數: {{ currentRounds.length }}</span>
              <span class="status ongoing">進行中</span>
            </div>
            <div class="game-players">
              <span v-for="playerId in currentGame.players" :key="playerId" class="player-tag">
                {{ getUserName(playerId) }}
              </span>
            </div>
          </div>
          <div class="game-actions">
            <button @click="goToOngoingGame" class="btn-secondary">繼續遊戲</button>
          </div>
        </div>
      </div>

      <!-- 歷史牌局列表 -->
      <div class="history-section">
        <h3>歷史牌局</h3>
        <div v-if="finishedGames.length === 0" class="no-games">
          <p>尚無歷史牌局記錄</p>
        </div>
        <div v-else class="games-list">
          <div
            v-for="game in finishedGames"
            :key="game.id"
            class="game-card finished"
            @click="viewGameDetails(game)"
          >
            <div class="game-info">
              <div class="game-meta">
                <span class="bet-amount">賭注: ${{ game.betAmount }}</span>
                <span class="finished-date">{{ formatDate(game.finishedAt!) }}</span>
                <span class="status finished">已結束</span>
              </div>
              <div class="game-players">
                <span v-for="playerId in game.players" :key="playerId" class="player-tag">
                  {{ getUserName(playerId) }}
                </span>
              </div>
              <div class="game-summary">
                <span class="winner">贏家: {{ getWinnerName(game) }}</span>
                <span class="total-rounds">總回合: {{ getGameRoundsCount(game.id) }}</span>
              </div>
            </div>
            <div class="game-actions">
              <button class="btn-secondary">查看詳情</button>
              <button
                v-if="isAdmin"
                @click.stop="deleteGame(game)"
                class="btn-danger"
                title="刪除牌局"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 牌局詳情對話框 -->
    <div v-if="selectedGame" class="modal-overlay" @click="closeGameDetails">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>牌局詳情</h3>
          <button @click="closeGameDetails" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="game-details">
            <div class="detail-row">
              <span class="label">賭注金額:</span>
              <div class="bet-amount-edit">
                <span v-if="!isEditingBet" class="value">${{ selectedGame.betAmount }}</span>
                <div v-else class="edit-bet-container">
                  <input
                    v-model.number="editingBetAmount"
                    type="number"
                    min="1"
                    class="edit-bet-input"
                    @keyup.enter="saveBetAmount"
                    @keyup.esc="cancelEditBet"
                  />
                  <div class="edit-bet-actions">
                    <button @click="saveBetAmount" class="btn-save" title="儲存">
                      <i class="bi bi-check"></i>
                    </button>
                    <button @click="cancelEditBet" class="btn-cancel" title="取消">
                      <i class="bi bi-x"></i>
                    </button>
                  </div>
                </div>
                <button
                  v-if="isAdmin && !isEditingBet"
                  @click="startEditBet"
                  class="btn-edit-bet"
                  title="編輯賭注金額"
                >
                  <i class="bi bi-pencil"></i>
                </button>
              </div>
            </div>
            <div class="detail-row">
              <span class="label">開始時間:</span>
              <span class="value">{{ formatDateTime(selectedGame.createdAt) }}</span>
            </div>
            <div class="detail-row">
              <span class="label">結束時間:</span>
              <span class="value">{{ formatDateTime(selectedGame.finishedAt!) }}</span>
            </div>
          </div>

          <div class="final-scores">
            <h4>最終分數</h4>
            <div class="scores-grid">
              <div
                v-for="playerId in selectedGame.players"
                :key="playerId"
                class="score-item"
                :class="getScoreClass(selectedGame.scores[playerId])"
              >
                <span class="player-name">{{ getUserName(playerId) }}</span>
                <span class="score">{{ selectedGame.scores[playerId] }}</span>
                <span class="money">{{
                  formatMoney(selectedGame.scores[playerId] * selectedGame.betAmount)
                }}</span>
              </div>
            </div>
          </div>

          <div class="rounds-history">
            <h4>回合記錄</h4>
            <div v-if="selectedGameRounds.length === 0" class="no-rounds">
              <p>尚無回合記錄</p>
            </div>
            <div v-else class="rounds-list">
              <div v-for="(round, index) in selectedGameRounds" :key="round.id" class="round-item">
                <div class="round-header">
                  <span class="round-number">第 {{ selectedGameRounds.length - index }} 回合</span>
                  <span class="round-time">{{ formatTime(round.createdAt) }}</span>
                </div>
                <div class="round-details">
                  <div class="round-info">
                    <span class="label">拿破崙:</span>
                    <span class="value">{{ getUserName(round.napoleonId) }}</span>
                  </div>
                  <div class="round-info">
                    <span class="label">秘書:</span>
                    <span class="value">{{ getUserName(round.secretaryId) }}</span>
                  </div>
                  <div class="round-info">
                    <span class="label">合約:</span>
                    <span class="value">{{
                      round.contractType === "standard" ? "標準" : "獨裁"
                    }}</span>
                  </div>
                  <div class="round-info">
                    <span class="label">額外張數:</span>
                    <span class="value">{{ round.extraTricks }}</span>
                  </div>
                </div>
                <div class="round-scores">
                  <div
                    v-for="playerId in selectedGame.players"
                    :key="playerId"
                    class="round-score-item"
                  >
                    <span class="player-name">{{ getUserName(playerId) }}</span>
                    <span
                      class="score"
                      :class="{
                        positive: round.scores[playerId] > 0,
                        negative: round.scores[playerId] < 0,
                      }"
                    >
                      {{ round.scores[playerId] }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import type { Game, Round } from "@/stores/gameStore";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebase";
import Swal from "sweetalert2";
import LeaderboardTable from "@/components/LeaderboardTable.vue";

const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();

const selectedGame = ref<Game | null>(null);
const selectedGameRounds = ref<Round[]>([]);
const isAdmin = ref(false);
const isEditingBet = ref(false);
const editingBetAmount = ref(0);

const currentGame = computed(() => gameStore.currentGame);
const currentRounds = computed(() => gameStore.currentRounds);
const finishedGames = computed(() => gameStore.finishedGames);

// 計算所有玩家的總分排行榜
const sortedPlayers = computed(() => {
  const playerStats = new Map<string, { uid: string; totalScore: number; totalMoney: number }>();

  // 初始化所有玩家
  gameStore.users.forEach((user) => {
    playerStats.set(user.uid, { uid: user.uid, totalScore: 0, totalMoney: 0 });
  });

  // 計算所有歷史牌局的總分和總金額
  finishedGames.value.forEach((game) => {
    game.players.forEach((playerId) => {
      const stats = playerStats.get(playerId);
      if (stats) {
        stats.totalScore += game.scores[playerId] || 0;
        stats.totalMoney += (game.scores[playerId] || 0) * game.betAmount;
      }
    });
  });

  // 轉換為陣列並排序
  return Array.from(playerStats.values()).sort((a, b) => b.totalScore - a.totalScore);
});

const formattedPlayers = computed(() => {
    return sortedPlayers.value.map(player => ({
        id: player.uid,
        name: getUserName(player.uid),
        totalScore: player.totalScore,
        totalMoney: player.totalMoney
    }));
});

// 儲存每個牌局的回合數
const gameRoundsCount = ref<Map<string, number>>(new Map());

onMounted(async () => {
  if (authStore.user) {
    try {
      await gameStore.loadUsers();
      await gameStore.loadFinishedGames();
      await gameStore.checkUserOngoingGame(authStore.user.uid);

      // 載入所有歷史牌局的回合數
      await loadAllGameRoundsCount();

      // 檢查管理員權限
      const userRole = await authStore.getUserRole();
      isAdmin.value = userRole === "admin";
    } catch (error) {
      console.error("載入資料失敗:", error);
    }
  }
});

// 監聽 finishedGames 變化，重新載入回合數
watch(
  finishedGames,
  async (newFinishedGames) => {
    if (newFinishedGames.length > 0) {
      await loadAllGameRoundsCount();
    }
  },
  { deep: true }
);

// 載入所有歷史牌局的回合數
async function loadAllGameRoundsCount() {
  for (const game of finishedGames.value) {
    try {
      const rounds = await gameStore.loadGameRoundsById(game.id);
      gameRoundsCount.value.set(game.id, rounds.length);
    } catch (error) {
      console.error(`載入牌局 ${game.id} 回合數失敗:`, error);
      gameRoundsCount.value.set(game.id, 0);
    }
  }
}

function getUserName(uid: string): string {
  const user = gameStore.users.find((u) => u.uid === uid);
  return user?.displayName || uid;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function getScoreClass(score: number): string {
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}







function getWinnerName(game: Game): string {
  const winnerId = game.players.reduce((winner, playerId) =>
    game.scores[playerId] > game.scores[winner] ? playerId : winner
  );
  return getUserName(winnerId);
}

function getGameRoundsCount(gameId: string): number {
  return gameRoundsCount.value.get(gameId) || 0;
}

async function viewGameDetails(game: Game) {
  selectedGame.value = game;
  try {
    selectedGameRounds.value = await gameStore.loadGameRoundsById(game.id);
  } catch (error) {
    console.error("載入回合記錄失敗:", error);
    selectedGameRounds.value = [];
  }
}

function closeGameDetails() {
  selectedGame.value = null;
  selectedGameRounds.value = [];
}

function goToGameSetup() {
  router.push("/setup");
}

async function deleteGame(game: Game) {
  const result = await Swal.fire({
    title: "確認刪除",
    text: `確定要刪除這場牌局嗎？此操作無法復原。\n賭注: $${game.betAmount}\n玩家: ${game.players
      .map((id) => getUserName(id))
      .join(", ")}`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "確定刪除",
    cancelButtonText: "取消",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (result.isConfirmed) {
    try {
      await gameStore.deleteGame(game.id);

      Swal.fire({
        title: "刪除成功",
        text: "牌局已成功刪除",
        icon: "success",
        confirmButtonColor: "#667eea",
        customClass: {
          container: "swal-high-z-index",
        },
      });
    } catch (error: any) {
      console.error("刪除遊戲失敗:", error);
      Swal.fire({
        title: "刪除失敗",
        text: error.message || "刪除遊戲時發生錯誤",
        icon: "error",
        confirmButtonColor: "#667eea",
        customClass: {
          container: "swal-high-z-index",
        },
      });
    }
  }
}

function goToOngoingGame() {
  router.push("/ongoing");
}

// 開始編輯賭注金額
function startEditBet() {
  if (selectedGame.value) {
    editingBetAmount.value = selectedGame.value.betAmount;
    isEditingBet.value = true;
  }
}

// 儲存賭注金額
async function saveBetAmount() {
  if (!selectedGame.value || editingBetAmount.value <= 0) {
    return;
  }

  try {
    // 更新遊戲的賭注金額
    await updateGameBetAmount(selectedGame.value.id, editingBetAmount.value);

    // 更新本地狀態
    selectedGame.value.betAmount = editingBetAmount.value;

    // 重新載入遊戲資料以更新排行榜
    await gameStore.loadFinishedGames();

    isEditingBet.value = false;

    Swal.fire({
      title: "更新成功",
      text: `賭注金額已更新為 $${editingBetAmount.value}`,
      icon: "success",
      confirmButtonColor: "#667eea",
      customClass: {
        container: "swal-high-z-index",
      },
    });
  } catch (error: any) {
    console.error("更新賭注金額失敗:", error);
    Swal.fire({
      title: "更新失敗",
      text: error.message || "更新賭注金額時發生錯誤",
      icon: "error",
      confirmButtonColor: "#667eea",
      customClass: {
        container: "swal-high-z-index",
      },
    });
  }
}

// 取消編輯賭注金額
function cancelEditBet() {
  isEditingBet.value = false;
  editingBetAmount.value = 0;
}

// 更新歷史遊戲的賭注金額
async function updateGameBetAmount(gameId: string, newBetAmount: number) {
  try {
    const gameRef = doc(db, "games", gameId);
    await updateDoc(gameRef, {
      betAmount: newBetAmount,
      updatedAt: new Date(),
    });

    console.log("歷史遊戲賭注金額更新成功");
  } catch (error: any) {
    throw new Error(`更新歷史遊戲賭注金額失敗: ${error.message}`);
  }
}
</script>

<style scoped>
.scoreboard-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  overflow-y: auto;
}

.scoreboard-card {
  background: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 1200px;
}

.scoreboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--color-border);
}

.scoreboard-header h2 {
  color: var(--color-heading);
  font-size: 28px;
  margin: 0;
}

.current-game-section,
.history-section {
  margin-bottom: 40px;
}

.current-game-section h3,
.history-section h3 {
  color: var(--color-heading);
  font-size: 20px;
  margin-bottom: 20px;
}

.game-card {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 20px;
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.game-card.current {
  border-color: #28a745;
  background: rgba(40, 167, 69, 0.1);
}

.game-card.finished {
  border-color: var(--color-border);
}

.game-info {
  width: 100%;
  flex: 1;
}

.game-meta {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  align-items: center;
}

.bet-amount,
.round-count,
.finished-date {
  background: var(--color-background);
  color: var(--color-text);
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
}

.status {
  padding: 4px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.status.ongoing {
  background: #28a745;
}

.status.finished {
  background: #6c757d;
}

.game-players {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.player-tag {
  background: white;
  color: #333;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid #e1e5e9;
}

.game-summary {
  display: flex;
  gap: 16px;
  font-size: 14px;
}

.winner {
  color: #28a745;
  font-weight: 600;
}

.total-rounds {
  color: #666;
}

.game-actions {
  display: flex;
  gap: 12px;
}

.no-games {
  text-align: center;
  padding: 40px;
  color: var(--color-text);
  background: var(--color-background-soft);
  border-radius: 8px;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 按鈕樣式 */
.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: var(--color-background-soft);
  color: var(--color-text);
  border: 2px solid var(--color-border);
}

.btn-secondary:hover {
  background: var(--color-border);
  transform: translateY(-2px);
}

.btn-danger {
  background: #dc3545;
  color: white;
  border: 2px solid #dc3545;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.btn-danger:hover {
  background: #c82333;
  border-color: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
}

/* 對話框樣式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--color-background);
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 2px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-heading);
  font-size: 24px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--color-heading);
}

.modal-body {
  padding: 30px;
}

.game-details {
  margin-bottom: 30px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border);
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 600;
  color: #666;
}

.value {
  color: #333;
}

.bet-amount-edit {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-bet-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-bet-input {
  width: 80px;
  padding: 6px 8px;
  border: 2px solid #667eea;
  border-radius: 4px;
  font-size: 14px;
  text-align: center;
  background: var(--color-background);
  color: var(--color-text);
}

.edit-bet-input:focus {
  outline: none;
  border-color: #764ba2;
}

.edit-bet-actions {
  display: flex;
  gap: 4px;
}

.btn-save,
.btn-cancel {
  background: none;
  border: none;
  padding: 4px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: all 0.2s ease;
}

.btn-save {
  color: #28a745;
}

.btn-save:hover {
  background: #d4edda;
}

.btn-cancel {
  color: #dc3545;
}

.btn-cancel:hover {
  background: #f8d7da;
}

.btn-edit-bet {
  background: none;
  border: none;
  color: #667eea;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  transition: all 0.2s ease;
}

.btn-edit-bet:hover {
  background: #f8f9ff;
  color: #764ba2;
}

.final-scores {
  margin-bottom: 30px;
}

.final-scores h4 {
  margin: 0 0 16px 0;
  color: var(--color-heading);
  font-size: 18px;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
}

.score-item.positive {
  border-color: #28a745;
  background: #d4edda;
}

.score-item.negative {
  border-color: #dc3545;
  background: #f8d7da;
}

.score-item.neutral {
  border-color: var(--color-border);
  background: var(--color-background-soft);
}

.score-item .player-name {
  font-weight: 600;
  color: var(--color-text);
}

.score-item .score {
  color: var(--color-text);
  font-weight: bold;
  font-size: 16px;
}

.score-item .money {
  font-size: 16px;
  color: #666;
}

.rounds-history h4 {
  margin: 0 0 16px 0;
  color: var(--color-heading);
  font-size: 18px;
}

.no-rounds {
  text-align: center;
  padding: 20px;
  color: var(--color-text);
  background: var(--color-background-soft);
  border-radius: 8px;
}

.rounds-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.round-item {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--color-border);
}

.round-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--color-border);
}

.round-number {
  font-weight: 600;
  color: var(--color-text);
  font-size: 14px;
}

.round-time {
  color: #666;
  font-size: 12px;
}

.round-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.round-info {
  display: flex;
  gap: 4px;
  font-size: 12px;
}

.round-info .label {
  font-weight: 500;
  color: #666;
}

.round-info .value {
  color: var(--color-text);
}

.round-scores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 6px;
}

.round-score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  align-items: center;
  padding: 6px 8px;
  background: var(--color-background);
  border-radius: 4px;
  border: 1px solid var(--color-border);
  font-size: 12px;
}

.round-score-item .player-name {
  font-weight: 500;
  color: var(--color-text);
}

.round-score-item .score {
  font-weight: 600;
}

.round-score-item .score.positive {
  color: #28a745;
}

.round-score-item .score.negative {
  color: #dc3545;
}

/* Leaderboard Styles */
.leaderboard-section {
  margin-bottom: 40px;
}

.leaderboard-section h3 {
  color: var(--color-heading);
  font-size: 20px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .scoreboard-container {
    padding: 10px;
  }

  .scoreboard-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .scoreboard-header {
    flex-direction: row;
    gap: 16px;
    text-align: left;
  }

  .scoreboard-header h2 {
    font-size: 22px;
    white-space: nowrap;
  }

  .btn-primary {
    padding: 12px 16px;
    font-size: 14px;
    white-space: nowrap;
    min-width: auto;
  }

  .game-card {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
    padding: 20px;
  }

  .game-meta {
    flex-wrap: wrap;
    gap: 10px;
    justify-content: space-between;
  }

  .game-actions {
    width: 100%;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    padding: 16px 24px;
    font-size: 16px;
  }

  .modal-content {
    margin: 20px;
    max-width: calc(100vw - 40px);
    max-height: 90vh;
  }

  .modal-header,
  .modal-body {
    padding: 20px;
  }

  .scores-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .score-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    text-align: center;
  }

  .score-item .player-name {
    font-size: 14px;
    margin-bottom: 4px;
  }

  .score-item .score {
    font-size: 18px;
    margin-bottom: 2px;
  }

  .score-item .money {
    font-size: 12px;
  }

  .round-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .round-details .round-info:nth-child(1) {
    grid-column: 1;
    grid-row: 1;
  }

  .round-details .round-info:nth-child(2) {
    grid-column: 1;
    grid-row: 2;
  }

  .round-details .round-info:nth-child(3) {
    grid-column: 2;
    grid-row: 1;
  }

  .round-details .round-info:nth-child(4) {
    grid-column: 2;
    grid-row: 2;
  }

  .game-info {
    flex-direction: column;
    gap: 8px;
  }

  .game-info .label {
    font-size: 12px;
  }

  .game-info .value {
    font-size: 14px;
  }
}
</style>
