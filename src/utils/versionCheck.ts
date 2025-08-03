// 版本檢查工具
export const APP_VERSION = "v1.3.1";

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

        // 重新載入頁面
        window.location.reload();
      }
    });
  }
}
