# Vue 3 + Vite + Firestore 計分系統開發方案

## **1 架構設計**

### **前端**

- **Vue 3 + Vite**：使用 Composition API 與 [<script setup>] 風格編寫元件。Vite 提供快速的開發伺服器與高度優化的產出。
- **Pinia**：官方建議的狀態管理工具，比 Vuex 更輕量且支援 TypeScript，適合集中管理登入狀態、玩家清單及當前牌局資料。
- **Vue Router**：路由管理，將註冊/登入頁、遊戲設定頁、計分頁分開，方便維護。
- **UI 框架**：可視需求引入 Element Plus、Vuetify 或自行撰寫。以下範例以原生 Vue 3 元件為主。

### **Firebase 後端**

- **Firebase Auth**：處理使用者註冊、登入、登出。配合 Email/Password 驗證即可滿足需求。VueFire 3 提供 VueFireAuth 模組，註冊後即可在應用程式注入 Auth 實例 。
- **Firestore**：雲端 NoSQL 資料庫，用來儲存玩家資訊、牌局資料及每局結果。使用 Firebase v9 之後的模組化 SDK。新增文件可以使用 addDoc() 函式 ，更新資料使用 updateDoc() 。
- **安全規則**：設定只允許已驗證的使用者讀寫屬於自己或比賽資料的紀錄，例如限定讀取 games 集合時玩家包含自己的 uid。

## **2 資料模型**

下面採用 Firestore 的 **集合/文件** 結構來儲存資料：

| **集合** | **文件字段** | **說明** |
| --- | --- | --- |
| users | uid、displayName、email、createdAt | 註冊玩家基本資訊，可擴充照片或其他屬性。 |
| games | hostId、players: string[]、betAmount: number、createdAt、status、scores: Record<string,number> | 一場牌局。players 是五位玩家的 uid，betAmount 可隨時修改，scores 紀錄目前總分。status 可為 ongoing 或 finished。 |
| games/{gameId}/rounds | napoleonId、secretaryId、`contractType: ‘standard’ | ‘dictator’、extraTricks: number、scores: Record<string,number>、createdAt` |

**可擴充設計**：若牌局需要統計每個回合的賭金結果，可將 money: Record<string,number> 放入 rounds 或計算完後寫入 games 文件。

## **3 計分邏輯實作**

### **3.1 計分規則摘要**

1. **標準制** – 拿破崙選擇他人為秘書時使用。
    - **成功（成約）**：
        - 拿破崙：+100 分
        - 秘書：+50 分
        - 每位防家：−50 分
        - 超吃每張再加減：拿破崙 +20、秘書 +10、防家 −10。
    - **失敗（倒約）**：
        - 拿破崙：缺少張數 × −40
        - 秘書：缺少張數 × −20
        - 每位防家：缺少張數 × +20
2. **獨裁制** – 拿破崙自己當秘書時使用。
    - **成功**：
        - 拿破崙：+400 分
        - 每位防家：−100 分
        - 超吃每張再加減：拿破崙 +40、防家 −10。
    - **失敗**：
        - 拿破崙：缺少張數 × −40
        - 每位防家：缺少張數 × +10

### **3.2 計分函式**

### **calculateRoundScores**

為了使代碼容易維護，可以將計分邏輯封裝於單獨模組，例如 src/utils/score.ts。下面以 TypeScript 實作：

```tsx
// src/utils/score.ts
export interface RoundInput {
  contractType: 'standard' | 'dictator';
  napoleonId: string;
  secretaryId: string; // 若為獨裁制，此欄等於 napoleonId
  extraTricks: number; // 正值表示超吃，負值代表缺少
  playerIds: string[]; // 五位玩家 uid
}

export interface ScoreMap {
  [uid: string]: number;
}

/**
 * 計算一局的各玩家分數。
 * @param input 回合資訊
 */
export function calculateRoundScores(input: RoundInput): ScoreMap {
  const { contractType, napoleonId, secretaryId, extraTricks, playerIds } = input;
  const defenders = playerIds.filter((id) => id !== napoleonId && id !== secretaryId);
  const scores: ScoreMap = {};

  // extraCount: 成功時的超吃張數；missingCount: 失敗時的缺少張數
  const extraCount = Math.max(0, extraTricks);
  const missingCount = Math.max(0, -extraTricks);

  const isDictator = contractType === 'dictator' || napoleonId === secretaryId;

  if (!isDictator) {
    // 標準制
    if (extraTricks >= 0) {
      // 成功：成約分 + 超吃分
      scores[napoleonId] = 100 + extraCount * 20;
      scores[secretaryId] = 50 + extraCount * 10;
      defenders.forEach((id) => {
        scores[id] = -50 + extraCount * -10;
      });
    } else {
      // 失敗：倒約分
      scores[napoleonId] = -40 * missingCount;
      scores[secretaryId] = -20 * missingCount;
      defenders.forEach((id) => {
        scores[id] = 20 * missingCount;
      });
    }
  } else {
    // 獨裁制
    if (extraTricks >= 0) {
      // 成功
      scores[napoleonId] = 400 + extraCount * 40;
      defenders.forEach((id) => {
        scores[id] = -100 + extraCount * -10;
      });
    } else {
      // 失敗
      scores[napoleonId] = -40 * missingCount;
      defenders.forEach((id) => {
        scores[id] = 10 * missingCount;
      });
    }
  }

  return scores;
}
```

