<template>
  <div class="leaderboard-table-container">
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th class="rank">#</th>
          <th class="player-name">玩家</th>
          <th class="score">總分</th>
          <th class="money">總金額</th>
          <th v-if="showWinRate" class="win-rate">拿破崙勝率</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(player, index) in players"
          :key="player.id"
          :class="{ 'current-user-row': player.id === currentUserId }"
        >
          <td class="rank">
            <span class="rank-badge" :class="getRankClass(index)">
              {{ index + 1 }}
            </span>
          </td>
          <td class="player-name">{{ player.name }}</td>
          <td class="score" :class="getScoreClass(player.totalScore)">
            {{ player.totalScore }}
          </td>
          <td class="money" :class="getMoneyClass(player.totalMoney)">
            {{ formatMoney(player.totalMoney) }}
          </td>
          <td v-if="showWinRate" class="win-rate">
            {{ player.napoleonWinRate || '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">


interface LeaderboardPlayer {
  id: string;
  name: string;
  totalScore: number;
  totalMoney: number;
  napoleonWinRate?: string;
}

const props = defineProps<{
  players: LeaderboardPlayer[];
  currentUserId?: string;
  showWinRate?: boolean;
}>();

function formatMoney(amount: number): string {
  const val = Number(amount);
  if (isNaN(val)) return "$0";
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
  }).format(val);
}

function getScoreClass(score: number): string {
  if (score > 0) return "positive";
  if (score < 0) return "negative";
  return "neutral";
}

function getMoneyClass(money: number): string {
  if (money > 0) return "positive";
  if (money < 0) return "negative";
  return "neutral";
}

function getRankClass(index: number): string {
  if (index === 0) return "gold";
  if (index === 1) return "silver";
  if (index === 2) return "bronze";
  return "normal";
}
</script>

<style scoped>
.leaderboard-table-container {
  overflow-x: auto;
}

.leaderboard-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.leaderboard-table th {
  text-align: center;
  padding: 16px;
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.leaderboard-table th.player-name {
  text-align: left;
}

.leaderboard-table td {
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  vertical-align: middle;
  text-align: center;
}

.leaderboard-table td.player-name {
  text-align: left;
}

.leaderboard-table tr:hover td {
  background-color: var(--color-background-soft);
}

/* Column widths and alignment */
.rank { width: 60px; text-align: center; }
.player-name { width: 30%; text-align: left; }
.score { width: 20%; font-weight: 700; font-size: 18px; text-align: center; }
.money { width: 25%; font-weight: 600; text-align: center; }
.win-rate { width: 15%; color: var(--color-text-soft); text-align: center; }

/* Rank Badges */
.rank-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-background-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin: 0 auto;
  color: var(--color-text);
}

.rank-badge.gold { background: #ffd700; color: white; box-shadow: 0 2px 5px rgba(255, 215, 0, 0.4); }
.rank-badge.silver { background: #c0c0c0; color: white; box-shadow: 0 2px 5px rgba(192, 192, 192, 0.4); }
.rank-badge.bronze { background: #cd7f32; color: white; box-shadow: 0 2px 5px rgba(205, 127, 50, 0.4); }

/* Score & Money Colors */
.score.positive, .money.positive { color: #28a745; }
.score.negative, .money.negative { color: #dc3545; }
.neutral { color: var(--color-text); }

/* Highlight Current User */
.current-user-row > td {
  background-color: rgba(102, 126, 234, 0.1) !important;
}

@media (max-width: 600px) {
  .win-rate {
    display: none;
  }
}
</style>
