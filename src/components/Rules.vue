<template>
  <div class="rules-container">
    <div class="rules-card">
      <h1>拿破崙計分規則</h1>

      <!-- 模式切換 -->
      <div class="mode-toggle">
        <label class="radio-option">
          <input type="radio" v-model="selectedMode" value="five" name="gameMode" />
          <span class="radio-label">五人模式</span>
        </label>
        <label class="radio-option">
          <input type="radio" v-model="selectedMode" value="four" name="gameMode" />
          <span class="radio-label">四人模式</span>
        </label>
      </div>

      <div class="rules-section">
        <h2>遊戲概述</h2>
        <p>
          拿破崙是一種撲克牌遊戲，支援四人或五人模式。由一位拿破崙（主導者）與其他玩家對抗。遊戲分為標準制和獨裁制兩種模式。
        </p>
      </div>

      <!-- 五人模式規則 -->
      <div v-if="selectedMode === 'five'" class="rules-section">
        <h2>標準制（五人模式）</h2>
        <p class="rule-description">拿破崙選擇他人為秘書時使用此規則。</p>

        <div class="rule-subsection">
          <h3>成功（成約）</h3>
          <ul>
            <li><strong>拿破崙</strong>：+100 分</li>
            <li><strong>秘書</strong>：+50 分</li>
            <li><strong>每位防家</strong>：-50 分</li>
            <li>
              <strong>超吃每張</strong>：
              <ul>
                <li>拿破崙：+20 分</li>
                <li>秘書：+10 分</li>
                <li>防家：-10 分</li>
              </ul>
            </li>
          </ul>
        </div>

        <div class="rule-subsection">
          <h3>失敗（倒約）</h3>
          <ul>
            <li><strong>拿破崙</strong>：缺少張數 × -40 分</li>
            <li><strong>秘書</strong>：缺少張數 × -20 分</li>
            <li><strong>每位防家</strong>：缺少張數 × +20 分</li>
          </ul>
        </div>
      </div>

      <!-- 四人模式規則 -->
      <div v-if="selectedMode === 'four'" class="rules-section">
        <h2>標準制（四人模式）</h2>
        <p class="rule-description">拿破崙選擇他人為秘書時使用此規則。</p>

        <div class="rule-subsection">
          <h3>成功（成約）</h3>
          <ul>
            <li><strong>拿破崙</strong>：+100 分</li>
            <li><strong>秘書</strong>：+50 分</li>
            <li><strong>每位防家</strong>：-75 分</li>
            <li>
              <strong>超吃每張</strong>：
              <ul>
                <li>拿破崙：+20 分</li>
                <li>秘書：+10 分</li>
                <li>防家：-15 分</li>
              </ul>
            </li>
          </ul>
        </div>

        <div class="rule-subsection">
          <h3>失敗（倒約）</h3>
          <ul>
            <li><strong>拿破崙</strong>：缺少張數 × -40 分</li>
            <li><strong>秘書</strong>：缺少張數 × -20 分</li>
            <li><strong>每位防家</strong>：缺少張數 × +30 分</li>
          </ul>
        </div>
      </div>

      <!-- 五人模式獨裁制 -->
      <div v-if="selectedMode === 'five'" class="rules-section">
        <h2>獨裁制（五人模式）</h2>
        <p class="rule-description">拿破崙自己當秘書時使用此規則。</p>

        <div class="rule-subsection">
          <h3>成功</h3>
          <ul>
            <li><strong>拿破崙</strong>：+400 分</li>
            <li><strong>每位防家</strong>：-100 分</li>
            <li>
              <strong>超吃每張</strong>：
              <ul>
                <li>拿破崙：+40 分</li>
                <li>防家：-10 分</li>
              </ul>
            </li>
          </ul>
        </div>

        <div class="rule-subsection">
          <h3>失敗</h3>
          <ul>
            <li><strong>拿破崙</strong>：缺少張數 × -40 分</li>
            <li><strong>每位防家</strong>：缺少張數 × +10 分</li>
          </ul>
        </div>
      </div>

      <!-- 四人模式獨裁制 -->
      <div v-if="selectedMode === 'four'" class="rules-section">
        <h2>獨裁制（四人模式）</h2>
        <p class="rule-description">拿破崙自己當秘書時使用此規則。</p>

        <div class="rule-subsection">
          <h3>成功</h3>
          <ul>
            <li><strong>拿破崙</strong>：+300 分</li>
            <li><strong>每位防家</strong>：-100 分</li>
            <li>
              <strong>超吃每張</strong>：
              <ul>
                <li>拿破崙：+30 分</li>
                <li>防家：-10 分</li>
              </ul>
            </li>
          </ul>
        </div>

        <div class="rule-subsection">
          <h3>失敗</h3>
          <ul>
            <li><strong>拿破崙</strong>：缺少張數 × -45 分</li>
            <li><strong>每位防家</strong>：缺少張數 × +15 分</li>
          </ul>
        </div>
      </div>

      <!-- 計分範例 -->
      <div class="rules-section">
        <h2>計分範例</h2>

        <!-- 五人模式範例 -->
        <div v-if="selectedMode === 'five'" class="example-subsection">
          <h3>標準制範例（五人模式）</h3>
          <div class="example-item">
            <h4>成功案例：拿破崙超吃 2 張</h4>
            <ul>
              <li>拿破崙：100 + (2 × 20) = <strong>140 分</strong></li>
              <li>秘書：50 + (2 × 10) = <strong>70 分</strong></li>
              <li>每位防家：-50 + (2 × -10) = <strong>-70 分</strong></li>
            </ul>
          </div>

          <div class="example-item">
            <h4>失敗案例：拿破崙缺少 1 張</h4>
            <ul>
              <li>拿破崙：1 × -40 = <strong>-40 分</strong></li>
              <li>秘書：1 × -20 = <strong>-20 分</strong></li>
              <li>每位防家：1 × 20 = <strong>20 分</strong></li>
            </ul>
          </div>
        </div>

        <!-- 四人模式範例 -->
        <div v-if="selectedMode === 'four'" class="example-subsection">
          <h3>標準制範例（四人模式）</h3>
          <div class="example-item">
            <h4>成功案例：拿破崙超吃 2 張</h4>
            <ul>
              <li>拿破崙：100 + (2 × 20) = <strong>140 分</strong></li>
              <li>秘書：50 + (2 × 10) = <strong>70 分</strong></li>
              <li>每位防家：-75 + (2 × -15) = <strong>-105 分</strong></li>
            </ul>
          </div>

          <div class="example-item">
            <h4>失敗案例：拿破崙缺少 1 張</h4>
            <ul>
              <li>拿破崙：1 × -40 = <strong>-40 分</strong></li>
              <li>秘書：1 × -20 = <strong>-20 分</strong></li>
              <li>每位防家：1 × 30 = <strong>30 分</strong></li>
            </ul>
          </div>
        </div>

        <!-- 五人模式獨裁制範例 -->
        <div v-if="selectedMode === 'five'" class="example-subsection">
          <h3>獨裁制範例（五人模式）</h3>
          <div class="example-item">
            <h4>成功案例：拿破崙超吃 1 張</h4>
            <ul>
              <li>拿破崙：400 + (1 × 40) = <strong>440 分</strong></li>
              <li>每位防家：-100 + (1 × -10) = <strong>-110 分</strong></li>
            </ul>
          </div>

          <div class="example-item">
            <h4>失敗案例：拿破崙缺少 2 張</h4>
            <ul>
              <li>拿破崙：2 × -40 = <strong>-80 分</strong></li>
              <li>每位防家：2 × 10 = <strong>20 分</strong></li>
            </ul>
          </div>
        </div>

        <!-- 四人模式獨裁制範例 -->
        <div v-if="selectedMode === 'four'" class="example-subsection">
          <h3>獨裁制範例（四人模式）</h3>
          <div class="example-item">
            <h4>成功案例：拿破崙超吃 1 張</h4>
            <ul>
              <li>拿破崙：300 + (1 × 30) = <strong>330 分</strong></li>
              <li>每位防家：-100 + (1 × -10) = <strong>-110 分</strong></li>
            </ul>
          </div>

          <div class="example-item">
            <h4>失敗案例：拿破崙缺少 2 張</h4>
            <ul>
              <li>拿破崙：2 × -45 = <strong>-90 分</strong></li>
              <li>每位防家：2 × 15 = <strong>30 分</strong></li>
            </ul>
          </div>
        </div>
      </div>

      <div class="rules-section">
        <h2>注意事項</h2>
        <ul>
          <li>超吃張數為正值，缺少張數為負值</li>
          <li>分數會根據設定的賭注金額進行換算</li>
          <li>最終金額 = 分數 × 賭注金額</li>
          <li>遊戲進行中可隨時查看當前總分</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const selectedMode = ref("five"); // 預設顯示五人模式
