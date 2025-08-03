// 版本檢查工具
export const APP_VERSION = "v1.3.2";

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
  setTimeout(() => {
    // 強制清除所有緩存並重新載入
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }

    // 清除所有緩存
    if ("caches" in window) {
      caches.keys().then(function (names) {
        for (let name of names) {
          caches.delete(name);
        }
      });
    }

    // 強制重新載入頁面
    window.location.href = window.location.href;
  }, 1500);
}
