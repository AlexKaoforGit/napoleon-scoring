# 拿破崙計分系統 - 設定指南

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. Firebase 專案設定

#### 步驟 1：建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「建立專案」
3. 輸入專案名稱（例如：napoleon-scoring）
4. 選擇是否啟用 Google Analytics（可選）
5. 點擊「建立專案」

#### 步驟 2：啟用 Authentication

1. 在 Firebase Console 中，點擊左側選單的「Authentication」
2. 點擊「開始使用」
3. 在「登入方式」標籤中，啟用「電子郵件/密碼」
4. 點擊「儲存」

#### 步驟 3：建立 Firestore 資料庫

1. 在 Firebase Console 中，點擊左側選單的「Firestore Database」
2. 點擊「建立資料庫」
3. 選擇「以測試模式開始」（開發階段）
4. 選擇資料庫位置（建議選擇離您最近的區域）
5. 點擊「完成」

#### 步驟 4：取得 Web 應用程式配置

1. 在 Firebase Console 中，點擊專案設定（齒輪圖示）
2. 在「一般」標籤中，向下滾動到「您的應用程式」
3. 點擊「新增應用程式」圖示，選擇「Web」
4. 輸入應用程式暱稱（例如：napoleon-scoring-web）
5. 點擊「註冊應用程式」
6. 複製配置物件，看起來像這樣：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

### 3. 設定環境變數

在專案根目錄建立 `.env` 檔案：

```env
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 4. 設定 Firestore 安全規則

在 Firebase Console 的 Firestore Database 中，點擊「規則」標籤，並貼上以下規則：

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

現在您可以在瀏覽器中開啟 `http://localhost:5173` 來使用應用程式！

## 使用說明

### 首次使用

1. 點擊「立即註冊」建立新帳號
2. 輸入顯示名稱、電子郵件和密碼
3. 註冊成功後會自動登入

### 建立牌局

1. 在「新牌局」頁面選擇五位玩家
2. 設定賭注金額
3. 點擊「開始牌局」

### 輸入回合

1. 選擇計分模式（標準制/獨裁制）
2. 選擇拿破崙玩家
3. 如果是標準制，選擇秘書玩家
4. 輸入超吃張數（正數表示超吃，負數表示缺少）
5. 點擊「送出本局」

### 查看計分板

- 即時顯示每位玩家的總分、金額和排名
- 顯示最高分、最低分和總金額統計

## 故障排除

### 常見問題

**Q: 無法註冊或登入？**
A: 檢查 Firebase Authentication 是否已啟用電子郵件/密碼登入方式。

**Q: 無法讀取或寫入資料？**
A: 檢查 Firestore 安全規則是否正確設定。

**Q: 環境變數無法讀取？**
A: 確保 `.env` 檔案在專案根目錄，且變數名稱以 `VITE_` 開頭。

**Q: 建置失敗？**
A: 檢查 TypeScript 錯誤，確保所有 import 路徑正確。

### 開發工具

- **Vue DevTools**：安裝 Vue DevTools 瀏覽器擴充功能來除錯
- **Firebase Console**：在 Firebase Console 中查看即時資料庫狀態
- **瀏覽器開發者工具**：查看 Console 錯誤訊息

## 部署到生產環境

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

4. 選擇您的 Firebase 專案
5. 設定 public 目錄為 `dist`
6. 設定為單頁應用程式：`Yes`
7. 不要覆寫 `index.html`：`No`

8. 部署：

```bash
firebase deploy
```

部署完成後，您會得到一個公開的 URL，例如：`https://your-project.web.app`

## 資料結構

### Firestore 集合結構

```
users/
  {userId}/
    uid: string
    displayName: string
    email: string
    createdAt: timestamp

games/
  {gameId}/
    hostId: string
    players: string[]
    betAmount: number
    scores: {[uid: string]: number}
    status: 'ongoing' | 'finished'
    createdAt: timestamp

games/{gameId}/rounds/
  {roundId}/
    napoleonId: string
    secretaryId: string
    contractType: 'standard' | 'dictator'
    extraTricks: number
    scores: {[uid: string]: number}
    createdAt: timestamp
```

## 支援

如果您遇到任何問題，請：

1. 檢查瀏覽器 Console 的錯誤訊息
2. 確認 Firebase 設定是否正確
3. 查看 Firebase Console 的日誌
4. 提交 Issue 到專案儲存庫
