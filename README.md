# 拿破崙計分系統

一個基於 Vue 3 + Vite + Firebase 的拿破崙牌局計分系統。

## 功能特色

- 🔐 使用者認證（註冊/登入）
- 🎮 建立新牌局（選擇五位玩家，設定賭注金額）
- 📊 即時計分（標準制/獨裁制）
- 💰 自動計算金額
- 📱 響應式設計
- 🔄 即時資料同步

## 計分規則

### 標準制

- **成功（成約）**：

  - 拿破崙：+100 分
  - 秘書：+50 分
  - 每位防家：−50 分
  - 超吃每張再加減：拿破崙 +20、秘書 +10、防家 −10

- **失敗（倒約）**：
  - 拿破崙：缺少張數 × −40
  - 秘書：缺少張數 × −20
  - 每位防家：缺少張數 × +20

### 獨裁制

- **成功**：

  - 拿破崙：+400 分
  - 每位防家：−100 分
  - 超吃每張再加減：拿破崙 +40、防家 −10

- **失敗**：
  - 拿破崙：缺少張數 × −40
  - 每位防家：缺少張數 × +10

## 技術架構

- **前端**：Vue 3 + TypeScript + Vite
- **狀態管理**：Pinia
- **路由**：Vue Router
- **後端**：Firebase (Auth + Firestore)
- **樣式**：CSS3 + 響應式設計

## 安裝與設定

### 1. 安裝依賴

```bash
npm install
```

### 2. Firebase 設定

1. 前往 [Firebase Console](https://console.firebase.google.com/) 建立新專案
2. 啟用 Authentication（Email/Password）
3. 建立 Firestore 資料庫
4. 在專案設定中取得 Web 應用程式配置

### 3. 環境變數

在專案根目錄建立 `.env` 檔案：

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id
```

### 4. Firestore 安全規則

設定 Firestore 安全規則：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 使用者只能讀寫自己的資料
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // 遊戲資料允許已認證使用者讀寫
    match /games/{gameId} {
      allow read, write: if request.auth != null;

      // 回合資料
      match /rounds/{roundId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

### 5. 啟動開發伺服器

```bash
npm run dev
```

## 使用流程

1. **註冊/登入**：首次使用需要註冊帳號
2. **建立牌局**：選擇五位玩家並設定賭注金額
3. **輸入回合**：選擇拿破崙、秘書（標準制），輸入超吃張數
4. **查看計分板**：即時查看總分、排名和金額

## 專案結構

```
src/
├── components/          # Vue 元件
│   ├── Login.vue       # 登入/註冊
│   ├── GameSetup.vue   # 遊戲設定
│   ├── RoundInput.vue  # 回合輸入
│   └── Scoreboard.vue  # 計分板
├── stores/             # Pinia 狀態管理
│   ├── authStore.ts    # 認證狀態
│   └── gameStore.ts    # 遊戲狀態
├── utils/              # 工具函式
│   └── score.ts        # 計分邏輯
├── router/             # 路由配置
├── firebase.ts         # Firebase 初始化
└── App.vue            # 主應用程式
```

## 部署

### 建置生產版本

```bash
npm run build
```

### 部署到 Firebase Hosting

1. 安裝 Firebase CLI：

```bash
npm install -g firebase-tools
```

2. 登入 Firebase：

```bash
firebase login
```

3. 初始化專案：

```bash
firebase init hosting
```

4. 部署：

```bash
firebase deploy
```

## 開發指南

### 新增功能

1. 在 `src/components/` 建立新元件
2. 在 `src/stores/` 新增狀態管理
3. 在 `src/router/index.ts` 新增路由
4. 更新導航選單

### 測試

```bash
npm run test
```

### 程式碼檢查

```bash
npm run lint
```

## 授權

MIT License

## 貢獻

歡迎提交 Issue 和 Pull Request！
