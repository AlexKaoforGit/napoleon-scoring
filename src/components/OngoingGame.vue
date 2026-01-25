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
        <div class="players-header">
          <h3>玩家分數</h3>
          <div class="player-selection-controls">
            <div class="player-count-toggle">
              <label class="radio-option">
                <input
                  type="radio"
                  v-model="currentRoundPlayerCount"
                  :value="4"
                  name="roundPlayerCount"
                />
                <span class="radio-label">四人回合</span>
              </label>
              <label class="radio-option">
                <input
                  type="radio"
                  v-model="currentRoundPlayerCount"
                  :value="5"
                  name="roundPlayerCount"
                />
                <span class="radio-label">五人回合</span>
              </label>
            </div>
            <div class="selection-info">
              已選擇 {{ selectedPlayers.length }}/{{ currentRoundPlayerCount }} 位玩家
            </div>
          </div>
        </div>
        <div class="players-grid">
          <div
            v-for="playerId in gameStore.currentGame?.players"
            :key="playerId"
            class="player-card"
            :class="{
              selected: selectedPlayers.includes(playerId),
              disabled:
                !selectedPlayers.includes(playerId) &&
                selectedPlayers.length >= currentRoundPlayerCount,
            }"
            @click="togglePlayerSelection(playerId)"
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
            <div v-if="selectedPlayers.includes(playerId)" class="selection-checkmark">✓</div>
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
                <option v-for="uid in selectedPlayers" :key="uid" :value="uid">
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
              <label>合約等級：</label>
              <select v-model.number="contractLevel" class="form-select" required>
                <option value="">請選擇合約等級</option>
                <option v-for="level in 8" :key="level" :value="level">
                  {{ level }} (要吃 {{ level + 8 }} 張)
                </option>
              </select>
            </div>

            <div class="form-group">
              <label>總吃張數：</label>
              <input
                type="number"
                v-model.number="totalTricks"
                class="form-input"
                placeholder="輸入拿破崙總共吃的張數"
                :min="0"
                :max="24"
                required
              />
              <div v-if="contractLevel && totalTricks" class="tricks-calculation">
                <span class="calculation-text">
                  {{ calculationText }}
                </span>
              </div>
            </div>
          </div>

          <div class="score-preview" v-if="canPreview">
            <h4>分數預覽</h4>
            <div class="score-grid">
              <div
                v-for="uid in selectedPlayers"
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
                    <option v-for="uid in round.playerIds" :key="uid" :value="uid">
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
                <div v-for="playerId in round.playerIds" :key="playerId" class="round-score-item">
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
const contractLevel = ref<number | "">(""); // 1-8，代表要吃 9-16 張
const totalTricks = ref<number | "">(""); // 拿破崙總共吃的張數
const error = ref("");
const loading = ref(false);

// 回合參與玩家選擇
const selectedPlayers = ref<string[]>([]);
const currentRoundPlayerCount = ref(5); // 預設五人遊戲

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

      // 如果是四人模式，預設秘書為"無（獨裁制）"
      if (gameStore.currentGame?.playerCount === 4) {
        secretaryId.value = "none";
        currentRoundPlayerCount.value = 4;
      }

      // 初始化選取的玩家，根據 currentRoundPlayerCount 選取前幾個玩家
      if (gameStore.currentGame) {
        const playerCount = currentRoundPlayerCount.value;
        selectedPlayers.value = gameStore.currentGame.players.slice(0, playerCount);
      }
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

