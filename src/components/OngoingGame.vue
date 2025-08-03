<template>
  <div class="ongoing-game-container">
    <!-- 沒有進行中牌局時顯示開新牌局按鈕 -->
    <div v-if="!gameStore.currentGame" class="no-game-container">
      <div class="no-game-card">
        <h2>目前沒有進行中的牌局</h2>
        <p>開始一場新的拿破崙牌局吧！</p>
        <button @click="goToGameSetup" class="btn btn-primary">開新牌局</button>
      </div>
    </div>

    <!-- 有進行中牌局時顯示遊戲內容 -->
    <div v-else class="game-info-card">
      <div class="game-header">
        <h2>進行中的牌局</h2>
        <div class="game-meta">
          <div class="bet-amount-container">
            <span class="bet-amount">賭注: ${{ gameStore.currentGame?.betAmount }}</span>
            <button
              v-if="isAdmin"
              @click="startEditBetAmount"
              class="edit-btn"
              title="編輯賭注金額"
            >
              <i class="bi bi-pencil"></i>
            </button>
          </div>
          <span class="round-count">回合數: {{ gameStore.currentRounds.length }}</span>
        </div>
      </div>

      <!-- 編輯賭注金額對話框 -->
      <div v-if="editingBetAmount" class="modal-overlay" @click="cancelEditBetAmount">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>編輯賭注金額</h3>
            <button @click="cancelEditBetAmount" class="close-btn">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label for="new-bet-amount">新的賭注金額：</label>
              <input
                id="new-bet-amount"
                v-model.number="newBetAmount"
                type="number"
                class="form-input"
                placeholder="請輸入新的賭注金額"
                min="1"
              />
            </div>
            <div class="modal-actions">
              <button @click="cancelEditBetAmount" class="btn-secondary">取消</button>
              <button @click="saveEditBetAmount" class="btn-primary" :disabled="loading">
                {{ loading ? "更新中..." : "更新" }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 玩家列表和當前分數 -->
      <div class="players-section">
        <h3>玩家分數</h3>
        <div class="players-grid">
          <div
            v-for="playerId in gameStore.currentGame?.players"
            :key="playerId"
            class="player-card"
          >
            <div class="player-name">{{ getUserName(playerId) }}</div>
            <div
              class="player-score"
              :class="{
                positive: (gameStore.currentGame?.scores[playerId] || 0) > 0,
                negative: (gameStore.currentGame?.scores[playerId] || 0) < 0,
              }"
            >
              {{ gameStore.currentGame?.scores[playerId] || 0 }}
            </div>
            <div class="player-money">
              ${{
                (gameStore.currentGame?.scores[playerId] || 0) *
                (gameStore.currentGame?.betAmount || 0)
              }}
            </div>
          </div>
        </div>
      </div>

      <!-- 新增回合表單 -->
      <div class="round-input-section">
        <h3>新增回合</h3>
        <form @submit.prevent="submitRound" class="round-form">
          <div class="form-row">
            <div class="form-group">
              <label>拿破崙：</label>
              <select v-model="napoleonId" class="form-select" required>
                <option value="">請選擇拿破崙</option>
                <option v-for="uid in gameStore.currentGame?.players" :key="uid" :value="uid">
                  {{ getUserName(uid) }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>秘書：</label>
              <select v-model="secretaryId" class="form-select" required>
                <option value="">請選擇秘書</option>
                <option value="none">無（獨裁制）</option>
                <option v-for="uid in availableSecretaries" :key="uid" :value="uid">
                  {{ getUserName(uid) }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="dynamic-label" @click="toggleTricksType">
                <span class="label-text"
                  >{{ isExtraTricks ? "超吃張數" : "缺少張數" }} <i class="bi bi-arrow-repeat"></i
                ></span>
              </label>
              <input
                type="number"
                v-model.number="extraTricks"
                class="form-input"
                :placeholder="isExtraTricks ? '0-7 張' : '0-16 張'"
                :min="0"
                :max="isExtraTricks ? 7 : 16"
                required
              />
            </div>
          </div>

          <div class="score-preview" v-if="canPreview">
            <h4>分數預覽</h4>
            <div class="score-grid">
              <div
                v-for="uid in gameStore.currentGame?.players"
                :key="uid"
                class="score-item"
                :class="getScoreClass(uid)"
              >
                <span class="player-name">{{ getUserName(uid) }}</span>
                <span class="score-value">{{ previewScores[uid] || 0 }}</span>
              </div>
            </div>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="!canSubmit || loading">
            {{ loading ? "送出中..." : "送出本局" }}
          </button>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>
        </form>
      </div>

      <!-- 回合記錄 -->
      <div class="rounds-section">
        <h3>回合記錄</h3>
        <div v-if="gameStore.currentRounds.length === 0" class="no-rounds">
          <p>尚未有任何回合記錄</p>
        </div>
        <div v-else class="rounds-list">
          <div v-for="(round, index) in gameStore.currentRounds" :key="round.id" class="round-item">
            <div class="round-header">
              <span class="round-number">第 {{ gameStore.currentRounds.length - index }} 回合</span>
              <div class="round-actions">
                <span class="round-time">{{ formatTime(round.createdAt) }}</span>
                <div v-if="isAdmin" class="admin-actions">
                  <button
                    @click="startEditRound(round)"
                    class="action-btn edit-btn"
                    title="編輯回合"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    @click="deleteRound(round.id)"
                    class="action-btn delete-btn"
                    title="刪除回合"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- 編輯模式 -->
            <div v-if="editingRound === round.id" class="round-edit-form">
              <div class="edit-form-row">
                <div class="form-group">
                  <label>拿破崙：</label>
                  <select v-model="editRoundData.napoleonId" class="form-select" required>
                    <option value="">請選擇拿破崙</option>
                    <option v-for="uid in gameStore.currentGame?.players" :key="uid" :value="uid">
                      {{ getUserName(uid) }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>秘書：</label>
                  <select v-model="editRoundData.secretaryId" class="form-select" required>
                    <option value="">請選擇秘書</option>
                    <option value="none">無（獨裁制）</option>
                    <option v-for="uid in editAvailableSecretaries" :key="uid" :value="uid">
                      {{ getUserName(uid) }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>額外張數：</label>
                  <input
                    type="number"
                    v-model.number="editRoundData.extraTricks"
                    class="form-input"
                    placeholder="-16 到 +7 張"
                    min="-16"
                    max="7"
                    required
                  />
                </div>
              </div>

              <div class="edit-actions">
                <button @click="cancelEditRound" class="btn-secondary">取消</button>
                <button @click="saveEditRound(round.id)" class="btn-primary" :disabled="loading">
                  {{ loading ? "保存中..." : "保存" }}
                </button>
              </div>
            </div>

            <!-- 顯示模式 -->
            <div v-else>
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
                  v-for="playerId in gameStore.currentGame?.players"
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

      <!-- 操作按鈕 -->
      <div class="actions">
        <button @click="openFinishGameConfirm" class="btn btn-danger" :disabled="loading">
          {{ loading ? "處理中..." : "結束牌局" }}
        </button>
        <button @click="goToScoreboard" class="btn btn-secondary">查看歷史戰績</button>
      </div>
    </div>

    <!-- 確認對話框 -->
    <!-- Removed ConfirmDialog component -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { calculateRoundScores } from "@/utils/score";
import Swal from "sweetalert2";

const router = useRouter();
const gameStore = useGameStore();
const authStore = useAuthStore();

// 新增回合相關的響應式變數
const napoleonId = ref<string>("");
const secretaryId = ref<string>("");
const extraTricks = ref(0);
const isExtraTricks = ref(true); // true: 超吃張數, false: 缺少張數
const error = ref("");
const loading = ref(false);

// 管理員功能相關的響應式變數
const editingRound = ref<string | null>(null);
const editingBetAmount = ref(false);
const newBetAmount = ref(0);
const editRoundData = ref({
  napoleonId: "",
  secretaryId: "",
  contractType: "standard" as "standard" | "dictator",
  extraTricks: 0,
});

// 確認對話框狀態
// const showFinishGameConfirm = ref(false); // Removed as per edit hint

onMounted(async () => {
  if (authStore.user) {
    try {
      // 先載入用戶資料
      await gameStore.loadUsers();
      // 再檢查進行中場次
      await gameStore.checkUserOngoingGame(authStore.user.uid);
    } catch (error) {
      console.error("載入進行中場次失敗:", error);
    }
  }
});

// 監聽拿破崙選擇變化，如果秘書選擇的是被扣除的玩家，就清空秘書選擇
watch(napoleonId, (newNapoleonId) => {
  if (newNapoleonId && secretaryId.value === newNapoleonId) {
    secretaryId.value = "";
  }
});

// 監聽編輯時的拿破崙選擇變化
watch(
  () => editRoundData.value.napoleonId,
  (newNapoleonId) => {
    if (newNapoleonId && editRoundData.value.secretaryId === newNapoleonId) {
      editRoundData.value.secretaryId = "";
    }
  }
);

// 新增回合相關的計算屬性
const canSubmit = computed(() => {
  if (!gameStore.currentGame) return false;
  if (!napoleonId.value) return false;
  if (!secretaryId.value) return false;

  // 驗證額外張數範圍
  if (isExtraTricks.value) {
    // 超吃張數：0-7
    if (extraTricks.value < 0 || extraTricks.value > 7) return false;
  } else {
    // 缺少張數：0-16（會自動轉為負數）
    if (extraTricks.value < 0 || extraTricks.value > 16) return false;
  }

  return true;
});

const canPreview = computed(() => {
  return canSubmit.value && extraTricks.value !== 0;
});

const availableSecretaries = computed(() => {
  if (!gameStore.currentGame?.players) return [];

  // 如果拿破崙還沒選擇，返回所有玩家
  if (!napoleonId.value) return gameStore.currentGame.players;

  // 扣除拿破崙已選擇的玩家
  return gameStore.currentGame.players.filter((uid) => uid !== napoleonId.value);
});

// 檢查是否為管理員
const isAdmin = computed(() => {
  if (!authStore.user) return false;

  // 從 gameStore 的 users 中查找當前用戶的角色
  const currentUser = gameStore.users.find((u) => u.uid === authStore.user?.uid);
  return currentUser?.role === "admin";
});

// 編輯時可選的秘書列表
const editAvailableSecretaries = computed(() => {
  if (!gameStore.currentGame?.players) return [];

  // 如果拿破崙還沒選擇，返回所有玩家
  if (!editRoundData.value.napoleonId) return gameStore.currentGame.players;

  // 扣除拿破崙已選擇的玩家
  return gameStore.currentGame.players.filter((uid) => uid !== editRoundData.value.napoleonId);
});

const previewScores = computed(() => {
  if (!canPreview.value || !gameStore.currentGame) return {};

  // 判斷是否為獨裁制
  const isDictator = secretaryId.value === "none";
  const secId = isDictator ? napoleonId.value : secretaryId.value;

  // 計算實際的 extraTricks 值
  let actualExtraTricks = extraTricks.value;
  if (!isExtraTricks.value) {
    actualExtraTricks = -Math.abs(extraTricks.value);
  }

  try {
    return calculateRoundScores({
      contractType: isDictator ? "dictator" : "standard",
      napoleonId: napoleonId.value,
      secretaryId: secId,
      extraTricks: actualExtraTricks,
      playerIds: gameStore.currentGame.players,
    });
  } catch {
    return {};
  }
});

function toggleTricksType() {
  isExtraTricks.value = !isExtraTricks.value;
  // 切換時重置輸入值
  extraTricks.value = 0;
}

function getUserName(userId: string): string {
  const user = gameStore.users.find((u) => u.uid === userId);
  return user?.displayName || userId;
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getScoreClass(uid: string) {
  const score = previewScores.value[uid] || 0;
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

async function submitRound() {
  const result = await Swal.fire({
    title: "確認送出本局",
    text: "您確定要送出本局結果嗎？送出後將無法修改。",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "送出本局",
    cancelButtonText: "取消",
    confirmButtonColor: "#ffc107",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (!result.isConfirmed) {
    return;
  }

  error.value = "";
  if (!gameStore.currentGame) return;

  loading.value = true;
  try {
    // 判斷是否為獨裁制
    const isDictator = secretaryId.value === "none";
    const secId = isDictator ? napoleonId.value : secretaryId.value;

    // 根據當前模式調整 extraTricks 的值
    let finalExtraTricks = extraTricks.value;
    if (!isExtraTricks.value) {
      // 如果是缺少張數模式，自動加上負號
      finalExtraTricks = -Math.abs(extraTricks.value);
    }

    await gameStore.addRound({
      napoleonId: napoleonId.value,
      secretaryId: secId,
      contractType: isDictator ? "dictator" : "standard",
      extraTricks: finalExtraTricks,
    });

    // 重置表單
    napoleonId.value = "";
    secretaryId.value = "";
    extraTricks.value = 0;
    error.value = "";

    console.log("回合新增成功");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function openFinishGameConfirm() {
  const result = await Swal.fire({
    title: "確認結束牌局",
    text: "您確定要結束這場牌局嗎？結束後將無法恢復。",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "結束牌局",
    cancelButtonText: "取消",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (result.isConfirmed) {
    await finishGame();
  }
}

async function finishGame() {
  if (!gameStore.currentGame) return;

  loading.value = true;
  try {
    await gameStore.finishGame();
    router.push("/scoreboard");
    console.log("牌局結束成功");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

function goToScoreboard() {
  router.push("/scoreboard");
}

function goToGameSetup() {
  router.push("/setup");
}

// 管理員功能：開始編輯回合
function startEditRound(round: any) {
  editingRound.value = round.id;

  // 判斷是否為獨裁制（拿破崙和秘書是同一個人）
  const isDictator = round.napoleonId === round.secretaryId;

  editRoundData.value = {
    napoleonId: round.napoleonId,
    secretaryId: isDictator ? "none" : round.secretaryId, // 如果是獨裁制，設為 "none"
    contractType: round.contractType,
    extraTricks: round.extraTricks,
  };
}

// 管理員功能：取消編輯回合
function cancelEditRound() {
  editingRound.value = null;
  editRoundData.value = {
    napoleonId: "",
    secretaryId: "",
    contractType: "standard",
    extraTricks: 0,
  };
}

// 管理員功能：保存編輯回合
async function saveEditRound(roundId: string) {
  loading.value = true;
  try {
    // 判斷是否為獨裁制
    const isDictator = editRoundData.value.secretaryId === "none";
    const secId = isDictator ? editRoundData.value.napoleonId : editRoundData.value.secretaryId;

    await gameStore.updateRound(roundId, {
      napoleonId: editRoundData.value.napoleonId,
      secretaryId: secId,
      contractType: isDictator ? "dictator" : "standard",
      extraTricks: editRoundData.value.extraTricks,
    });

    editingRound.value = null;
    console.log("回合更新成功");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

// 管理員功能：刪除回合
async function deleteRound(roundId: string) {
  const result = await Swal.fire({
    title: "確認刪除回合",
    text: "您確定要刪除這個回合嗎？此操作無法復原。",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "刪除",
    cancelButtonText: "取消",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (!result.isConfirmed) return;

  loading.value = true;
  try {
    await gameStore.deleteRound(roundId);
    console.log("回合刪除成功");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

// 管理員功能：開始編輯賭注金額
function startEditBetAmount() {
  newBetAmount.value = gameStore.currentGame?.betAmount || 0;
  editingBetAmount.value = true;
}

// 管理員功能：取消編輯賭注金額
function cancelEditBetAmount() {
  editingBetAmount.value = false;
  newBetAmount.value = 0;
}

// 管理員功能：保存編輯賭注金額
async function saveEditBetAmount() {
  loading.value = true;
  try {
    await gameStore.updateBetAmount(newBetAmount.value);
    editingBetAmount.value = false;
    console.log("賭注金額更新成功");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.ongoing-game-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  overflow-y: auto;
}

.no-game-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}

.no-game-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.no-game-card h2 {
  color: #333;
  font-size: 28px;
  margin-bottom: 15px;
}

.no-game-card p {
  color: #666;
  font-size: 18px;
  margin-bottom: 30px;
}

.game-info-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 1200px;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e1e5e9;
}

.game-header h2 {
  color: #333;
  font-size: 28px;
  margin: 0;
}

.game-meta {
  display: flex;
  gap: 20px;
}

.bet-amount,
.round-count {
  background: #e3f2fd;
  color: #1976d2;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 14px;
}

.bet-amount-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.edit-btn {
  background: none;
  border: none;
  color: #1976d2;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.edit-btn:hover {
  background: rgba(25, 118, 210, 0.1);
}

.players-section {
  margin-bottom: 40px;
}

.players-section h3 {
  color: #333;
  font-size: 20px;
  margin-bottom: 20px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.player-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  border: 2px solid #e1e5e9;
}

.player-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.player-score {
  color: #999;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.player-score.positive {
  color: #28a745;
}

.player-score.negative {
  color: #dc3545;
}

.player-money {
  font-size: 14px;
  color: #666;
}

/* 新增回合表單樣式 */
.round-input-section {
  margin-bottom: 40px;
  padding: 30px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 2px solid #e1e5e9;
}

.round-input-section h3 {
  color: #333;
  font-size: 20px;
  margin-bottom: 20px;
}

.round-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.dynamic-label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.3s ease;
}

.dynamic-label:hover {
  color: #667eea;
}

.dynamic-label .label-text {
  flex: 1;
}

.dynamic-label i {
  font-size: 12px;
  opacity: 0.7;
}

.dynamic-label:hover i {
  opacity: 1;
}

.form-select,
.form-input {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background: white;
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.tricks-help {
  font-size: 12px;
  color: #666;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.tricks-help p {
  margin: 4px 0;
}

.score-preview {
  background: white;
  border-radius: 8px;
  padding: 20px;
  border: 2px solid #e1e5e9;
}

.score-preview h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid #e1e5e9;
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
  border-color: #6c757d;
  background: #f8f9fa;
}

.score-item .player-name {
  font-size: 14px;
  margin: 0;
}

.score-value {
  font-weight: bold;
  font-size: 16px;
}

.score-item.positive .score-value {
  color: #155724;
}

.score-item.negative .score-value {
  color: #721c24;
}

.score-item.neutral .score-value {
  color: #495057;
}

.rounds-section {
  margin-bottom: 40px;
}

.rounds-section h3 {
  color: #333;
  font-size: 20px;
  margin-bottom: 20px;
}

.no-rounds {
  text-align: center;
  padding: 40px;
  color: #666;
  background: #f8f9fa;
  border-radius: 8px;
}

.rounds-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.round-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e1e5e9;
}

.round-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e1e5e9;
}

.round-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
  font-size: 14px;
}

.action-btn.edit-btn {
  color: #1976d2;
}

.action-btn.edit-btn:hover {
  background: rgba(25, 118, 210, 0.1);
}

.action-btn.delete-btn {
  color: #dc3545;
}

.action-btn.delete-btn:hover {
  background: rgba(220, 53, 69, 0.1);
}

.round-number {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.round-time {
  color: #666;
  font-size: 14px;
}

.round-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.round-info {
  display: flex;
  gap: 8px;
}

.label {
  font-weight: 500;
  color: #666;
}

.value {
  color: #333;
}

.round-scores {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.round-score-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.round-score-item .player-name {
  font-size: 14px;
  margin: 0;
}

.round-score-item .score {
  font-weight: 600;
  font-size: 14px;
}

.round-score-item .score.positive {
  color: #28a745;
}

.round-score-item .score.negative {
  color: #dc3545;
}

/* 編輯表單樣式 */
.round-edit-form {
  background: #f8f9fa;
  border: 2px solid #667eea;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.edit-form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.edit-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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
  z-index: 2000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e1e5e9;
}

.modal-header h3 {
  margin: 0;
  color: #333;
  font-size: 18px;
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
  color: #333;
}

.modal-body {
  padding: 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

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

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 2px solid #e9ecef;
}

.btn-secondary:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.btn {
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

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f8f9fa;
  color: #333;
  border: 2px solid #e9ecef;
}

.btn-secondary:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.btn-danger {
  background: #dc3545;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c82333;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(220, 53, 69, 0.3);
}

.btn-danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
}

@media (max-width: 768px) {
  .ongoing-game-container {
    padding: 10px;
  }

  .game-info-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .game-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .game-header h2 {
    font-size: 24px;
  }

  .game-meta {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
  }

  .bet-amount,
  .round-count {
    font-size: 12px;
    padding: 6px 12px;
  }

  .players-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .player-card {
    padding: 12px;
  }

  .player-name {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .player-score {
    font-size: 18px;
    margin-bottom: 3px;
  }

  .player-money {
    font-size: 12px;
  }

  .round-input-section {
    padding: 20px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-input,
  .form-select {
    font-size: 16px; /* 防止 iOS 縮放 */
    padding: 14px 16px;
  }

  .rounds-list {
    gap: 16px;
  }

  .round-item {
    padding: 16px;
  }

  .round-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
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

  .round-scores {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .actions {
    flex-direction: column;
    gap: 12px;
  }

  .btn {
    width: 100%;
    padding: 16px 24px;
    font-size: 16px;
  }

  .no-game-card {
    margin: 20px;
    padding: 30px;
  }

  .no-game-card h2 {
    font-size: 24px;
  }

  .no-game-card p {
    font-size: 16px;
  }

  .modal-content {
    margin: 20px;
    max-width: calc(100vw - 40px);
  }

  .edit-form-row {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .score-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .score-item {
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
  }

  .score-item .player-name {
    font-size: 14px;
    margin-bottom: 2px;
  }

  .score-item .score-value {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .game-info-card {
    padding: 25px 15px;
  }

  .game-header h2 {
    font-size: 20px;
  }

  .players-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .player-card {
    padding: 10px;
  }

  .player-name {
    font-size: 13px;
    margin-bottom: 5px;
  }

  .player-score {
    font-size: 16px;
    margin-bottom: 2px;
  }

  .player-money {
    font-size: 11px;
  }

  .round-input-section {
    padding: 15px;
  }

  .round-item {
    padding: 12px;
  }
}
</style>
