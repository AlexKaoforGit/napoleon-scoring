// 版本檢查工具
export const APP_VERSION = "v1.3.4";

export function checkForUpdates() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        // 強制檢查更新
        registration.update();

        // 監聽更新
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // 新版本已安裝，提示用戶更新
                console.log("新版本已準備好更新");
                window.dispatchEvent(new CustomEvent("pwa-update-available"));
              }
            });
          }
        });
      }
    });
  }
}

export function forceUpdate() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration && registration.waiting) {
        // 發送更新消息
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }
    });
  }

  // 延遲重新載入頁面
  setTimeout(async () => {
    try {
      // 1. 先註銷所有 Service Worker
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. 清除所有緩存
      if ("caches" in window) {
        const cacheNames = await caches.keys();
        for (let name of cacheNames) {
          await caches.delete(name);
        }
      }

      // 3. 清除 localStorage 和 sessionStorage
      localStorage.clear();
      sessionStorage.clear();

      // 4. 強制重新導向到首頁
      window.location.replace("/");
    } catch (error) {
      console.error("清理緩存失敗:", error);
      // 如果清理失敗，直接重新導向
      window.location.replace("/");
    }
  }, 2000);
}
