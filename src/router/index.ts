import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useGameStore } from "@/stores/gameStore";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/register",
      name: "register",
      component: () => import("@/components/Register.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/profile-setup",
      name: "profile-setup",
      component: () => import("@/components/ProfileSetup.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/ongoing",
      name: "ongoing-game",
      component: () => import("@/components/OngoingGame.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/setup",
      name: "game-setup",
      component: () => import("@/components/GameSetup.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/scoreboard",
      name: "scoreboard",
      component: () => import("@/components/Scoreboard.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/rules",
      name: "rules",
      component: () => import("@/components/Rules.vue"),
      meta: { requiresAuth: false },
    },
    {
      path: "/admin-setup",
      name: "admin-setup",
      component: () => import("@/components/AdminSetup.vue"),
      meta: { requiresAuth: true },
    },

    {
      path: "/leaderboard",
      name: "season-leaderboard",
      component: () => import("@/views/SeasonLeaderboard.vue"),
      meta: { requiresAuth: false },
    },
  ],
});

// 路由守衛
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore();
  const gameStore = useGameStore();

  // 如果還在載入中，等待載入完成
  if (authStore.loading) {
    return new Promise((resolve) => {
      const checkLoading = () => {
        if (!authStore.loading) {
          // 載入完成後，重新執行路由檢查
          resolve(handleRoute(to, from));
        } else {
          setTimeout(checkLoading, 100);
        }
      };
      checkLoading();
    });
  }

  // 處理路由邏輯
  return handleRoute(to, from);
});

// 路由處理函數
async function handleRoute(to: any, from: any) {
  const authStore = useAuthStore();
  const gameStore = useGameStore();

  // 檢查是否有更新前保存的路徑
  const preUpdatePath = sessionStorage.getItem("preUpdatePath");
  if (preUpdatePath && to.path === "/" && authStore.user) {
    sessionStorage.removeItem("preUpdatePath");
    return preUpdatePath;
  }

  // 如果用戶已登入但訪問首頁，根據情況導向適當頁面
  if (to.path === "/" && authStore.user) {
    try {
      // 檢查是否有進行中的牌局
      const ongoingGame = await gameStore.checkUserOngoingGame(authStore.user.uid);
      if (ongoingGame) {
        return "/ongoing";
      } else {
        return "/setup";
      }
    } catch (error) {
      console.error("載入當前牌局失敗:", error);
      return "/setup";
    }
  }

  // 檢查需要認證的路由
  if (to.meta.requiresAuth && !authStore.user) {
    return "/";
  } else {
    return true;
  }
}

export default router;
