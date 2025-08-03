<template>
  <div v-if="showUpdatePrompt" class="pwa-update-prompt">
    <div class="pwa-update-content">
      <div class="pwa-update-icon">
        <i class="bi bi-arrow-clockwise"></i>
      </div>
      <div class="pwa-update-text">
        <h3>發現新版本</h3>
        <p>拿破麻計分系統有新版本可用，點擊更新以獲得最新功能！</p>
      </div>
      <div class="pwa-update-actions">
        <button @click="updateApp" class="btn-update" :disabled="updating">
          {{ updating ? "更新中..." : "立即更新" }}
        </button>
        <button @click="dismissUpdate" class="btn-dismiss">稍後再說</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { checkForUpdates, forceUpdate } from "@/utils/versionCheck";

const showUpdatePrompt = ref(false);
const updating = ref(false);

onMounted(() => {
  // 監聽 Service Worker 更新
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // Service Worker 已更新，提示用戶重新載入
      showUpdatePrompt.value = true;
    });

    // 檢查是否有待更新的 Service Worker
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        showUpdatePrompt.value = true;
      }
    });
  }
});

async function updateApp() {
  updating.value = true;

  try {
    // 使用強制更新函數
    forceUpdate();
  } catch (error) {
    console.error("更新失敗:", error);
    updating.value = false;
  }
}

function dismissUpdate() {
  showUpdatePrompt.value = false;
  // 1小時內不再顯示更新提示
  localStorage.setItem("pwa-update-dismissed", Date.now().toString());
}
</script>

<style scoped>
.pwa-update-prompt {
  position: fixed;
  bottom: 20px;
  left: 20px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

.pwa-update-content {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.pwa-update-icon {
  font-size: 24px;
  color: #28a745;
  flex-shrink: 0;
}

.pwa-update-text {
  flex: 1;
}

.pwa-update-text h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: #333;
}

.pwa-update-text p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.pwa-update-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-update {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-update:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.btn-update:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-dismiss {
  background: #f8f9fa;
  color: #666;
  border: 1px solid #e9ecef;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-dismiss:hover {
  background: #e9ecef;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .pwa-update-prompt {
    bottom: 10px;
    left: 10px;
    right: 10px;
  }

  .pwa-update-content {
    padding: 16px;
    gap: 12px;
  }

  .pwa-update-text h3 {
    font-size: 15px;
  }

  .pwa-update-text p {
    font-size: 13px;
  }

  .btn-update,
  .btn-dismiss {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>