// 監聽回合玩家數量變化，調整選取的玩家
watch(currentRoundPlayerCount, (newCount) => {
  if (gameStore.currentGame) {
    // 如果選取的玩家數量超過新的限制，移除多餘的玩家
    if (selectedPlayers.value.length > newCount) {
      selectedPlayers.value = selectedPlayers.value.slice(0, newCount);
    }
    // 如果選取的玩家數量少於新的限制，自動選取前幾個玩家
    else if (selectedPlayers.value.length < newCount) {
      const availablePlayers = gameStore.currentGame.players.filter(
        (playerId) => !selectedPlayers.value.includes(playerId)
      );
      const needToAdd = newCount - selectedPlayers.value.length;
      const playersToAdd = availablePlayers.slice(0, needToAdd);
      selectedPlayers.value.push(...playersToAdd);
    }
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

  // 檢查選取的玩家數量是否符合要求
  if (selectedPlayers.value.length !== currentRoundPlayerCount.value) return false;

  // 驗證合約等級和總吃張數
  if (!contractLevel.value || contractLevel.value < 1 || contractLevel.value > 8) return false;
  if (!totalTricks.value || totalTricks.value < 0 || totalTricks.value > 24) return false;

  return true;
});

const canPreview = computed(() => {
  return (
    napoleonId.value &&
    secretaryId.value &&
    selectedPlayers.value.length === currentRoundPlayerCount.value
  );
});

const availableSecretaries = computed(() => {
  if (!selectedPlayers.value.length) return [];

  // 如果拿破崙還沒選擇，返回所有選取的玩家
  if (!napoleonId.value) return selectedPlayers.value;

  // 扣除拿破崙已選擇的玩家
  return selectedPlayers.value.filter((uid) => uid !== napoleonId.value);
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
  // 找到當前編輯的回合
  const editingRoundData = gameStore.currentRounds.find((r) => r.id === editingRound.value);
  if (!editingRoundData) return [];

  // 如果拿破崙還沒選擇，返回該回合的所有玩家
  if (!editRoundData.value.napoleonId) return editingRoundData.playerIds;

  // 扣除拿破崙已選擇的玩家
  return editingRoundData.playerIds.filter((uid) => uid !== editRoundData.value.napoleonId);
});

// 計算超吃/缺少張數的計算屬性
const calculatedExtraTricks = computed(() => {
  if (!contractLevel.value || !totalTricks.value) return 0;
  const requiredTricks = (contractLevel.value as number) + 8; // 要吃張數
  return (totalTricks.value as number) - requiredTricks; // 正數=超吃，負數=缺少
});

// 計算顯示文字
const calculationText = computed(() => {
  if (!contractLevel.value || !totalTricks.value) return "";
  const required = (contractLevel.value as number) + 8;
  const diff = calculatedExtraTricks.value;
  if (diff > 0) {
    return `超吃 ${diff} 張 (需要 ${required} 張，實際吃了 ${totalTricks.value} 張)`;
  } else if (diff < 0) {
    return `缺少 ${Math.abs(diff)} 張 (需要 ${required} 張，實際吃了 ${totalTricks.value} 張)`;
  } else {
    return `剛好完成 (需要 ${required} 張，實際吃了 ${totalTricks.value} 張)`;
  }
});

const previewScores = computed(() => {
  if (!canPreview.value || !gameStore.currentGame) return {};

  // 判斷是否為獨裁制
  const isDictator = secretaryId.value === "none";
  const secId = isDictator ? napoleonId.value : secretaryId.value;

  try {
    return calculateRoundScores({
      contractType: isDictator ? "dictator" : "standard",
      napoleonId: napoleonId.value,
      secretaryId: secId,
      extraTricks: calculatedExtraTricks.value,
      playerIds: selectedPlayers.value,
    });
  } catch {
    return {};
  }
});


// 切換玩家選擇
function togglePlayerSelection(playerId: string) {
  const index = selectedPlayers.value.indexOf(playerId);
  if (index > -1) {
    selectedPlayers.value.splice(index, 1);
  } else if (selectedPlayers.value.length < currentRoundPlayerCount.value) {
    selectedPlayers.value.push(playerId);
  }
  // 如果已滿，不允許新增玩家
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

    await gameStore.addRound({
      napoleonId: napoleonId.value,
      secretaryId: secId,
      contractType: isDictator ? "dictator" : "standard",
      extraTricks: calculatedExtraTricks.value,
      playerIds: selectedPlayers.value,
    });

    // 重新載入回合記錄以確保顯示正確的玩家列表
    if (gameStore.currentGame) {
      await gameStore.loadGameRounds(gameStore.currentGame.id);
    }

    // 重置表單
    napoleonId.value = "";
    secretaryId.value = "";
    contractLevel.value = "";
    totalTricks.value = "";
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
    // 找到當前編輯的回合
    const editingRoundData = gameStore.currentRounds.find((r) => r.id === roundId);
    if (!editingRoundData) {
      throw new Error("找不到要編輯的回合");
    }

    // 判斷是否為獨裁制
    const isDictator = editRoundData.value.secretaryId === "none";
    const secId = isDictator ? editRoundData.value.napoleonId : editRoundData.value.secretaryId;

    await gameStore.updateRound(roundId, {
      napoleonId: editRoundData.value.napoleonId,
      secretaryId: secId,
      contractType: isDictator ? "dictator" : "standard",
      extraTricks: editRoundData.value.extraTricks,
      playerIds: editingRoundData.playerIds, // 使用該回合的玩家
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
  background: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.no-game-card h2 {
  color: var(--color-heading);
  font-size: 28px;
  margin-bottom: 15px;
}

.no-game-card p {
  color: var(--color-text);
  font-size: 18px;
  margin-bottom: 30px;
}

.game-info-card {
  background: var(--color-background);
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
  border-bottom: 2px solid var(--color-border);
}

.game-header h2 {
  color: var(--color-heading);
  font-size: 28px;
  margin: 0;
}

.game-meta {
  display: flex;
  gap: 20px;
}

.bet-amount,
.round-count {
  background: #e3f2fd; /* Keep specific color for emphasis, or change to var(--color-background-mute) if desired */
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

.players-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.players-section h3 {
  color: var(--color-heading);
  font-size: 20px;
  margin: 0;
}

.player-selection-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
}

.player-count-toggle {
  display: flex;
  gap: 16px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.3s ease;
  background: var(--color-background);
}

.radio-option:hover {
  border-color: #667eea;
  background: var(--color-background-soft);
}

.radio-option input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.radio-option input[type="radio"]:checked + .radio-label {
  color: #667eea;
  font-weight: 600;
}

.radio-option:has(input[type="radio"]:checked) {
  border-color: #667eea;
  background: var(--color-background-mute);
}

.radio-label {
  font-size: 12px;
  color: var(--color-text);
  cursor: pointer;
}

.selection-info {
  font-size: 12px;
  color: var(--color-text);
  background: var(--color-background-soft);
  padding: 4px 8px;
  border-radius: 4px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.player-card {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.player-card.selected {
  border-color: #667eea;
  background: #e3f2fd;
}

.player-card.disabled {
  border-color: var(--color-border);
  background: var(--color-background-soft);
  cursor: not-allowed;
  opacity: 0.6;
}

.player-card.disabled:hover {
  border-color: var(--color-border);
  background: var(--color-background-soft);
  transform: none;
}

.selection-checkmark {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #667eea;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

.player-name {
  font-weight: 600;
  color: var(--color-heading);
  margin-bottom: 8px;
}

.player-score {
  color: var(--color-text);
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
  color: var(--color-text);
}

/* 新增回合表單樣式 */
.round-input-section {
  margin-bottom: 40px;
  padding: 30px;
  background: var(--color-background-snow);
  border-radius: 12px;
  border: 2px solid var(--color-border);
}

.round-input-section h3 {
  color: var(--color-heading);
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
  color: var(--color-heading);
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
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background: var(--color-background);
  color: var(--color-text);
}

.form-select:focus,
.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.tricks-help {
  font-size: 12px;
  color: var(--color-text);
  background: var(--color-background);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.tricks-help p {
  margin: 4px 0;
}

.tricks-calculation {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--color-background-soft);
  border-radius: 6px;
  border: 1px solid var(--color-border);
}

.calculation-text {
  font-size: 13px;
  color: var(--color-text);
  font-weight: 500;
}

.score-preview {
  background: var(--color-background);
  border-radius: 8px;
  padding: 20px;
  border: 2px solid var(--color-border);
}

.score-preview h4 {
  margin: 0 0 16px 0;
  color: var(--color-heading);
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
  color: var(--color-heading);
  font-size: 20px;
  margin-bottom: 20px;
}

.no-rounds {
  text-align: center;
  padding: 40px;
  color: var(--color-text);
  background: var(--color-background-soft);
  border-radius: 8px;
}

.rounds-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.round-item {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 20px;
  border: 1px solid var(--color-border);
}

.round-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
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
  background: var(--color-background);
  border-radius: 6px;
  border: 1px solid var(--color-border);
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
  background: var(--color-background-soft);
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
  background: var(--color-background);
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
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-heading);
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
  color: var(--color-heading);
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

  .players-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .player-selection-controls {
    align-items: flex-start;
    width: 100%;
  }

  .player-count-toggle {
    gap: 12px;
  }

  .radio-option {
    padding: 8px 12px;
  }

  .radio-label {
    font-size: 14px;
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
