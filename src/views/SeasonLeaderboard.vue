<template>
  <div class="leaderboard-container">
    <div class="leaderboard-card">
      <div class="header-section">
        <h2>賽季排行榜</h2>
        <div class="season-selector">
          <select
            v-model="selectedSeasonId"
            @change="loadStats"
            class="season-select"
            :disabled="loading"
          >
            <option
              v-for="season in seasonStore.seasons"
              :key="season.id"
              :value="season.id"
            >
              {{ season.name }} {{ season.isActive ? "(進行中)" : "" }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>載入數據中...</p>
      </div>

      <div v-else-if="!seasonStore.seasons.length" class="empty-state">
        <p>目前沒有任何賽季記錄</p>
      </div>

      <div v-else-if="!stats" class="empty-state">
        <p>無法載入此賽季數據</p>
      </div>

      <div v-else-if="!sortedStats.length" class="empty-state">
        <p>此賽季尚無比賽記錄</p>
      </div>

      <div v-else class="leaderboard-table-container">
        <LeaderboardTable
          :players="formattedStats"
          :currentUserId="authStore.user?.uid"
          :showWinRate="true"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  useSeasonStore,
  type SeasonStats,
  type PlayerSeasonStat,
} from "@/stores/seasonStore";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import LeaderboardTable from "@/components/LeaderboardTable.vue";

const seasonStore = useSeasonStore();
const gameStore = useGameStore();
const authStore = useAuthStore();

const selectedSeasonId = ref<string>("");
const stats = ref<SeasonStats | null>(null);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    await gameStore.loadUsers(); // Ensure we have user names
    await seasonStore.fetchSeasons();

    // Auto select active season or the most recent one
    const active = seasonStore.seasons.find((s) => s.isActive);
    if (active) {
      selectedSeasonId.value = active.id;
    } else if (seasonStore.seasons.length > 0) {
      selectedSeasonId.value = seasonStore.seasons[0].id;
    }

    if (selectedSeasonId.value) {
      await loadStats();
    }
  } catch (e) {
    console.error("Init leaderboard failed", e);
  } finally {
    loading.value = false;
  }
});

async function loadStats() {
  if (!selectedSeasonId.value) return;

  loading.value = true;
  try {
    stats.value = await seasonStore.getSeasonStats(selectedSeasonId.value);
  } catch (e) {
    console.error("Load stats failed", e);
    stats.value = null;
  } finally {
    loading.value = false;
  }
}

const sortedStats = computed(() => {
  if (!stats.value) return [];

  return Object.values(stats.value.playerStats).sort(
    (a, b) => b.totalScore - a.totalScore
  );
});

const formattedStats = computed(() => {
  return sortedStats.value.map((player) => ({
    id: player.playerId,
    name: getUserName(player.playerId),
    totalScore: player.totalScore,
    totalMoney: player.totalMoney,
    napoleonWinRate: formatNapoleonWinRate(player),
  }));
});

function getUserName(uid: string) {
  const user = gameStore.users.find((u) => u.uid === uid);
  return user ? user.displayName : "未知玩家";
}

function formatNapoleonWinRate(player: PlayerSeasonStat): string {
  if (player.napoleonCount === 0) return "-";
  return ((player.napoleonWins / player.napoleonCount) * 100).toFixed(0) + "%";
}
</script>

<style scoped>
.leaderboard-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.leaderboard-card {
  background: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 1000px;
}

.header-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 2px solid var(--color-border);
}

.header-section h2 {
  margin: 0;
  color: var(--color-heading);
  font-size: 28px;
  font-weight: 700;
}

.season-select {
  padding: 10px 16px;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  font-size: 16px;
  background-color: var(--color-background);
  color: var(--color-text);
  min-width: 200px;
  cursor: pointer;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: var(--color-text);
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.leaderboard-table-container {
  overflow-x: auto;
}

@media (max-width: 600px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
  }

  .season-select {
    width: 100%;
  }

  .leaderboard-card {
    padding: 20px;
  }
}
</style>