這個函式將所有玩家的分數包裝成 ScoreMap，方便後續累積計算及傳送給 Firestore。

### **3.3 累積總分與賭注金額**

牌局進行過程中可在 Pinia 的 gameStore 或者 Firestore 的 games 文件中維護 scores 欄位，結束某一局後：

1. 調用 calculateRoundScores 取得該局每位玩家的分數。
2. 使用 Firestore 的 updateDoc() 對 games/{gameId} 文件的 scores 欄位進行 **增量更新**（可透過 increment() 避免競爭）。Firebase 官方文件說明了如何更新文件 。
3. 同時在 games/{gameId}/rounds 子集合中呼叫 addDoc() 新增回合紀錄 。

最後金額計算為 finalMoney = score * betAmount，顯示於前端，不必儲存於 Firestore（除非要記錄歷史交易）。

## **4 前端程式碼範例**

### **4.1 初始化 Firebase**

建立 src/firebase.ts 用於初始化 Firebase：

這個函式將所有玩家的分數包裝成 ScoreMap，方便後續累積計算及傳送給 Firestore。

### **3.3 累積總分與賭注金額**

牌局進行過程中可在 Pinia 的 gameStore 或者 Firestore 的 games 文件中維護 scores 欄位，結束某一局後：

1. 調用 calculateRoundScores 取得該局每位玩家的分數。
2. 使用 Firestore 的 updateDoc() 對 games/{gameId} 文件的 scores 欄位進行 **增量更新**（可透過 increment() 避免競爭）。Firebase 官方文件說明了如何更新文件 。
3. 同時在 games/{gameId}/rounds 子集合中呼叫 addDoc() 新增回合紀錄 。

最後金額計算為 finalMoney = score * betAmount，顯示於前端，不必儲存於 Firestore（除非要記錄歷史交易）。

## **4 前端程式碼範例**

### **4.1 初始化 Firebase**

建立 src/firebase.ts 用於初始化 Firebase：

```tsx
// src/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// 可以根據需要加入 getAnalytics 等函式

// firebaseConfig 從環境變數讀取，避免硬編碼憑證
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// 初始化 Firebase app
const app = initializeApp(firebaseConfig);

// 取得模組化 SDK 實例
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
```

此範例使用 Firebase 模組化 SDK，先透過 initializeApp 建立應用，再取得 Auth 與 Firestore 實例；這與 GeeksforGeeks 教學中初始化 Firebase 的方式一致 。

### **4.2 Pinia 狀態管理**

建立 src/stores/authStore.ts 管理使用者登入狀態：

```tsx
// src/stores/authStore.ts
import { defineStore } from 'pinia';
import { auth } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(auth.currentUser);
  const loading = ref(true);

  // 監聽使用者狀態
  onAuthStateChanged(auth, (current) => {
    user.value = current;
    loading.value = false;
  });

  async function register(email: string, password: string, displayName: string) {
    try {
      const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(newUser, { displayName });
      // 註冊成功後可在 Firestore 建立對應的 users 文件
      // await setDoc(doc(db, 'users', newUser.uid), { uid: newUser.uid, displayName, email });
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async function login(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return { user, loading, register, login, logout };
});
```

此 store 管理 user 狀態並提供 register、login、logout 方法。透過 onAuthStateChanged 監聽登入狀態改變。

### **4.3 遊戲狀態管理**

建立 src/stores/gameStore.ts 管理當前牌局資料：

