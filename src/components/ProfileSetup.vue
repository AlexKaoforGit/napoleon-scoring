<template>
  <div class="profile-setup-container">
    <div class="profile-setup-card">
      <h2>設定個人資料</h2>
      <p class="setup-description">請設定您的顯示名稱，這將用於遊戲中識別您</p>

      <form @submit.prevent="onSubmit" class="setup-form">
        <div class="form-group">
          <label for="display-name">顯示名稱</label>
          <input
            id="display-name"
            v-model="displayName"
            type="text"
            placeholder="請輸入顯示名稱"
            required
            class="form-input"
            maxlength="20"
          />
          <div class="input-help">顯示名稱將在遊戲中顯示，建議使用容易識別的名稱</div>
        </div>

        <button type="submit" class="btn-primary" :disabled="loading || !displayName.trim()">
          {{ loading ? "儲存中..." : "儲存設定" }}
        </button>
      </form>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useRouter } from "vue-router";

const authStore = useAuthStore();
const gameStore = useGameStore();
const router = useRouter();
const displayName = ref("");
const error = ref("");
const loading = ref(false);

onMounted(() => {
  // 如果用戶已有顯示名稱，預先填入
  if (authStore.user?.displayName) {
    displayName.value = authStore.user.displayName;
  }
});

async function onSubmit() {
  if (!displayName.value.trim()) {
    error.value = "請輸入顯示名稱";
    return;
  }

  error.value = "";
  loading.value = true;

  try {
    // 使用統一的 updateDisplayName 函數更新顯示名稱
    await authStore.updateDisplayName(displayName.value.trim());

    console.log("個人資料更新成功");

    // 重新載入用戶資料
    await gameStore.loadUsers();

    // 檢查是否有進行中場次
    await checkAndRedirect();
  } catch (e: any) {
    console.error("更新個人資料失敗:", e);
    error.value = `更新失敗: ${e.message}`;
  } finally {
    loading.value = false;
  }
}

async function checkAndRedirect() {
  if (authStore.user) {
    try {
      // 檢查是否有進行中場次
      const ongoingGame = await gameStore.checkUserOngoingGame(authStore.user.uid);
      if (ongoingGame) {
        // 有進行中場次，導向進行中場次頁面
        router.push("/ongoing");
      } else {
        // 沒有進行中場次，導向新牌局頁面
        router.push("/setup");
      }
    } catch (error) {
      console.error("檢查進行中場次失敗:", error);
      // 發生錯誤時，導向新牌局頁面
      router.push("/setup");
    }
  }
}
</script>

<style scoped>
.profile-setup-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.profile-setup-card {
  background: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 500px;
}

.profile-setup-card h2 {
  text-align: center;
  color: var(--color-heading);
  margin-bottom: 16px;
  font-size: 28px;
}

.setup-description {
  text-align: center;
  color: var(--color-text);
  margin-bottom: 30px;
  font-size: 16px;
  line-height: 1.5;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 600;
  color: var(--color-heading);
  font-size: 16px;
}

.form-input {
  padding: 14px 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s ease;
  background: var(--color-background);
  color: var(--color-text);
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
}

.input-help {
  font-size: 14px;
  color: var(--color-text);
  margin-top: 4px;
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
  transition: all 0.3s ease;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  margin-top: 20px;
  text-align: center;
  font-size: 14px;
}

@media (max-width: 768px) {
  .profile-setup-container {
    padding: 10px;
  }

  .profile-setup-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .profile-setup-card h2 {
    font-size: 24px;
    margin-bottom: 20px;
  }

  .setup-description {
    font-size: 15px;
    margin-bottom: 25px;
  }

  .setup-form {
    gap: 20px;
  }

  .form-input {
    font-size: 16px; /* 防止 iOS 縮放 */
    padding: 16px;
  }

  .btn-primary {
    padding: 16px 24px;
    font-size: 16px;
    width: 100%;
  }
}

@media (max-width: 480px) {
  .profile-setup-card {
    padding: 25px 15px;
  }

  .profile-setup-card h2 {
    font-size: 20px;
  }

  .setup-description {
    font-size: 14px;
  }
}
</style>
