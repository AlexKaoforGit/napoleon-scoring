<template>
  <div class="game-setup-container">
    <div class="setup-card">
      <h2>建立新牌局</h2>

      <div class="setup-form">
        <div class="form-group">
          <label>遊戲人數：</label>
          <div class="player-count-selection">
            <label class="radio-option">
              <input type="radio" v-model="playerCount" :value="4" name="playerCount" />
              <span class="radio-label">四人遊戲</span>
            </label>
            <label class="radio-option">
              <input type="radio" v-model="playerCount" :value="5" name="playerCount" />
              <span class="radio-label">五人遊戲</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label>選擇{{ playerCount }}位玩家：</label>
          <div class="player-selection-header">
            <button @click="toggleSelectAll" class="btn-select-all">
              {{ isAllSelected ? "取消全選" : "全選" }}
            </button>
            <span class="selection-info"
              >已選擇 {{ selected.length }}/{{ playerCount }} 位玩家</span
            >
          </div>
          <div class="player-selection">
            <div
              v-for="user in users"
              :key="user.uid"
              class="player-option"
              :class="{
                selected: selected.includes(user.uid),
                'has-ongoing': userHasOngoingGame(user.uid),
              }"
              @click="togglePlayer(user.uid)"
            >
              <span class="player-name">{{ user.displayName }}</span>
              <span v-if="selected.includes(user.uid)" class="checkmark">✓</span>
              <span v-if="userHasOngoingGame(user.uid)" class="ongoing-badge">進行中</span>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="bet-amount">賭注金額：</label>
          <input
            id="bet-amount"
            type="number"
            v-model.number="bet"
            min="1"
            class="form-input"
            placeholder="請輸入賭注金額"
          />
        </div>

        <button
          @click="openCreateGameConfirm"
          class="btn-primary"
          :disabled="!canCreate || loading"
        >
          {{ loading ? "建立中..." : "開始牌局" }}
        </button>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { db } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Swal from "sweetalert2";

interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
}

const users = ref<UserDoc[]>([]);
const selected = ref<string[]>([]);
const playerCount = ref(5); // 預設五人遊戲
const bet = ref(1);
const error = ref("");
const loading = ref(false);
const gameStore = useGameStore();
const authStore = useAuthStore();
const router = useRouter();

const canCreate = computed(() => {
  return selected.value.length === playerCount.value && bet.value > 0;
});

const isAllSelected = computed(() => {
  return selected.value.length === users.value.length;
});

// 檢查玩家是否有進行中牌局
const playersWithOngoing = ref<string[]>([]);

function userHasOngoingGame(uid: string): boolean {
  return playersWithOngoing.value.includes(uid);
}

// 檢查所有玩家的進行中牌局狀態
async function checkAllPlayersOngoingGames() {
  playersWithOngoing.value = [];

  for (const playerId of selected.value) {
    try {
      const gamesRef = collection(db, "games");
      const q = query(
        gamesRef,
        where("players", "array-contains", playerId),
        where("status", "==", "ongoing")
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        playersWithOngoing.value.push(playerId);
      }
    } catch (error) {
      console.error(`檢查玩家 ${playerId} 進行中牌局失敗:`, error);
      // 如果檢查失敗，為了安全起見，將該玩家視為有進行中牌局
      playersWithOngoing.value.push(playerId);
    }
  }
}

// 檢查所有玩家的進行中牌局狀態（用於初始載入）
async function checkAllUsersOngoingGames() {
  playersWithOngoing.value = [];

  for (const user of users.value) {
    try {
      const gamesRef = collection(db, "games");
      const q = query(
        gamesRef,
        where("players", "array-contains", user.uid),
        where("status", "==", "ongoing")
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        playersWithOngoing.value.push(user.uid);
      }
    } catch (error) {
      console.error(`檢查玩家 ${user.uid} 進行中牌局失敗:`, error);
      // 如果檢查失敗，為了安全起見，將該玩家視為有進行中牌局
      playersWithOngoing.value.push(user.uid);
    }
  }
}

onMounted(async () => {
  try {
    // 讀取所有已註冊玩家
    const snap = await getDocs(collection(db, "users"));
    users.value = snap.docs.map((doc) => doc.data() as UserDoc);

    // 檢查所有玩家的進行中牌局狀態
    await checkAllUsersOngoingGames();
  } catch (err: any) {
    error.value = "載入玩家列表失敗：" + err.message;
  }
});

// 監聽選取的玩家變化，自動檢查進行中牌局
watch(
  selected,
  async (newSelected) => {
    if (newSelected.length > 0) {
      await checkAllPlayersOngoingGames();
    } else {
      playersWithOngoing.value = [];
      // 重新檢查所有玩家的狀態
      await checkAllUsersOngoingGames();
    }
  },
  { deep: true }
);

// 監聽玩家數量變化，調整選取的玩家
watch(playerCount, (newCount) => {
  // 如果選取的玩家數量超過新的限制，移除多餘的玩家
  if (selected.value.length > newCount) {
    selected.value = selected.value.slice(0, newCount);
  }
});

