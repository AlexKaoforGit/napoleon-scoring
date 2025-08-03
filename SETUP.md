# 拿破麻計分系統 - 設置指南

## 環境設置

### 1. 安裝依賴

```bash
npm install
```

### 2. Firebase 配置

1. 複製 `src/firebase.example.ts` 為 `src/firebase.ts`
2. 在 `src/firebase.ts` 中填入你的 Firebase 配置：
   - `apiKey`: 你的 Firebase API Key
   - `authDomain`: 你的 Firebase Auth Domain
   - `projectId`: 你的 Firebase Project ID
   - `storageBucket`: 你的 Firebase Storage Bucket
   - `messagingSenderId`: 你的 Firebase Messaging Sender ID
   - `appId`: 你的 Firebase App ID
   - `measurementId`: 你的 Firebase Measurement ID

### 3. 開發環境運行

```bash
npm run dev
```

### 4. 建置生產版本

```bash
npm run build
```

### 5. 部署到 Firebase

```bash
npm run deploy
```

## 安全注意事項

- `src/firebase.ts` 包含敏感配置，已被加入 `.gitignore`
- 請確保不要將包含真實 API Key 的文件提交到 Git
- 使用 `src/firebase.example.ts` 作為配置模板

## 功能特色

- 拿破崙牌局計分系統
- 用戶註冊和登入
- 即時分數計算
- 歷史記錄查看
- 管理員權限管理
- 響應式設計（支援手機版）
