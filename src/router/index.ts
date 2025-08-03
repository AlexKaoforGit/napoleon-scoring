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
  ],
});

// 路由守衛
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  // 如果還在載入中，等待載入完成
  if (authStore.loading) {
    // 使用更簡單的方法等待載入完成
    const checkLoading = () => {
      if (!authStore.loading) {
        // 載入完成後，重新檢查路由
        if (to.meta.requiresAuth && !authStore.user) {
          next("/");
        } else {
          next();
        }
      } else {
        // 如果還在載入，繼續等待
        setTimeout(checkLoading, 100);
      }
    };
    checkLoading();
    return; // 重要：在這裡返回，避免執行後面的 next()
  }

  // 已經載入完成，直接檢查
  if (to.meta.requiresAuth && !authStore.user) {
    next("/");
  } else {
    next();
  }
});

export default router;
