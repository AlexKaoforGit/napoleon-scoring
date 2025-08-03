// src/stores/authStore.ts
import { defineStore } from "pinia";
import { auth, db } from "@/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, computed } from "vue";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(auth.currentUser);
  const loading = ref(true);

  // 監聽使用者狀態
  onAuthStateChanged(auth, async (current) => {
    user.value = current;
    loading.value = false;

    // 當用戶登入時，檢查並確保 Firestore 中有用戶資料
    if (current) {
      await checkAndCreateUserDoc(current);
    }
  });

  async function register(email: string, password: string, displayName: string) {
    try {
      // 創建 Firebase Auth 用戶
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

      // 更新用戶的顯示名稱
      await updateProfile(newUser, { displayName });

      // 在 Firestore 建立對應的 users 文件
      await setDoc(doc(db, "users", newUser.uid), {
        uid: newUser.uid,
        displayName,
        email,
        role: "user", // 預設為一般用戶
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("用戶註冊成功，資料已寫入 Firestore");
    } catch (error: any) {
      console.error("註冊失敗:", error);
      // 提供更友善的錯誤訊息
      if (error.code === "auth/email-already-in-use") {
        throw new Error("此電子郵件已被註冊");
      } else if (error.code === "auth/weak-password") {
        throw new Error("密碼強度不足，請使用至少6個字符");
      } else if (error.code === "auth/invalid-email") {
        throw new Error("電子郵件格式不正確");
      } else {
        throw new Error(`註冊失敗: ${error.message}`);
      }
    }
  }

  async function login(email: string, password: string) {
    try {
      const { user: loginUser } = await signInWithEmailAndPassword(auth, email, password);

      // 登入成功後檢查 Firestore 中是否有用戶資料
      await checkAndCreateUserDoc(loginUser);
    } catch (error: any) {
      console.error("登入失敗:", error);
      // 簡化的錯誤訊息
      if (error.code === "auth/invalid-email") {
        throw new Error("電子郵件格式不正確");
      } else if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential" ||
        error.code === "auth/user-not-found"
      ) {
        throw new Error("電子郵件地址或密碼不正確");
      } else if (error.code === "auth/too-many-requests") {
        throw new Error("登入嘗試次數過多，請稍後再試");
      } else if (error.code === "auth/user-disabled") {
        throw new Error("此帳號已被停用");
      } else if (error.code === "auth/network-request-failed") {
        throw new Error("網路連線失敗，請檢查網路連線");
      } else {
        throw new Error("電子郵件地址或密碼不正確");
      }
    }
  }

  // 檢查並創建用戶資料文件
  async function checkAndCreateUserDoc(user: any) {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // 如果用戶資料不存在，則創建
        console.log("用戶資料不存在，正在創建...");
        await setDoc(userDocRef, {
          uid: user.uid,
          displayName: user.displayName || "", // 使用 Firebase Auth 中的 displayName，如果沒有則為空
          email: user.email,
          role: "user", // 預設為一般用戶
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("用戶資料創建成功");
      } else {
        console.log("用戶資料已存在");
        // 如果用戶資料存在，更新最後登入時間和 email（如果 email 有變更）
        const updateData: any = {
          updatedAt: new Date(),
        };

        // 如果 Firebase Auth 中的 email 與 Firestore 中的不同，則更新
        if (user.email !== userDoc.data()?.email) {
          updateData.email = user.email;
        }

        // 如果 Firebase Auth 中有 displayName 但 Firestore 中沒有，則更新
        if (user.displayName && !userDoc.data()?.displayName) {
          updateData.displayName = user.displayName;
        }

        await updateDoc(userDocRef, updateData);
      }
    } catch (error: any) {
      console.error("檢查/創建用戶資料失敗:", error);
      // 不拋出錯誤，避免影響登入流程
    }
  }

  async function logout() {
    await signOut(auth);
  }

  async function updateDisplayName(displayName: string) {
    try {
      if (!auth.currentUser) {
        throw new Error("用戶未登入");
      }

      // 更新 Firebase Auth 的顯示名稱
      await updateProfile(auth.currentUser, { displayName });

      // 更新 Firestore 中的用戶資料
      const userDocRef = doc(db, "users", auth.currentUser.uid);
      await updateDoc(userDocRef, {
        displayName,
        updatedAt: new Date(),
      });

      console.log("顯示名稱更新成功");
    } catch (error: any) {
      console.error("更新顯示名稱失敗:", error);
      throw new Error(`更新顯示名稱失敗: ${error.message}`);
    }
  }

  async function verifyCurrentPassword(currentPassword: string) {
    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error("用戶未登入或電子郵件不存在");
      }

      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true; // 目前密碼正確
    } catch (error: any) {
      if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        throw new Error("目前密碼不正確");
      } else {
        throw new Error(`驗證目前密碼失敗: ${error.message}`);
      }
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    try {
      if (!auth.currentUser || !auth.currentUser.email) {
        throw new Error("用戶未登入或電子郵件不存在");
      }

      // 目前密碼已經在 verifyCurrentPassword 中驗證過了，直接更新新密碼
      try {
        await updatePassword(auth.currentUser, newPassword);
        console.log("密碼更改成功");
      } catch (error: any) {
        if (error.code === "auth/weak-password") {
          throw new Error("新密碼強度不足，請使用至少6個字符");
        } else {
          throw new Error(`更新密碼失敗: ${error.message}`);
        }
      }
    } catch (error: any) {
      console.error("更改密碼失敗:", error);
      throw error; // 重新拋出已經處理過的錯誤
    }
  }

  // 獲取當前用戶的角色
  async function getUserRole(): Promise<string> {
    if (!user.value) return "user";

    try {
      const userDoc = await getDoc(doc(db, "users", user.value.uid));
      if (userDoc.exists()) {
        return userDoc.data()?.role || "user";
      }
      return "user";
    } catch (error) {
      console.error("獲取用戶角色失敗:", error);
      return "user";
    }
  }

  return {
    user,
    loading,
    getUserRole,
    register,
    login,
    logout,
    updateDisplayName,
    verifyCurrentPassword,
    changePassword,
  };
});
