<template>
  <div class="admin-setup-container">
    <div class="admin-setup-card">
      <h2>管理員權限設定</h2>

      <div class="setup-section">
        <h3>設定管理員</h3>
        <form @submit.prevent="setAdmin" class="setup-form">
          <div class="form-group">
            <label for="admin-email">管理員 Email：</label>
            <input
              id="admin-email"
              v-model="adminEmail"
              type="email"
              class="form-input"
              placeholder="請輸入要設定為管理員的 email"
              required
            />
          </div>
          <button type="submit" class="btn-primary" :disabled="loading">
            {{ loading ? "設定中..." : "設定為管理員" }}
          </button>
        </form>
      </div>

      <div class="setup-section">
        <h3>移除管理員權限</h3>
        <form @submit.prevent="removeAdmin" class="setup-form">
          <div class="form-group">
            <label for="remove-email">管理員 Email：</label>
            <input
              id="remove-email"
              v-model="removeEmail"
              type="email"
              class="form-input"
              placeholder="請輸入要移除管理員權限的 email"
              required
            />
          </div>
          <button type="submit" class="btn-danger" :disabled="loading">
            {{ loading ? "移除中..." : "移除管理員權限" }}
          </button>
        </form>
      </div>

      <div class="setup-section">
        <h3>當前管理員列表</h3>
        <div class="admin-list">
          <div v-if="admins.length === 0" class="no-admins">
            <p>目前沒有管理員</p>
          </div>
          <div v-else class="admin-items">
            <div v-for="admin in admins" :key="admin.uid" class="admin-item">
              <span class="admin-email">{{ admin.email }}</span>
              <span class="admin-name">({{ admin.displayName }})</span>
            </div>
          </div>
        </div>
      </div>

      <div class="setup-section">
        <h3>玩家管理</h3>
        <div class="users-list">
          <div v-if="gameStore.users.length === 0" class="no-users">
            <p>目前沒有玩家</p>
          </div>
          <div v-else class="user-items">
            <div
              v-for="user in gameStore.users.filter((u) => u.uid !== authStore.user?.uid)"
              :key="user.uid"
              class="user-item"
            >
              <div class="user-info">
                <div class="user-email">{{ user.email }}</div>
                <div class="user-display-name">
                  <span v-if="editingUser !== user.uid">{{ user.displayName }}</span>
                  <input
                    v-else
                    v-model="editingDisplayName"
                    type="text"
                    class="edit-input"
                    placeholder="顯示名稱"
                    @keyup.enter="saveEditUser"
                    @keyup.esc="cancelEdit"
                  />
                </div>
              </div>
              <div class="user-controls">
                <div class="user-role">
                  <span class="role-badge" :class="user.role === 'admin' ? 'admin' : 'user'">
                    {{ user.role === "admin" ? "管理員" : "玩家" }}
                  </span>
                </div>
                <div class="user-actions">
                  <button
                    v-if="editingUser !== user.uid"
                    @click="startEditUser(user.uid, user.displayName)"
                    class="btn-edit"
                    title="編輯顯示名稱"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    v-else
                    @click="saveEditUser"
                    class="btn-save"
                    :disabled="editingLoading"
                    title="保存"
                  >
                    <i class="bi bi-check"></i>
                  </button>
                  <button
                    v-if="editingUser !== user.uid"
                    @click="deleteUser(user.uid, user.email, user.displayName)"
                    class="btn-delete"
                    title="刪除用戶"
                  >
                    <i class="bi bi-trash"></i>
                  </button>
                  <button v-else @click="cancelEdit" class="btn-cancel" title="取消">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="message" class="message" :class="messageType">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useGameStore } from "@/stores/gameStore";
import { useAuthStore } from "@/stores/authStore";
import { setUserAsAdmin, removeUserAdmin } from "@/utils/adminSetup";
import Swal from "sweetalert2";

const gameStore = useGameStore();
const authStore = useAuthStore();

const adminEmail = ref("");
const removeEmail = ref("");
const loading = ref(false);
const message = ref("");
const messageType = ref<"success" | "error">("success");

// 編輯用戶相關狀態
const editingUser = ref<string | null>(null);
const editingDisplayName = ref("");
const editingLoading = ref(false);

// 獲取所有管理員
const admins = computed(() => {
  return gameStore.users.filter((user) => user.role === "admin");
});

onMounted(async () => {
  try {
    await gameStore.loadUsers();
  } catch (error) {
    console.error("載入用戶資料失敗:", error);
  }
});

async function setAdmin() {
  if (!adminEmail.value.trim()) return;

  loading.value = true;
  message.value = "";

  try {
    // 查找用戶
    const user = gameStore.users.find((u) => u.email === adminEmail.value.trim());
    if (!user) {
      throw new Error("找不到該用戶，請確認 email 是否正確");
    }

    await setUserAsAdmin(user.uid, user.email);

    // 重新載入用戶資料
    await gameStore.loadUsers();

    message.value = `用戶 ${adminEmail.value} 已成功設定為管理員`;
    messageType.value = "success";
    adminEmail.value = "";
  } catch (error: any) {
    message.value = error.message;
    messageType.value = "error";
  } finally {
    loading.value = false;
  }
}