</script>

<style scoped>
.rules-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.rules-card {
  background: var(--color-background);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  padding: 40px;
  width: 100%;
  max-width: 800px;
  margin: 20px 0;
}

.rules-card h1 {
  text-align: center;
  color: var(--color-heading);
  margin-bottom: 30px;
  font-size: 28px;
  font-weight: 700;
}

.mode-toggle {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  gap: 20px;
}

.radio-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 16px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.3s ease;
  background: var(--color-background);
}

.radio-option:hover {
  border-color: #667eea;
  background: var(--color-background-soft);
}

.radio-option input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.radio-option input[type="radio"]:checked + .radio-label {
  color: #667eea;
  font-weight: 600;
}

.radio-option:has(input[type="radio"]:checked) {
  border-color: #667eea;
  background: var(--color-background-soft);
}

.radio-label {
  font-size: 16px;
  color: var(--color-text);
  cursor: pointer;
  font-weight: 500;
}

.rules-section {
  margin-bottom: 40px;
}

.rules-section p {
  color: var(--color-text);
}

.rules-section h2 {
  color: #667eea;
  font-size: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  border-bottom: 2px solid #667eea;
  padding-bottom: 8px;
}

.rule-description {
  color: var(--color-text);
  font-style: italic;
  margin-bottom: 20px;
  font-size: 16px;
}

