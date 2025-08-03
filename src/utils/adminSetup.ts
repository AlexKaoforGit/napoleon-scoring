import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

/**
 * 設定用戶為管理員
 * @param userId 用戶的 UID
 * @param email 用戶的 email（用於確認）
 */
export async function setUserAsAdmin(userId: string, email: string): Promise<void> {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("用戶不存在");
    }

    const userData = userDoc.data();
    if (userData.email !== email) {
      throw new Error("Email 不匹配");
    }

    await updateDoc(userDocRef, {
      role: "admin",
      updatedAt: new Date(),
    });

    console.log(`用戶 ${email} 已設定為管理員`);
  } catch (error: any) {
    console.error("設定管理員失敗:", error);
    throw error;
  }
}

/**
 * 移除用戶的管理員權限
 * @param userId 用戶的 UID
 */
export async function removeUserAdmin(userId: string): Promise<void> {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("用戶不存在");
    }

    await updateDoc(userDocRef, {
      role: "user",
      updatedAt: new Date(),
    });

    console.log("管理員權限已移除");
  } catch (error: any) {
    console.error("移除管理員權限失敗:", error);
    throw error;
  }
}

/**
 * 檢查用戶是否為管理員
 * @param userId 用戶的 UID
 */
export async function checkUserIsAdmin(userId: string): Promise<boolean> {
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      return false;
    }

    const userData = userDoc.data();
    return userData.role === "admin";
  } catch (error: any) {
    console.error("檢查管理員權限失敗:", error);
    return false;
  }
}
