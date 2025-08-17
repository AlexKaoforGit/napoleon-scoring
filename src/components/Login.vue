<template>
  <div class="login-container">
    <div class="login-card">
      <h2>拿破麻計分系統 <span class="version">v1.4.4</span></h2>
      <form @submit.prevent="onSubmit" class="login-form">
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
          {{ loading ? "登入中..." : "登入" }}
        </button>
      </form>
      <div class="register-link">
        <p>還沒有帳號？ <button @click="goToRegister" class="btn-link">立即註冊</button></p>
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
const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function onSubmit() {
  error.value = "";
  loading.value = true;

  try {
    // 前端驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value)) {
      error.value = "請輸入正確的電子郵件格式";
      return;
    }

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

function goToRegister() {
  router.push("/register");
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.login-card h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.version {
  font-size: 12px;
  color: #666;
  font-weight: 400;
  align-self: center;
}

.login-form {
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

.btn-secondary {
  background: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 10px;
}

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  text-decoration: underline;
  cursor: pointer;
  font-size: 14px;
}

.register-link {
  color: #999;
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
}

.register-form {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e1e5e9;
}

.register-form h3 {
  text-align: center;
  color: #333;
  margin-bottom: 20px;
  font-size: 18px;
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
  .login-container {
    padding: 10px;
  }

  .login-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .login-card h2 {
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
  .login-card {
    padding: 25px 15px;
  }

  .login-card h2 {
    font-size: 18px;
  }
}
</style>
