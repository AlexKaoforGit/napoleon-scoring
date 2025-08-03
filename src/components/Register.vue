<template>
  <div class="register-container">
    <div class="register-card">
      <h2>註冊新帳號</h2>
      <form @submit.prevent="onRegister" class="register-form">
        <div class="form-group">
          <label for="display-name">顯示名稱</label>
          <input
            id="display-name"
            v-model="displayName"
            type="text"
            placeholder="請輸入顯示名稱"
            required
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="email">電子郵件</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="請輸入電子郵件"
            required
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="password">密碼</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="請輸入密碼"
            required
            class="form-input"
          />
        </div>
        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? "註冊中..." : "註冊" }}
        </button>
      </form>

      <div class="login-link">
        <p>已有帳號？ <button @click="goToLogin" class="btn-link">立即登入</button></p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useRouter } from "vue-router";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/firebase";

const authStore = useAuthStore();
const gameStore = useGameStore();
const router = useRouter();
const displayName = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function onRegister() {
  error.value = "";
  loading.value = true;
  try {
    await authStore.register(email.value, password.value, displayName.value);
    // 註冊成功後自動登入
    await authStore.login(email.value, password.value);
    // 登入成功後檢查是否有進行中場次
    await checkAndRedirect();
  } catch (e: any) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function checkAndRedirect() {
  if (authStore.user) {
    try {
      // 先載入用戶資料
      await gameStore.loadUsers();

      // 檢查用戶是否有設定 displayName
      const userDoc = await getDoc(doc(db, "users", authStore.user.uid));
      const userData = userDoc.data();

      if (!userData?.displayName || userData.displayName.trim() === "") {
        // 沒有設定 displayName，導向個人資料設定頁面
        router.push("/profile-setup");
        return;
      }

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
      console.error("檢查用戶狀態失敗:", error);
      // 發生錯誤時，導向個人資料設定頁面
      router.push("/profile-setup");
    }
  }
}

function goToLogin() {
  router.push("/");
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.register-card h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #555;
  font-size: 14px;
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
  padding: 14px 24px;
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

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
}

.login-link {
  color: #999;
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
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
  .register-container {
    padding: 10px;
  }

  .register-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .register-card h2 {
    font-size: 20px;
    margin-bottom: 25px;
  }

  .form-input {
    font-size: 16px; /* 防止 iOS 縮放 */
    padding: 14px 16px;
  }

  .btn-primary {
    padding: 16px 24px;
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .register-card {
    padding: 25px 15px;
  }

  .register-card h2 {
    font-size: 18px;
  }
}
</style>