function togglePlayer(uid: string) {
  // 如果玩家有進行中牌局，則不允許選取
  if (userHasOngoingGame(uid)) {
    return;
  }

  const index = selected.value.indexOf(uid);
  if (index > -1) {
    selected.value.splice(index, 1);
  } else if (selected.value.length < playerCount.value) {
    selected.value.push(uid);
  }

  // 清除錯誤訊息
  error.value = "";
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    selected.value = [];
  } else {
    selected.value = users.value.map((user) => user.uid);
  }
}

function getUserName(uid: string): string {
  const user = users.value.find((u) => u.uid === uid);
  return user?.displayName || uid;
}

async function openCreateGameConfirm() {
  const result = await Swal.fire({
    title: "確認創建新牌局",
    text: "您確定要創建一個新的牌局嗎？",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "創建牌局",
    cancelButtonText: "取消",
    confirmButtonColor: "#667eea",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (result.isConfirmed) {
    await create();
  }
}

async function create() {
  error.value = "";
  loading.value = true;

  try {
    // 檢查選取的玩家是否有進行中牌局
    const ongoingCheck = await checkPlayersOngoingGames();

    if (ongoingCheck.hasOngoing) {
      const playerNames = ongoingCheck.players.map((uid) => getUserName(uid)).join("、");
      error.value = `以下玩家有進行中的牌局，無法開新牌局：${playerNames}`;
      loading.value = false;
      return;
    }

    // 如果沒有進行中牌局，則創建新遊戲
    await gameStore.createGame(selected.value, bet.value);
    // 建立成功後導向進行中場次頁面
    router.push("/ongoing");
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

// 檢查選取的玩家是否有進行中牌局
async function checkPlayersOngoingGames(): Promise<{ hasOngoing: boolean; players: string[] }> {
  const playersWithOngoing: string[] = [];

  for (const playerId of selected.value) {
    try {
      const gamesRef = collection(db, "games");
      const q = query(
        gamesRef,
        where("players", "array-contains", playerId),
        where("status", "==", "ongoing")
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        playersWithOngoing.push(playerId);
      }
    } catch (error) {
      console.error(`檢查玩家 ${playerId} 進行中牌局失敗:`, error);
      // 如果檢查失敗，為了安全起見，將該玩家視為有進行中牌局
      playersWithOngoing.push(playerId);
    }
  }

  return {
    hasOngoing: playersWithOngoing.length > 0,
    players: playersWithOngoing,
  };
}
</script>

<style scoped>
.game-setup-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.setup-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 1200px;
}

.setup-card h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-group label {
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.player-count-selection {
  display: flex;
  gap: 20px;
  margin-bottom: 8px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: white;
}

.radio-option:hover {
  border-color: #667eea;
  background: #f8f9ff;
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
  background: #f8f9ff;
}

.radio-label {
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.player-selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-select-all {
  background: #e1e5e9;
  color: #333;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-select-all:hover {
  background-color: #d1d5db;
}

.player-selection {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  padding: 12px;
}

.player-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: white;
}

.player-option:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.player-option.selected {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.player-option.has-ongoing {
  border-color: #ff6b6b; /* 紅色邊框表示有進行中 */
  background: #ffeaea; /* 淺紅色背景 */
  cursor: not-allowed; /* 顯示為不可點擊 */
  opacity: 0.7; /* 降低透明度表示不可用 */
}

.player-option.has-ongoing:hover {
  border-color: #ff6b6b;
  background: #ffeaea;
  transform: none; /* 移除 hover 效果 */
}

.player-name {
  font-weight: 500;
  color: #999;
}

.player-option.selected .player-name {
  color: white;
}

.checkmark {
  font-weight: bold;
  font-size: 18px;
}

.ongoing-badge {
  background-color: #ff6b6b; /* 紅色背景 */
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  margin-left: 10px;
}

.selection-info {
  font-size: 14px;
  color: #666;
  text-align: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.warning-message {
  background-color: #fff3cd; /* 淺黃色背景 */
  color: #856404; /* 深黃色文字 */
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  margin-top: 15px;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 16px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-primary:disabled {
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
  .game-setup-container {
    padding: 10px;
  }

  .setup-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .setup-card h2 {
    font-size: 20px;
    margin-bottom: 25px;
  }

  .player-count-selection {
    flex-direction: column;
    gap: 12px;
  }

  .radio-option {
    padding: 12px 16px;
    font-size: 16px;
  }

  .player-selection {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .player-option {
    padding: 12px;
    font-size: 14px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    text-align: left;
  }

  .player-name {
    font-size: 13px;
  }

  .ongoing-badge {
    font-size: 10px;
    padding: 3px 6px;
    margin-left: 8px;
  }

  .checkmark {
    font-size: 16px;
  }

  .form-input {
    font-size: 16px; /* 防止 iOS 縮放 */
    padding: 14px 16px;
  }

  .btn-primary {
    padding: 16px 24px;
    font-size: 16px;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .setup-card {
    padding: 25px 15px;
  }

  .setup-card h2 {
    font-size: 18px;
  }

  .player-selection {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .player-option {
    padding: 10px;
    font-size: 13px;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .player-name {
    font-size: 12px;
  }

  .ongoing-badge {
    font-size: 9px;
    padding: 2px 5px;
    margin-left: 6px;
  }

  .checkmark {
    font-size: 14px;
  }
}
</style>