```tsx
// src/stores/gameStore.ts
import { defineStore } from 'pinia';
import { db } from '@/firebase';
import { collection, doc, addDoc, updateDoc, increment } from 'firebase/firestore';
import { ref, computed } from 'vue';
import { calculateRoundScores, ScoreMap } from '@/utils/score';

export interface Game {
  id: string;
  players: string[];
  betAmount: number;
  scores: Record<string, number>;
}

export const useGameStore = defineStore('game', () => {
  const currentGame = ref<Game | null>(null);

  async function createGame(playerIds: string[], betAmount: number) {
    try {
      if (playerIds.length !== 5) throw new Error('必須選擇五位玩家');
      const scores: Record<string, number> = {};
      playerIds.forEach((id) => (scores[id] = 0));
      const gameDoc = await addDoc(collection(db, 'games'), {
        hostId: playerIds[0], // 例如第一位為開局者
        players: playerIds,
        betAmount,
        scores,
        status: 'ongoing',
        createdAt: new Date(),
      });
      currentGame.value = { id: gameDoc.id, players: playerIds, betAmount, scores };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  async function addRound(input: {
    napoleonId: string;
    secretaryId: string;
    contractType: 'standard' | 'dictator';
    extraTricks: number;
  }) {
    if (!currentGame.value) throw new Error('尚未建立牌局');
    const { id, players, betAmount } = currentGame.value;

    // 計算分數
    const roundScores = calculateRoundScores({
      ...input,
      playerIds: players,
    });

    // 在 rounds 子集合新增回合
    await addDoc(collection(db, 'games', id, 'rounds'), {
      ...input,
      scores: roundScores,
      createdAt: new Date(),
    });

    // 更新 games 文件的總分
    const gameRef = doc(db, 'games', id);
    const updates: any = {};
    for (const uid in roundScores) {
      updates[`scores.${uid}`] = increment(roundScores[uid]);
    }
    await updateDoc(gameRef, updates);

    // 更新 local state
    for (const uid in roundScores) {
      currentGame.value!.scores[uid] += roundScores[uid];
    }
  }

  const monetaryResults = computed(() => {
    if (!currentGame.value) return {} as Record<string, number>;
    const result: Record<string, number> = {};
    currentGame.value.players.forEach((uid) => {
      result[uid] = currentGame.value!.scores[uid] * currentGame.value!.betAmount;
    });
    return result;
  });

  return { currentGame, createGame, addRound, monetaryResults };
});
```

createGame() 會建立一筆牌局文件並初始化分數；addRound() 用來新增回合，呼叫前述計分函式後寫入 rounds 子集合，再使用 Firestore 的 increment() 原子更新每位玩家的總分。使用 computed 屬性 monetaryResults 根據當前賭注計算最終金額。

### **4.4 介面元件簡述**

以下僅展示核心邏輯，省略 UI 樣式：

### **Login.vue**

```tsx
<template>
  <form @submit.prevent="onSubmit">
    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="password" type="password" placeholder="Password" required />
    <button type="submit">登入</button>
  </form>
  <p v-if="error">{{ error }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';

const authStore = useAuthStore();
const email = ref('');
const password = ref('');
const error = ref('');

async function onSubmit() {
  error.value = '';
  try {
    await authStore.login(email.value, password.value);
  } catch (e: any) {
    error.value = e.message;
  }
}
</script>
```

**GameSetup.vue**

```tsx
<template>
  <div>
    <h2>建立新牌局</h2>
    <div>
      <label>選擇五位玩家：</label>
      <select v-model="selected" multiple size="6">
        <option v-for="u in users" :key="u.uid" :value="u.uid">
          {{ u.displayName }}
        </option>
      </select>
    </div>
    <div>
      <label>賭注金額：</label>
      <input type="number" v-model.number="bet" min="1" />
    </div>
    <button @click="create">開始牌局</button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';
import { db } from '@/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface UserDoc { uid: string; displayName: string; }

const users = ref<UserDoc[]>([]);
const selected = ref<string[]>([]);
const bet = ref(1);
const error = ref('');
const gameStore = useGameStore();

onMounted(async () => {
  // 讀取所有已註冊玩家
  const snap = await getDocs(collection(db, 'users'));
  users.value = snap.docs.map((doc) => doc.data() as UserDoc);
});

async function create() {
  error.value = '';
  try {
    await gameStore.createGame(selected.value, bet.value);
  } catch (e: any) {
    error.value = e.message;
  }
}
</script>
```

**RoundInput.vue**