.rule-subsection {
  margin-bottom: 24px;
  padding: 20px;
  background: var(--color-background-soft);
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.rule-subsection h3 {
  color: var(--color-heading);
  font-size: 20px;
  margin-bottom: 16px;
  font-weight: 600;
}

.rule-subsection ul {
  list-style: none;
  padding: 0;
}

.rule-subsection ul li {
  margin-bottom: 12px;
  padding-left: 20px;
  position: relative;
  color: #555;
  font-size: 16px;
  line-height: 1.6;
}

.rule-subsection ul li:before {
  content: "•";
  color: #667eea;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.rule-subsection ul li strong {
  color: var(--color-heading);
  font-weight: 600;
}

.rule-subsection ul ul {
  margin-top: 8px;
  margin-left: 20px;
}

.rule-subsection ul ul li {
  font-size: 14px;
  margin-bottom: 8px;
}

.example-subsection {
  margin-bottom: 30px;
}

.example-subsection h3 {
  color: var(--color-heading);
  font-size: 20px;
  margin-bottom: 16px;
  font-weight: 600;
}

.example-item {
  background: var(--color-background-soft);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid var(--color-border);
}

.example-item h4 {
  color: #667eea;
  font-size: 18px;
  margin-bottom: 12px;
  font-weight: 600;
}

.example-item ul {
  list-style: none;
  padding: 0;
}

.example-item ul li {
  margin-bottom: 8px;
  padding-left: 20px;
  position: relative;
  color: var(--color-text);
  font-size: 16px;
}

.example-item ul li:before {
  content: "→";
  color: #667eea;
  position: absolute;
  left: 0;
}

.example-item ul li strong {
  color: var(--color-heading);
  font-weight: 600;
}

.rules-section:last-child ul {
  list-style: none;
  padding: 0;
}

.rules-section:last-child ul li {
  margin-bottom: 12px;
  padding-left: 20px;
  position: relative;
  color: #555;
  font-size: 16px;
  line-height: 1.6;
}

.rules-section:last-child ul li:before {
  content: "ℹ";
  color: #667eea;
  position: absolute;
  left: 0;
}

@media (max-width: 768px) {
  .rules-container {
    padding: 10px;
  }

  .rules-card {
    padding: 30px 20px;
    margin: 10px;
  }

  .rules-card h1 {
    font-size: 24px;
    margin-bottom: 25px;
  }

  .mode-toggle {
    flex-direction: column;
    gap: 10px;
  }

  .radio-option {
    font-size: 16px;
  }

  .rules-section {
    margin-bottom: 30px;
  }

  .rules-section h2 {
    font-size: 20px;
    margin-bottom: 20px;
  }

  .rule-subsection {
    padding: 16px;
    margin-bottom: 20px;
  }

  .rule-subsection h3 {
    font-size: 18px;
    margin-bottom: 15px;
  }

  .rule-subsection p {
    font-size: 15px;
    line-height: 1.6;
  }

  .example-item {
    padding: 16px;
    margin-bottom: 12px;
  }

  .example-item h4 {
    font-size: 16px;
    margin-bottom: 10px;
  }

  .example-item ul li {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .rules-section:last-child ul li {
    font-size: 14px;
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  .rules-card {
    padding: 25px 15px;
  }

  .rules-card h1 {
    font-size: 20px;
  }

  .rules-section h2 {
    font-size: 18px;
  }

  .rule-subsection h3 {
    font-size: 16px;
  }
}
</style>