async function removeAdmin() {
  if (!removeEmail.value.trim()) return;

  loading.value = true;
  message.value = "";

  try {
    // 查找用戶
    const user = gameStore.users.find((u) => u.email === removeEmail.value.trim());
    if (!user) {
      throw new Error("找不到該用戶，請確認 email 是否正確");
    }

    if (user.role !== "admin") {
      throw new Error("該用戶不是管理員");
    }

    await removeUserAdmin(user.uid);

    // 重新載入用戶資料
    await gameStore.loadUsers();

    message.value = `用戶 ${removeEmail.value} 的管理員權限已移除`;
    messageType.value = "success";
    removeEmail.value = "";
  } catch (error: any) {
    message.value = error.message;
    messageType.value = "error";
  } finally {
    loading.value = false;
  }
}

// 開始編輯用戶顯示名稱
function startEditUser(userId: string, currentDisplayName: string) {
  editingUser.value = userId;
  editingDisplayName.value = currentDisplayName;
}

// 取消編輯
function cancelEdit() {
  editingUser.value = null;
  editingDisplayName.value = "";
}

// 保存編輯的顯示名稱
async function saveEditUser() {
  if (!editingUser.value || !editingDisplayName.value.trim()) return;

  editingLoading.value = true;
  message.value = "";

  try {
    await gameStore.updateUserDisplayName(editingUser.value, editingDisplayName.value.trim());

    message.value = "用戶顯示名稱更新成功";
    messageType.value = "success";
    cancelEdit();
  } catch (error: any) {
    message.value = error.message;
    messageType.value = "error";
  } finally {
    editingLoading.value = false;
  }
}

// 刪除用戶
async function deleteUser(userId: string, userEmail: string, userDisplayName: string) {
  const result = await Swal.fire({
    title: "確認刪除用戶",
    text: `確定要刪除用戶 ${userDisplayName} (${userEmail}) 嗎？\n\n此操作將會：\n• 刪除用戶的所有遊戲記錄\n• 刪除用戶的所有回合記錄\n• 此操作無法復原`,
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
    loading.value = true;
    message.value = "";

    try {
      await gameStore.deleteUser(userId);

      message.value = `用戶 ${userDisplayName} 已成功刪除`;
      messageType.value = "success";
    } catch (error: any) {
      message.value = error.message;
      messageType.value = "error";
    } finally {
      loading.value = false;
    }
  }
}
</script>

<style scoped>
.admin-setup-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.admin-setup-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 600px;
}

.admin-setup-card h2 {
  text-align: center;
  color: #333;
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 700;
}

.setup-section {
  margin-bottom: 40px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
}

.setup-section h3 {
  color: #333;
  font-size: 20px;
  margin-bottom: 20px;
  font-weight: 600;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
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

.btn-primary,
.btn-danger {
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

.admin-list {
  margin-top: 16px;
}

.no-admins {
  text-align: center;
  padding: 20px;
  color: #666;
  background: white;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.admin-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.admin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.admin-email {
  font-weight: 600;
  color: #333;
}

.admin-name {
  color: #666;
  font-size: 14px;
}

.message {
  padding: 12px 16px;
  border-radius: 6px;
  text-align: center;
  font-weight: 600;
  margin-top: 20px;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

/* 玩家列表樣式 */
.users-list {
  margin-top: 16px;
}

.no-users {
  text-align: center;
  padding: 20px;
  color: #666;
  background: white;
  border-radius: 6px;
  border: 1px solid #e1e5e9;
}

.user-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  transition: all 0.3s ease;
}

.user-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-email {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.user-display-name {
  color: #666;
  font-size: 14px;
}

.edit-input {
  padding: 6px 8px;
  border: 1px solid #667eea;
  border-radius: 4px;
  font-size: 14px;
  width: 150px;
}

.edit-input:focus {
  outline: none;
  border-color: #764ba2;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.user-role {
  margin: 0;
}

.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.role-badge.admin {
  background: #dc3545;
}

.role-badge.user {
  background: #28a745;
}

.user-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.btn-edit,
.btn-save,
.btn-delete,
.btn-cancel {
  padding: 6px 8px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.btn-edit {
  background: #17a2b8;
  color: white;
}

.btn-edit:hover {
  background: #138496;
  transform: translateY(-1px);
}

.btn-save {
  background: #28a745;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover {
  background: #c82333;
  transform: translateY(-1px);
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover {
  background: #5a6268;
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .admin-setup-container {
    padding: 10px;
  }

  .admin-setup-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .admin-setup-card h2 {
    font-size: 24px;
    margin-bottom: 25px;
  }

  .setup-section {
    padding: 20px;
    margin-bottom: 25px;
  }

  .setup-section h3 {
    font-size: 18px;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-input {
    font-size: 16px; /* 防止 iOS 縮放 */
    padding: 14px 16px;
  }

  .btn-primary,
  .btn-danger {
    width: 100%;
    padding: 16px 24px;
    font-size: 16px;
  }

  .admin-item {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    padding: 16px;
  }

  .admin-email {
    font-size: 16px;
  }

  .admin-name {
    font-size: 14px;
  }

  .user-item {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
    padding: 16px;
  }

  .user-info {
    width: 100%;
  }

  .user-controls {
    width: 100%;
    justify-content: space-between;
  }

  .user-actions {
    justify-content: flex-end;
  }

  .edit-input {
    width: 100%;
    max-width: 200px;
  }
}

@media (max-width: 480px) {
  .admin-setup-card {
    padding: 25px 15px;
  }

  .admin-setup-card h2 {
    font-size: 20px;
  }

  .setup-section {
    padding: 15px;
  }

  .setup-section h3 {
    font-size: 16px;
  }
}
</style>