```tsx
<template>
  <div v-if="game">
    <h2>輸入本局結果</h2>
    <div>
      <label>計分模式：</label>
      <select v-model="contractType">
        <option value="standard">標準制</option>
        <option value="dictator">獨裁制</option>
      </select>
    </div>
    <div>
      <label>拿破崙：</label>
      <select v-model="napoleonId">
        <option v-for="uid in game.players" :key="uid" :value="uid">
          {{ getUserName(uid) }}
        </option>
      </select>
    </div>
    <div v-if="contractType === 'standard'">
      <label>秘書：</label>
      <select v-model="secretaryId">
        <option v-for="uid in game.players" :key="uid" :value="uid">
          {{ getUserName(uid) }}
        </option>
      </select>
    </div>
    <div>
      <label>超吃張數 (正表示超吃, 負表示缺少)：</label>
      <input type="number" v-model.number="extraTricks" />
    </div>
    <button @click="submitRound">送出本局</button>
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { useAuthStore } from '@/stores/authStore';

const gameStore = useGameStore();
const authStore = useAuthStore();

const game = computed(() => gameStore.currentGame);
const contractType = ref<'standard' | 'dictator'>('standard');
const napoleonId = ref<string>('');
const secretaryId = ref<string>('');
const extraTricks = ref(0);
const error = ref('');

function getUserName(uid: string) {
  // 從 authStore 或其他地方取暱稱
  return uid;
}

async function submitRound() {
  error.value = '';
  if (!game.value) return;
  try {
    const secId = contractType.value === 'dictator' ? napoleonId.value : secretaryId.value;
    await gameStore.addRound({
      napoleonId: napoleonId.value,
      secretaryId: secId,
      contractType: contractType.value,
      extraTricks: extraTricks.value,
    });
    // 重置輸入
    extraTricks.value = 0;
  } catch (e: any) {
    error.value = e.message;
  }
}
</script>
```

**Scoreboard.vue**

```tsx
<template>
  <div v-if="game">
    <h2>當前總分</h2>
    <table>
      <thead>
        <tr>
          <th>玩家</th>
          <th>總分</th>
          <th>金額</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="uid in game.players" :key="uid">
          <td>{{ getUserName(uid) }}</td>
          <td>{{ game.scores[uid] }}</td>
          <td>{{ monetaryResults[uid] }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';

const gameStore = useGameStore();
const game = computed(() => gameStore.currentGame);
const monetaryResults = computed(() => gameStore.monetaryResults);

function getUserName(uid: string) {
  // 從緩存或 user 列表取得顯示名稱
  return uid;
}
</script>
```

以上元件示範了核心邏輯：登入、建立牌局、輸入回合結果以及顯示分數。實際專案中還需加入表單驗證、loading 狀態、失敗提示、UI 樣式以及玩家暱稱顯示等。

## **5 效能與可維護性建議**

- **模組化與分層**：將 Firebase 初始化、Pinia store、計分邏輯、UI 元件分開，方便日後替換資料庫或修改邏輯。撰寫獨立的 utils/score.ts 可使單元測試更容易。
- **資料同步**：利用 Firestore 的即時訂閱 (onSnapshot) 更新畫面，避免輪詢。若遊戲狀態改變時需要即時通知所有玩家，可在 gameStore 中使用 onSnapshot(doc(db,'games',id)) 監聽變化。
- **錯誤處理**：所有 async 操作皆使用 try-catch，向使用者顯示友善訊息並寫入 log。Pinia store 可以集中錯誤訊息方便 UI 統一處理。
- **環境安全**：將 Firebase 配置存放在 .env 檔案中，透過 Vite 的 import.meta.env 讀取。設定 Firestore 規則限制未授權讀寫。
- **效能**：計分邏輯在前端執行即可，不會造成重複網路請求。更新總分時可使用 Firestore 的 increment() 原子操作，減少讀寫衝突。若牌局資料變大，可考慮只存每局累計分數，回合詳情則使用 Cloud Functions 計算。

## **6 單元測試思路**

- 使用 [Vitest](https://vitest.dev/) 或 Jest 測試計分函式 calculateRoundScores。針對各種情境（標準成功、標準失敗、獨裁成功、獨裁失敗）撰寫測試，確保輸出符合規則。
- 對 gameStore 的 addRound 測試：模擬 Firestore 方法 (addDoc, updateDoc)；驗證呼叫次數及對 scores 的累加是否正確。
- 對元件使用 [Vue Test Utils](https://test-utils.vuejs.org/) 模擬表單輸入及事件觸發，確保畫面與狀態同步。
- 測試登入流程時可使用 Firebase 提供的 Emulator Suite，在本機端使用 connectAuthEmulator 及 connectFirestoreEmulator 來模擬後端，不會影響真實資料庫。

## **7 總結**

上述方案遵循了前端與後端分離的原則，前端利用 Vue 3 + Vite 進行開發，以 Pinia 管理狀態並在前端實作計分邏輯，透過 Firebase Auth 處理註冊登入，FireStore 儲存玩家與牌局資料。初始化 Firebase 時使用模組化 SDK 並採用環境變數來安全地讀取配置 。新增與更新文件皆使用 Firebase 文件所示的 addDoc() 與 updateDoc() 方法 。

此設計強調代碼可讀性、模組化與可維護性，適合實務開發。若未來需要擴充，例如引入排行榜或多場同時進行，也能在不影響核心邏輯的情況下延伸。針對錯誤處理、效能優化及單元測試部分，也提供了實務建議供參考。