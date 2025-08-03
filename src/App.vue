<script setup lang="ts">
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";
import { useRouter } from "vue-router";
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import Swal from "sweetalert2";

const authStore = useAuthStore();
const gameStore = useGameStore();
const router = useRouter();

// 下拉選單狀態
const showUserMenu = ref(false);
const showEditProfile = ref(false);
const showChangePassword = ref(false);
const showMobileMenu = ref(false);

// 編輯資料相關
const newDisplayName = ref("");
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const error = ref("");

async function openLogoutConfirm() {
  const result = await Swal.fire({
    title: "確認登出",
    text: "您確定要登出嗎？",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "登出",
    cancelButtonText: "取消",
    confirmButtonColor: "#667eea",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (result.isConfirmed) {
    try {
      await authStore.logout();
      router.push("/");
    } catch (error) {
      console.error("登出失敗:", error);
    }
  }
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value;
  if (showUserMenu.value) {
    // 初始化編輯資料
    newDisplayName.value = authStore.user?.displayName || "";
  }
}

function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value;
  if (showMobileMenu.value) {
    // 初始化編輯資料
    newDisplayName.value = authStore.user?.displayName || "";
  }
}

function openEditProfile() {
  showEditProfile.value = true;
  showUserMenu.value = false;
  error.value = "";
}

function openChangePassword() {
  showChangePassword.value = true;
  showUserMenu.value = false;
  error.value = "";
}

async function updateDisplayName() {
  if (!newDisplayName.value.trim()) {
    error.value = "顯示名稱不能為空";
    return;
  }

  const result = await Swal.fire({
    title: "確認更改顯示名稱",
    text: `您確定要將顯示名稱更改為「${newDisplayName.value.trim()}」嗎？`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "確認更改",
    cancelButtonText: "取消",
    confirmButtonColor: "#667eea",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (!result.isConfirmed) {
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    await authStore.updateDisplayName(newDisplayName.value.trim());

    // 重新載入 gameStore 中的用戶資料，確保所有頁面同步更新
    await gameStore.loadUsers();

    showEditProfile.value = false;
    newDisplayName.value = "";

    // 顯示成功訊息
    Swal.fire({
      title: "更改成功",
      text: "顯示名稱已成功更改",
      icon: "success",
      confirmButtonColor: "#667eea",
      customClass: {
        container: "swal-high-z-index",
      },
    });
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function changePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    error.value = "請填寫所有欄位";
    return;
  }

  const result = await Swal.fire({
    title: "確認更改密碼",
    text: "您確定要更改密碼嗎？更改後請使用新密碼登入。",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "確認更改",
    cancelButtonText: "取消",
    confirmButtonColor: "#dc3545",
    cancelButtonColor: "#6c757d",
    customClass: {
      container: "swal-high-z-index",
    },
  });

  if (!result.isConfirmed) {
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    // 先檢查目前密碼是否正確
    await authStore.verifyCurrentPassword(currentPassword.value);

    // 目前密碼正確，再檢查新密碼與確認密碼是否相符
    if (newPassword.value !== confirmPassword.value) {
      error.value = "新密碼與確認密碼不符";
      return;
    }

    if (newPassword.value.length < 6) {
      error.value = "新密碼至少需要6個字元";
      return;
    }

    // 所有檢查都通過，進行密碼更改
    await authStore.changePassword(currentPassword.value, newPassword.value);

    // 密碼更改成功
    showChangePassword.value = false;
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";

    // 顯示成功訊息
    Swal.fire({
      title: "密碼更改成功",
      text: "您的密碼已成功更改，請使用新密碼登入。",
      icon: "success",
      confirmButtonColor: "#667eea",
      customClass: {
        container: "swal-high-z-index",
      },
    });
  } catch (err: any) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function closeModals() {
  showEditProfile.value = false;
  showChangePassword.value = false;
  showMobileMenu.value = false;
  error.value = "";
  newDisplayName.value = "";
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
}

function getUserDisplayName() {
  if (!authStore.user) return "";

  // 優先從 gameStore.users 中獲取 displayName
  const userInGameStore = gameStore.users.find((u) => u.uid === authStore.user?.uid);
  if (userInGameStore?.displayName) {
    return userInGameStore.displayName;
  }

  // 如果 gameStore 中沒有，則使用 authStore 中的 displayName
  return authStore.user.displayName || "";
}

// 檢查是否為管理員
const isAdmin = computed(() => {
  if (!authStore.user) return false;

  // 從 gameStore 的 users 中查找當前用戶的角色
  const currentUser = gameStore.users.find((u) => u.uid === authStore.user?.uid);
  return currentUser?.role === "admin";
});

// 點擊外部關閉下拉選單
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement;
  if (!target.closest(".user-menu-container")) {
    showUserMenu.value = false;
  }
  if (!target.closest(".mobile-menu-container")) {
    showMobileMenu.value = false;
  }
}

onMounted(async () => {
  document.addEventListener("click", handleClickOutside);

  // 如果用戶已登入，載入用戶資料
  if (authStore.user) {
    try {
      await gameStore.loadUsers();
    } catch (error) {
      console.error("載入用戶資料失敗:", error);
    }
  }
});

// 監聽用戶狀態變化，當用戶登入時載入用戶資料
watch(
  () => authStore.user,
  async (newUser) => {
    if (newUser) {
      try {
        await gameStore.loadUsers();
      } catch (error) {
        console.error("載入用戶資料失敗:", error);
      }
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<template>
  <div id="app">
    <!-- 導航欄 -->
    <nav v-if="authStore.user" class="navbar">
      <div class="nav-container">
        <div class="nav-top-row">
          <div class="nav-brand">
            <h1>拿破麻計分系統 <span class="version">v1.3.7</span></h1>
          </div>
          <div class="nav-user">
            <!-- 桌面版用戶選單 -->
            <div class="user-menu-container desktop-only">
              <button
                @click="toggleUserMenu"
                class="user-menu-btn"
                :class="{ active: showUserMenu }"
              >
                <span class="user-name">{{ getUserDisplayName() || authStore.user.email }}</span>
                <span class="dropdown-arrow">▼</span>
              </button>

              <!-- 用戶下拉選單 -->
              <div v-if="showUserMenu" class="user-dropdown">
                <button @click="openEditProfile" class="dropdown-item">
                  <i class="bi bi-person-fill"></i>
                  更改顯示名稱
                </button>
                <button @click="openChangePassword" class="dropdown-item">
                  <i class="bi bi-lock-fill"></i>
                  更改密碼
                </button>

                <div class="dropdown-divider"></div>
                <button @click="openLogoutConfirm" class="dropdown-item logout">
                  <i class="bi bi-box-arrow-right"></i>
                  登出
                </button>
              </div>
            </div>

            <!-- 手機版漢堡選單 -->
            <div class="mobile-menu-container mobile-only">
              <button
                @click="toggleMobileMenu"
                class="hamburger-btn"
                :class="{ active: showMobileMenu }"
              >
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
              </button>
            </div>
          </div>
        </div>

        <!-- 桌面版導航選單 -->
        <div class="nav-menu desktop-only">
          <router-link to="/setup" class="nav-link">新牌局</router-link>
          <router-link to="/ongoing" class="nav-link">進行中</router-link>
          <router-link to="/scoreboard" class="nav-link">歷史戰績</router-link>
          <router-link to="/rules" class="nav-link">計分規則</router-link>
          <router-link v-if="isAdmin" to="/admin-setup" class="nav-link">管理員設定</router-link>
        </div>
      </div>

      <!-- 手機版漢堡選單內容 -->
      <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="closeModals">
        <div class="mobile-menu-content" @click.stop>
          <div class="mobile-menu-header">
            <div class="mobile-user-info">
              <div class="mobile-user-name">{{ getUserDisplayName() || authStore.user.email }}</div>
              <div v-if="isAdmin" class="mobile-admin-badge">管理員</div>
            </div>
            <button @click="closeModals" class="mobile-close-btn">&times;</button>
          </div>

          <div class="mobile-menu-sections">
            <!-- 導航連結 -->
            <div class="mobile-menu-section">
              <h3>功能選單</h3>
              <router-link to="/setup" class="mobile-menu-item" @click="closeModals">
                <i class="bi bi-plus-circle"></i>
                新牌局
              </router-link>
              <router-link to="/ongoing" class="mobile-menu-item" @click="closeModals">
                <i class="bi bi-play-circle"></i>
                進行中
              </router-link>
              <router-link to="/scoreboard" class="mobile-menu-item" @click="closeModals">
                <i class="bi bi-trophy"></i>
                歷史戰績
              </router-link>
              <router-link to="/rules" class="mobile-menu-item" @click="closeModals">
                <i class="bi bi-book"></i>
                計分規則
              </router-link>
              <router-link
                v-if="isAdmin"
                to="/admin-setup"
                class="mobile-menu-item"
                @click="closeModals"
              >
                <i class="bi bi-gear"></i>
                管理員設定
              </router-link>
            </div>

            <!-- 用戶功能 -->
            <div class="mobile-menu-section">
              <h3>用戶設定</h3>
              <button @click="openEditProfile" class="mobile-menu-item">
                <i class="bi bi-person-fill"></i>
                更改顯示名稱
              </button>
              <button @click="openChangePassword" class="mobile-menu-item">
                <i class="bi bi-lock-fill"></i>
                更改密碼
              </button>
            </div>

            <!-- 登出 -->
            <div class="mobile-menu-section">
              <button @click="openLogoutConfirm" class="mobile-menu-item logout">
                <i class="bi bi-box-arrow-right"></i>
                登出
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主要內容 -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- 編輯顯示名稱對話框 -->
    <div v-if="showEditProfile" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>更改顯示名稱</h3>
          <button @click="closeModals" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="new-display-name">新的顯示名稱：</label>
            <input
              id="new-display-name"
              v-model="newDisplayName"
              type="text"
              class="form-input"
              placeholder="請輸入新的顯示名稱"
              maxlength="20"
            />
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <div class="modal-actions">
            <button @click="closeModals" class="btn-secondary">取消</button>
            <button @click="updateDisplayName" class="btn-primary" :disabled="loading">
              {{ loading ? "更新中..." : "更新" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 更改密碼對話框 -->
    <div v-if="showChangePassword" class="modal-overlay" @click="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>更改密碼</h3>
          <button @click="closeModals" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="current-password">目前密碼：</label>
            <input
              id="current-password"
              v-model="currentPassword"
              type="password"
              class="form-input"
              placeholder="請輸入目前密碼"
            />
          </div>
          <div class="form-group">
            <label for="new-password">新密碼：</label>
            <input
              id="new-password"
              v-model="newPassword"
              type="password"
              class="form-input"
              placeholder="請輸入新密碼（至少6個字元）"
            />
          </div>
          <div class="form-group">
            <label for="confirm-password">確認新密碼：</label>
            <input
              id="confirm-password"
              v-model="confirmPassword"
              type="password"
              class="form-input"
              placeholder="請再次輸入新密碼"
            />
          </div>
          <div v-if="error" class="error-message">{{ error }}</div>
          <div class="modal-actions">
            <button @click="closeModals" class="btn-secondary">取消</button>
            <button @click="changePassword" class="btn-primary" :disabled="loading">
              {{ loading ? "更改中..." : "更改密碼" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 登出確認對話框 -->
    <!-- SweetAlert2 已經處理了確認和取消的邏輯 -->
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu",
    "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: #f5f5f5;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
  flex-shrink: 0;
}

.nav-container {
  width: 100%;
  margin: 0;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: auto;
  padding-top: 20px;
  padding-bottom: 20px;
}

.nav-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.nav-menu {
  display: flex;
  gap: 20px;
  justify-content: center;
  width: 100%;
}

.nav-brand h1 {
  color: #333;
  font-size: 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.version {
  font-size: 14px;
  color: #666;
  font-weight: 400;
  align-self: center;
}

/* nav-menu 樣式已移到上面 */

.nav-link {
  color: #666;
  text-decoration: none;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.nav-link:hover {
  color: #667eea;
  background: #f8f9ff;
}

.nav-link.router-link-active {
  color: #667eea;
  background: #f8f9ff;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-menu-container {
  position: relative;
}

.user-menu-btn {
  background: none;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.3s ease;
}

.user-menu-btn:hover {
  background: #f8f9fa;
}

.user-name {
  color: #333;
  font-weight: 500;
}

.dropdown-arrow {
  font-size: 12px;
  color: #666;
  transition: transform 0.3s ease;
}

.user-menu-btn.active .dropdown-arrow {
  transform: rotate(180deg);
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  z-index: 1001;
  margin-top: 4px;
  border: 1px solid #e1e5e9;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.3s ease;
  color: #333;
  font-size: 14px;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item.logout {
  color: #dc3545;
}

.dropdown-item.logout:hover {
  background: #f8d7da;
}

.dropdown-item i {
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.dropdown-divider {
  height: 1px;
  background: #e1e5e9;
  margin: 4px 0;
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

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 14px;
}

.form-input {
  width: 100%;
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

.error-message {
  background: #f8d7da;
  color: #721c24;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 14px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
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

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.logout-btn:hover {
  background: #c82333;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* SweetAlert2 高層級樣式 */
.swal-high-z-index {
  z-index: 9999 !important;
}

/* 確保 SweetAlert2 在所有 modal 之上 */
.swal2-container {
  z-index: 9999 !important;
}

/* 漢堡選單樣式 */
.hamburger-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.3s ease;
}

.hamburger-line {
  width: 24px;
  height: 2px;
  background: #333;
  transition: all 0.3s ease;
  border-radius: 1px;
}

.hamburger-btn.active .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(6px, 6px);
}

.hamburger-btn.active .hamburger-line:nth-child(2) {
  opacity: 0;
}

.hamburger-btn.active .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(6px, -6px);
}

/* 手機版選單覆蓋層 */
.mobile-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
}

.mobile-menu-content {
  width: 280px;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.mobile-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e1e5e9;
  background: #f8f9fa;
}

.mobile-user-info {
  flex: 1;
}

.mobile-user-name {
  font-weight: 600;
  color: #333;
  font-size: 16px;
  margin-bottom: 4px;
}

.mobile-admin-badge {
  background: #667eea;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
}

.mobile-close-btn {
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

.mobile-close-btn:hover {
  color: #333;
}

.mobile-menu-sections {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.mobile-menu-section {
  margin-bottom: 24px;
}

.mobile-menu-section h3 {
  color: #666;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 20px 12px 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e1e5e9;
}

.mobile-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 20px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.3s ease;
  color: #333;
  font-size: 16px;
  text-decoration: none;
}

.mobile-menu-item:hover {
  background: #f8f9fa;
}

.mobile-menu-item.logout {
  color: #dc3545;
}

.mobile-menu-item.logout:hover {
  background: #f8d7da;
}

.mobile-menu-item i {
  font-size: 18px;
  width: 24px;
  text-align: center;
}

/* 響應式顯示控制 */
.desktop-only {
  display: block;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 16px 20px;
    gap: 16px;
  }

  .nav-top-row {
    flex-direction: row;
    gap: 12px;
    align-items: center;
  }

  .nav-brand h1 {
    font-size: 20px;
  }

  .version {
    font-size: 11px;
  }

  /* 響應式顯示控制 */
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: block !important;
  }

  .nav-menu {
    display: none;
  }

  .user-menu-btn {
    padding: 8px 10px;
  }

  .user-name {
    font-size: 13px;
  }

  .dropdown-arrow {
    font-size: 10px;
  }

  .user-dropdown {
    position: fixed;
    top: auto;
    right: 20px;
    left: 20px;
    width: auto;
    min-width: auto;
  }

  .modal-content {
    margin: 20px;
    max-width: calc(100vw - 40px);
  }

  .modal-actions {
    flex-direction: column;
    gap: 12px;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
    padding: 16px 24px;
    font-size: 16px;
  }

  .form-input {
    font-size: 16px; /* 防止 iOS 縮放 */
    padding: 14px 16px;
  }
}

@media (max-width: 480px) {
  .nav-container {
    padding: 12px 15px;
    gap: 12px;
  }

  .nav-top-row {
    gap: 8px;
  }

  .nav-brand h1 {
    font-size: 18px;
  }

  .version {
    font-size: 10px;
  }

  .hamburger-btn {
    padding: 6px;
  }

  .hamburger-line {
    width: 20px;
    height: 2px;
  }

  .mobile-menu-content {
    width: 260px;
  }

  .mobile-menu-header {
    padding: 16px;
  }

  .mobile-user-name {
    font-size: 14px;
  }

  .mobile-menu-item {
    padding: 14px 16px;
    font-size: 15px;
  }

  .mobile-menu-item i {
    font-size: 16px;
    width: 20px;
  }
}
</style>
