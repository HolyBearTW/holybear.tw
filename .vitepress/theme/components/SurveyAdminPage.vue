<template>
  <main class="survey-admin-page">
    <div class="survey-admin-shell">
      <header class="survey-admin-header">
        <div class="survey-admin-brand-row">
          <div class="survey-admin-brand">
            <span class="survey-admin-brand-mark"><img src="/logo.png" alt="HolyBearTW" /></span>
            <div>
              <p class="survey-admin-eyebrow">HOLYBEARTW ADMIN</p>
              <h1>問卷管理中心</h1>
            </div>
          </div>
          <span class="survey-admin-console-status"><i aria-hidden="true"></i>SECURE CONSOLE</span>
        </div>
        <p class="survey-admin-subtitle">查看滿意度統計、自由文字回覆、CSV 匯出與回覆管理。</p>
      </header>

      <form v-if="!authenticated" class="survey-admin-login" @submit.prevent="loadDashboard">
        <div class="survey-admin-login-heading">
          <span class="survey-admin-lock" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7.5 10V7.7a4.5 4.5 0 0 1 9 0V10M6.8 10h10.4c.66 0 1.2.54 1.2 1.2v7.1c0 .66-.54 1.2-1.2 1.2H6.8c-.66 0-1.2-.54-1.2-1.2v-7.1c0-.66.54-1.2 1.2-1.2Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 14v2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>
          <div>
            <p class="survey-admin-section-kicker">管理員驗證</p>
            <h2>進入問卷管理後台</h2>
            <p>請輸入問卷管理密碼以繼續</p>
          </div>
        </div>

        <div class="survey-admin-feature-list" aria-label="管理功能">
          <span><i class="survey-admin-feature-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m3.2 8.2 3.1 3.1 6.5-6.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg></i>查看問卷統計</span>
          <span><i class="survey-admin-feature-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m3.2 8.2 3.1 3.1 6.5-6.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg></i>查看自由文字回覆</span>
          <span><i class="survey-admin-feature-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m3.2 8.2 3.1 3.1 6.5-6.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg></i>CSV 匯出</span>
          <span><i class="survey-admin-feature-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none"><path d="m3.2 8.2 3.1 3.1 6.5-6.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg></i>刪除測試／垃圾回覆</span>
        </div>

        <label class="survey-admin-password-label">
          <span>管理員驗證</span>
          <input v-model="secretInput" type="password" autocomplete="current-password" required placeholder="輸入管理密碼" />
        </label>
        <button type="submit" class="survey-admin-primary-button" :disabled="loading"><span>{{ loading ? '驗證中…' : '進入問卷管理後台' }}</span><b aria-hidden="true">→</b></button>
        <p class="survey-admin-security-note"><span aria-hidden="true">●</span>管理密碼僅保留在目前分頁記憶體中，關閉分頁後即清除。</p>
        <p v-if="errorMessage" class="survey-admin-error" role="alert">{{ errorMessage }}</p>
      </form>

      <template v-else>
        <section class="survey-admin-dashboard-heading">
          <div>
            <p class="survey-admin-section-kicker">HOLYBEARTW ADMIN / SURVEY</p>
            <h2>問卷管理中心</h2>
            <p>掌握使用者回饋，讓下一次功能更新更貼近需求。</p>
          </div>
          <div class="survey-admin-actions">
            <button type="button" @click="loadDashboard" :disabled="loading"><span aria-hidden="true">↻</span>{{ loading ? '更新中…' : '重新整理' }}</button>
            <button type="button" class="survey-admin-export-button" @click="downloadCsv" :disabled="loading"><span aria-hidden="true">↓</span>匯出 CSV</button>
            <button type="button" class="secondary" @click="logout">登出</button>
          </div>
        </section>
        <p v-if="errorMessage" class="survey-admin-error" role="alert">{{ errorMessage }}</p>

        <section v-if="stats" class="survey-admin-scope-bar" aria-label="統計檢視與回覆篩選">
          <div class="survey-admin-scope-group">
            <span class="survey-admin-scope-label">統計檢視</span>
            <div class="survey-admin-segmented-control">
              <button type="button" :class="{ active: statsView === 'trusted' }" @click="setStatsView('trusted')">可信統計</button>
              <button type="button" :class="{ active: statsView === 'all' }" @click="setStatsView('all')">全部統計</button>
            </div>
          </div>
          <div class="survey-admin-scope-group">
            <span class="survey-admin-scope-label">回覆篩選</span>
            <div class="survey-admin-segmented-control">
              <button type="button" :class="{ active: feedbackFilter === 'all' }" @click="setFeedbackFilter('all')">全部</button>
              <button type="button" :class="{ active: feedbackFilter === 'normal' }" @click="setFeedbackFilter('normal')">正常</button>
              <button type="button" :class="{ active: feedbackFilter === 'suspicious' }" @click="setFeedbackFilter('suspicious')">可疑</button>
            </div>
          </div>
          <div class="survey-admin-scope-summary">
            <span>可信 <strong>{{ stats.trustedResponses }}</strong></span>
            <span>可疑 <strong class="is-suspicious">{{ stats.suspiciousResponses }}</strong></span>
            <span>近 24h 阻擋 <strong>{{ stats.cooldownBlocked24h }}</strong></span>
          </div>
        </section>

        <section v-if="stats" class="survey-admin-metrics" aria-label="核心指標">
          <article class="survey-admin-metric-card metric-indigo"><div class="survey-admin-metric-icon" aria-hidden="true">↗</div><div><span>總填答數</span><strong>{{ stats.totalResponses }}</strong><small>累計回覆</small></div></article>
          <article class="survey-admin-metric-card metric-cyan"><div class="survey-admin-metric-icon" aria-hidden="true">★</div><div><span>平均滿意度</span><strong>{{ stats.averageSatisfaction.toFixed(2) }}<em>/ 5</em></strong><small>整體評分</small></div></article>
          <article class="survey-admin-metric-card metric-violet"><div class="survey-admin-metric-icon" aria-hidden="true">♥</div><div><span>支持繼續開發</span><strong>{{ supportRate }}</strong><small>選擇「支持」</small></div></article>
          <article class="survey-admin-metric-card metric-blue"><div class="survey-admin-metric-icon" aria-hidden="true">→</div><div><span>未來願意使用</span><strong>{{ futureUseRate }}</strong><small>選擇「會」</small></div></article>
        </section>

        <section v-if="stats" class="survey-admin-content-grid">
          <article v-for="group in distributionGroups" :key="group.title" class="survey-admin-panel survey-admin-distribution-panel">
            <div class="survey-admin-panel-heading"><div><p class="survey-admin-panel-kicker">INSIGHT</p><h3>{{ group.title }}</h3></div><span class="survey-admin-panel-badge">{{ stats.totalResponses }} 筆</span></div>
            <dl class="survey-admin-distribution-list">
              <div v-for="item in group.items" :key="item.label">
                <div class="survey-admin-distribution-label"><dt>{{ item.label }}</dt><dd>{{ item.count }}<small>{{ percent(item.count, stats.totalResponses) }}</small></dd></div>
                <div class="survey-admin-progress" aria-hidden="true"><span :style="{ width: `${ratioValue(item.count, stats.totalResponses)}%` }"></span></div>
              </div>
            </dl>
          </article>
        </section>

        <section v-if="stats" class="survey-admin-panel survey-admin-feedback">
          <div class="survey-admin-panel-heading"><div><p class="survey-admin-panel-kicker">FEEDBACK INBOX / {{ statsView === 'trusted' ? 'TRUSTED' : 'ALL' }}</p><h3>自由文字回覆</h3></div><span class="survey-admin-panel-badge">顯示 {{ stats.feedback.length }} 筆</span></div>
          <p v-if="!stats.feedback.length" class="survey-admin-muted">目前沒有文字回覆。</p>
          <article v-for="item in stats.feedback" :key="item.id" class="survey-admin-feedback-item">
            <div class="survey-admin-feedback-meta"><span class="survey-admin-feedback-id">#{{ item.id }}</span><span :class="['survey-admin-risk-badge', item.isSuspicious ? 'suspicious' : 'normal']">{{ item.isSuspicious ? '可疑' : '正常' }}</span><time :datetime="item.submittedAt">{{ formatDate(item.submittedAt) }}</time><span v-if="item.fingerprintPreview" class="survey-admin-fingerprint" title="匿名網路指紋">指紋 {{ item.fingerprintPreview }}</span><button type="button" class="danger" @click="deleteResponse(item.id)">刪除回覆</button></div>
            <p v-if="item.riskFlags.length" class="survey-admin-risk-flags">技術標記：{{ riskText(item.riskFlags) }}</p>
            <dl class="survey-admin-vote-summary" aria-label="此筆問卷的選項回答">
              <div><dt>使用頻率</dt><dd>{{ answerLabel(item.usageFrequency) }}</dd></div>
              <div><dt>滿意度</dt><dd>{{ answerLabel(item.satisfactionScore) }}</dd></div>
              <div><dt>支持開發</dt><dd>{{ answerLabel(item.supportContinue) }}</dd></div>
              <div><dt>未來使用</dt><dd>{{ answerLabel(item.futureUseIntent) }}</dd></div>
            </dl>
            <div class="survey-admin-feedback-copy"><p><strong>改善或新增</strong><span>{{ item.improvementFeedback || '（未填寫）' }}</span></p><p><strong>其他留言</strong><span>{{ item.otherFeedback || '（未填寫）' }}</span></p></div>
          </article>
          <div v-if="stats.feedbackHasMore || stats.feedbackOffset > 0" class="survey-admin-pagination">
            <button type="button" :disabled="loading || stats.feedbackOffset === 0" @click="loadDashboard(Math.max(0, stats.feedbackOffset - stats.feedbackLimit))">上一頁</button>
            <span>第 {{ Math.floor(stats.feedbackOffset / stats.feedbackLimit) + 1 }} 頁</span>
            <button type="button" :disabled="loading || !stats.feedbackHasMore" @click="loadDashboard(stats.feedbackOffset + stats.feedbackLimit)">下一頁</button>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type StatsView = 'trusted' | 'all';
type FeedbackFilter = 'all' | 'normal' | 'suspicious';
type Feedback = {
  id: number;
  submittedAt: string;
  usageFrequency: string;
  satisfactionScore: number;
  supportContinue: string;
  futureUseIntent: string;
  improvementFeedback: string;
  otherFeedback: string;
  isSuspicious: boolean;
  riskFlags: string[];
  fingerprintPreview: string;
};
type SurveyStatsSet = {
  totalResponses: number;
  averageSatisfaction: number;
  distributions: {
    satisfactionScore: Record<string, number>;
    usageFrequency: Record<string, number>;
    supportContinue: Record<string, number>;
    futureUseIntent: Record<string, number>;
  };
};
type SurveyStats = {
  totalResponses: number;
  averageSatisfaction: number;
  distributions: {
    satisfactionScore: Record<string, number>;
    usageFrequency: Record<string, number>;
    supportContinue: Record<string, number>;
    futureUseIntent: Record<string, number>;
  };
  feedback: Feedback[];
  feedbackLimit: number;
  feedbackOffset: number;
  feedbackHasMore: boolean;
  view: StatsView;
  filter: FeedbackFilter;
  trustedResponses: number;
  suspiciousResponses: number;
  cooldownBlocked24h: number;
  trustedStats: SurveyStatsSet;
  allStats: SurveyStatsSet;
};

const secretInput = ref('');
const secret = ref('');
const authenticated = ref(false);
const loading = ref(false);
const errorMessage = ref('');
const stats = ref<SurveyStats | null>(null);
const statsView = ref<StatsView>('trusted');
const feedbackFilter = ref<FeedbackFilter>('all');

const labels: Record<string, string> = {
  '1': '1 分', '2': '2 分', '3': '3 分', '4': '4 分', '5': '5 分',
  frequent: '經常使用', occasional: '偶爾使用', rare: '很少使用', stopped: '已停止使用',
  support: '支持', indifferent: '無所謂', oppose: '不支持',
  will: '會', depends: '視功能改善情況而定', uncertain: '不確定', will_not: '不會',
};

const distributionGroups = computed(() => {
  if (!stats.value) return [];
  const make = (title: string, values: Record<string, number>) => ({
    title,
    items: Object.entries(values).map(([key, count]) => ({ label: labels[key] || key, count })),
  });
  return [
    make('滿意度分布', stats.value.distributions.satisfactionScore),
    make('目前使用頻率', stats.value.distributions.usageFrequency),
    make('支持持續開發與維護', stats.value.distributions.supportContinue),
    make('未來使用意願', stats.value.distributions.futureUseIntent),
  ];
});

const ratioValue = (count: number, total: number) => total ? Math.round((count / total) * 1000) / 10 : 0;
const supportRate = computed(() => {
  if (!stats.value) return '0%';
  return `${ratioValue(stats.value.distributions.supportContinue.support || 0, stats.value.totalResponses)}%`;
});
const futureUseRate = computed(() => {
  if (!stats.value) return '0%';
  return `${ratioValue(stats.value.distributions.futureUseIntent.will || 0, stats.value.totalResponses)}%`;
});

const riskLabels: Record<string, string> = {
  turnstile_failed_recent: '近期驗證失敗',
  schema_retry_pattern: '重複格式嘗試',
  duplicate_browser_pattern: '重複瀏覽器識別',
  rapid_abuse_pattern: '快速重試模式',
};
const riskText = (flags: string[]) => flags.map((flag) => riskLabels[flag] || flag).join('、');
const answerLabel = (value: string | number) => labels[String(value)] || String(value);

const api = async (path: string, init: RequestInit = {}) => {
  const response = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), authorization: `Bearer ${secret.value}`, accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(body?.error?.message || '管理 API 請求失敗');
  }
  return response;
};

const loadDashboard = async (offset = 0) => {
  if (!secretInput.value && !secret.value) return;
  if (secretInput.value) secret.value = secretInput.value;
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await api(`/api/admin/survey?view=${statsView.value}&filter=${feedbackFilter.value}&limit=100&offset=${Math.max(0, Math.trunc(offset))}`);
    stats.value = await response.json() as SurveyStats;
    authenticated.value = true;
    secretInput.value = '';
  } catch (error) {
    authenticated.value = false;
    stats.value = null;
    errorMessage.value = error instanceof Error ? error.message : '無法讀取管理資料';
  } finally {
    loading.value = false;
  }
};

const setStatsView = async (view: StatsView) => {
  if (statsView.value === view && stats.value) return;
  statsView.value = view;
  await loadDashboard(0);
};

const setFeedbackFilter = async (filter: FeedbackFilter) => {
  if (feedbackFilter.value === filter && stats.value) return;
  feedbackFilter.value = filter;
  await loadDashboard(0);
};

const logout = () => {
  secret.value = '';
  secretInput.value = '';
  authenticated.value = false;
  stats.value = null;
  errorMessage.value = '';
};

const percent = (count: number, total: number) => `${ratioValue(count, total)}%`;
const formatDate = (value: string) => new Date(value).toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short' });

const deleteResponse = async (id: number) => {
  if (!window.confirm(`確定刪除第 ${id} 筆回覆？此操作無法復原。`)) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    await api(`/api/admin/survey/${encodeURIComponent(String(id))}`, { method: 'DELETE' });
    await loadDashboard(stats.value?.feedbackOffset || 0);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '刪除失敗';
    loading.value = false;
  }
};

const downloadCsv = async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await api(`/api/admin/survey?format=csv&filter=${feedbackFilter.value}`, { headers: { accept: 'text/csv' } });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'holybear-survey.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'CSV 匯出失敗';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.survey-admin-page {
  min-height: 680px;
  margin: 0 auto;
  padding: 52px 20px 92px;
  color: #dce7ff;
  background:
    radial-gradient(circle at 12% 0%, rgba(99, 102, 241, .14), transparent 36%),
    radial-gradient(circle at 95% 10%, rgba(34, 211, 238, .08), transparent 30%);
}

.survey-admin-shell { width: min(100%, 1120px); margin: 0 auto; }
.survey-admin-header { margin-bottom: 28px; }
.survey-admin-brand-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.survey-admin-brand { display: flex; align-items: center; gap: 14px; }
.survey-admin-brand-mark { display: grid; width: 42px; height: 42px; place-items: center; border: 1px solid rgba(129, 140, 248, .64); border-radius: 13px; background: linear-gradient(145deg, rgba(99, 102, 241, .58), rgba(30, 41, 92, .76)); box-shadow: 0 0 28px rgba(99, 102, 241, .2), inset 0 1px rgba(255, 255, 255, .16); overflow: hidden; }
.survey-admin-brand-mark img { width: 38px; height: 38px; object-fit: contain; }
.survey-admin-eyebrow, .survey-admin-section-kicker, .survey-admin-panel-kicker { margin: 0; color: #a5b4fc; font-size: .68rem; font-weight: 800; letter-spacing: .16em; }
.survey-admin-header h1 { margin: 3px 0 0; color: #f8fbff; font-size: clamp(1.45rem, 3vw, 1.95rem); font-weight: 750; letter-spacing: -.02em; }
.survey-admin-console-status { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(74, 222, 128, .22); border-radius: 999px; padding: 7px 11px; background: rgba(22, 101, 52, .12); color: #86efac; font-size: .64rem; font-weight: 800; letter-spacing: .12em; white-space: nowrap; }
.survey-admin-console-status i { width: 6px; height: 6px; border-radius: 50%; background: #4ade80; box-shadow: 0 0 10px #4ade80; }
.survey-admin-subtitle { margin: 17px 0 0 56px; color: #93a5c5; font-size: .87rem; line-height: 1.7; }

.survey-admin-login { position: relative; width: min(100%, 520px); box-sizing: border-box; margin: 38px auto 0; padding: 32px; border: 1px solid rgba(129, 140, 248, .38); border-radius: 22px; background: linear-gradient(145deg, rgba(24, 31, 65, .86), rgba(11, 18, 38, .82)); box-shadow: 0 28px 70px rgba(1, 5, 20, .36), 0 0 0 1px rgba(255, 255, 255, .03) inset, 0 0 52px rgba(99, 102, 241, .08); backdrop-filter: blur(18px); }
.survey-admin-login::before { position: absolute; top: -1px; right: 22%; left: 22%; height: 1px; background: linear-gradient(90deg, transparent, rgba(165, 180, 252, .8), transparent); content: ''; }
.survey-admin-login-heading { display: flex; align-items: flex-start; gap: 15px; }
.survey-admin-lock { display: grid; width: 44px; height: 44px; flex: none; place-items: center; border: 1px solid rgba(129, 140, 248, .34); border-radius: 13px; background: rgba(99, 102, 241, .18); color: #a5b4fc; }
.survey-admin-lock svg { width: 23px; height: 23px; }
.survey-admin-login h2, .survey-admin-dashboard-heading h2 { margin: 4px 0 0; color: #f5f8ff; font-size: 1.32rem; letter-spacing: -.015em; }
.survey-admin-login-heading p:last-child { margin: 7px 0 0; color: #91a1bd; font-size: .84rem; }
.survey-admin-feature-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px 18px; margin: 28px 0; padding: 17px 0; border-top: 1px solid rgba(148, 163, 184, .13); border-bottom: 1px solid rgba(148, 163, 184, .13); }
.survey-admin-feature-list span { display: flex; align-items: center; gap: 8px; color: #b7c5dd; font-size: .79rem; }
.survey-admin-feature-list i { display: grid; width: 18px; height: 18px; flex: none; place-items: center; border: 1px solid rgba(129, 140, 248, .5); border-radius: 5px; background: linear-gradient(145deg, rgba(99, 102, 241, .48), rgba(59, 130, 246, .28)); color: #dbeafe; font-style: normal; box-shadow: 0 0 12px rgba(99, 102, 241, .14); }
.survey-admin-feature-list i svg { width: 12px; height: 12px; }
.survey-admin-password-label { display: grid; gap: 8px; color: #c7d2fe; font-size: .75rem; font-weight: 750; letter-spacing: .04em; }
.survey-admin-password-label input { width: 100%; box-sizing: border-box; border: 1px solid rgba(129, 140, 248, .3); border-radius: 11px; padding: 13px 14px; outline: none; background: rgba(7, 14, 31, .72); color: #eef2ff; font: inherit; font-size: .9rem; letter-spacing: .02em; transition: border-color 160ms ease, box-shadow 160ms ease, background 160ms ease; }
.survey-admin-password-label input::placeholder { color: #64748b; }
.survey-admin-password-label input:focus { border-color: rgba(165, 180, 252, .86); background: rgba(8, 15, 34, .94); box-shadow: 0 0 0 3px rgba(99, 102, 241, .16), 0 0 24px rgba(99, 102, 241, .08); }
.survey-admin-primary-button { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 17px; border: 1px solid rgba(165, 180, 252, .62); border-radius: 11px; padding: 12px 15px 12px 17px; background: linear-gradient(100deg, rgba(79, 70, 229, .88), rgba(79, 70, 229, .62) 62%, rgba(37, 99, 235, .68)); box-shadow: 0 9px 22px rgba(30, 64, 175, .24), inset 0 1px rgba(255, 255, 255, .16); color: #fff; cursor: pointer; font: inherit; font-size: .86rem; font-weight: 750; transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease; }
.survey-admin-primary-button b { font-size: 1.15rem; font-weight: 400; }
.survey-admin-primary-button:hover:not(:disabled) { filter: brightness(1.1); box-shadow: 0 12px 28px rgba(30, 64, 175, .32), inset 0 1px rgba(255, 255, 255, .2); transform: translateY(-1px); }
.survey-admin-primary-button:disabled { cursor: not-allowed; opacity: .58; }
.survey-admin-security-note { display: flex; align-items: center; gap: 7px; margin: 17px 0 0; color: #7485a4; font-size: .72rem; line-height: 1.5; }
.survey-admin-security-note span { color: #67e8f9; font-size: .5rem; text-shadow: 0 0 8px rgba(103, 232, 249, .8); }

.survey-admin-dashboard-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin: 38px 0 23px; padding-bottom: 23px; border-bottom: 1px solid rgba(148, 163, 184, .15); }
.survey-admin-dashboard-heading > div:first-child > p:last-child { margin: 8px 0 0; color: #8496b5; font-size: .82rem; }
.survey-admin-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.survey-admin-page button { border: 1px solid rgba(129, 140, 248, .38); border-radius: 9px; padding: 9px 12px; background: rgba(30, 41, 82, .55); color: #dbeafe; cursor: pointer; font: inherit; font-size: .78rem; font-weight: 700; transition: background 160ms ease, border-color 160ms ease, transform 160ms ease; }
.survey-admin-page button:hover:not(:disabled) { border-color: rgba(165, 180, 252, .72); background: rgba(79, 70, 229, .28); transform: translateY(-1px); }
.survey-admin-page button:disabled { cursor: not-allowed; opacity: .5; }
.survey-admin-actions button span { margin-right: 6px; color: #a5b4fc; font-size: 1rem; }
.survey-admin-actions .survey-admin-export-button { border-color: rgba(34, 211, 238, .38); background: rgba(8, 145, 178, .16); color: #a5f3fc; }
.survey-admin-actions button.secondary { border-color: rgba(148, 163, 184, .25); background: rgba(71, 85, 105, .22); color: #a9b7ca; }
.survey-admin-error { margin: 14px 0; color: #fda4af; font-size: .8rem; }

.survey-admin-scope-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 16px 22px; margin-bottom: 18px; padding: 13px 15px; border: 1px solid rgba(129, 140, 248, .18); border-radius: 13px; background: rgba(16, 25, 52, .52); }
.survey-admin-scope-group { display: flex; align-items: center; gap: 9px; }
.survey-admin-scope-label { color: #8193b2; font-size: .69rem; font-weight: 750; letter-spacing: .04em; white-space: nowrap; }
.survey-admin-segmented-control { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid rgba(129, 140, 248, .22); border-radius: 9px; background: rgba(7, 14, 31, .48); }
.survey-admin-segmented-control button { border: 0; border-radius: 6px; padding: 6px 9px; background: transparent; color: #8fa0bb; font-size: .7rem; }
.survey-admin-segmented-control button:hover:not(:disabled) { border: 0; background: rgba(99, 102, 241, .13); transform: none; }
.survey-admin-segmented-control button.active { border: 1px solid rgba(165, 180, 252, .45); background: linear-gradient(100deg, rgba(79, 70, 229, .55), rgba(59, 130, 246, .3)); color: #eef2ff; box-shadow: 0 0 12px rgba(99, 102, 241, .12); }
.survey-admin-scope-summary { display: flex; align-items: center; gap: 12px; margin-left: auto; color: #8395b2; font-size: .7rem; }
.survey-admin-scope-summary strong { margin-left: 3px; color: #dbeafe; font-weight: 760; }
.survey-admin-scope-summary strong.is-suspicious { color: #fda4af; }

.survey-admin-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 13px; margin-bottom: 18px; }
.survey-admin-metric-card { position: relative; display: flex; align-items: flex-start; gap: 13px; min-height: 112px; box-sizing: border-box; padding: 18px; overflow: hidden; border: 1px solid rgba(129, 140, 248, .24); border-radius: 15px; background: linear-gradient(145deg, rgba(24, 32, 65, .82), rgba(13, 20, 41, .75)); box-shadow: 0 14px 28px rgba(1, 5, 20, .16), inset 0 1px rgba(255, 255, 255, .035); }
.survey-admin-metric-card::after { position: absolute; right: -24px; bottom: -34px; width: 100px; height: 100px; border-radius: 50%; background: var(--metric-glow); filter: blur(20px); opacity: .28; content: ''; }
.metric-indigo { --metric-glow: #6366f1; }
.metric-cyan { --metric-glow: #22d3ee; }
.metric-violet { --metric-glow: #a78bfa; }
.metric-blue { --metric-glow: #60a5fa; }
.survey-admin-metric-icon { display: grid; width: 34px; height: 34px; flex: none; place-items: center; border: 1px solid color-mix(in srgb, var(--metric-glow), transparent 55%); border-radius: 10px; background: color-mix(in srgb, var(--metric-glow), transparent 84%); color: var(--metric-glow); font-size: .95rem; font-weight: 800; }
.survey-admin-metric-card span { display: block; color: #8fa0bb; font-size: .72rem; }
.survey-admin-metric-card strong { display: block; margin-top: 8px; color: #f4f7ff; font-size: 1.55rem; font-weight: 760; letter-spacing: -.025em; }
.survey-admin-metric-card strong em { margin-left: 3px; color: #8fa0bb; font-size: .74rem; font-style: normal; font-weight: 600; }
.survey-admin-metric-card small { display: block; margin-top: 5px; color: #64748b; font-size: .66rem; }

.survey-admin-content-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
.survey-admin-panel { border: 1px solid rgba(129, 140, 248, .22); border-radius: 16px; background: linear-gradient(145deg, rgba(20, 28, 57, .78), rgba(11, 18, 37, .72)); box-shadow: 0 13px 28px rgba(1, 5, 20, .13), inset 0 1px rgba(255, 255, 255, .025); }
.survey-admin-distribution-panel { padding: 19px; }
.survey-admin-panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.survey-admin-panel-kicker { color: #7184a8; font-size: .6rem; letter-spacing: .14em; }
.survey-admin-panel h3 { margin: 4px 0 0; color: #e7edff; font-size: .96rem; font-weight: 720; }
.survey-admin-panel-badge { border: 1px solid rgba(129, 140, 248, .22); border-radius: 999px; padding: 5px 8px; background: rgba(99, 102, 241, .1); color: #a5b4fc; font-size: .64rem; white-space: nowrap; }
.survey-admin-distribution-list { display: grid; gap: 14px; margin: 21px 0 0; }
.survey-admin-distribution-list > div { display: grid; gap: 7px; }
.survey-admin-distribution-label { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; color: #aab9d0; font-size: .76rem; }
.survey-admin-distribution-label dt, .survey-admin-distribution-label dd { margin: 0; }
.survey-admin-distribution-label dd { color: #e1e9ff; font-weight: 750; }
.survey-admin-distribution-label dd small { margin-left: 7px; color: #8092b1; font-size: .67rem; font-weight: 600; }
.survey-admin-progress { height: 5px; overflow: hidden; border-radius: 999px; background: rgba(71, 85, 105, .35); }
.survey-admin-progress span { display: block; height: 100%; min-width: 0; border-radius: inherit; background: linear-gradient(90deg, #6366f1, #38bdf8); box-shadow: 0 0 11px rgba(99, 102, 241, .46); transition: width 300ms ease; }

.survey-admin-feedback { padding: 20px; }
.survey-admin-feedback-item { padding: 17px 0 2px; border-top: 1px solid rgba(148, 163, 184, .13); }
.survey-admin-feedback-item:first-of-type { margin-top: 18px; }
.survey-admin-feedback-meta { display: flex; align-items: center; gap: 10px; color: #8092b1; font-size: .72rem; }
.survey-admin-feedback-id { border: 1px solid rgba(129, 140, 248, .32); border-radius: 6px; padding: 3px 6px; background: rgba(99, 102, 241, .13); color: #b8c1ff; font-size: .65rem; font-weight: 750; }
.survey-admin-feedback-meta time { color: #7f90ac; }
.survey-admin-feedback-meta .danger { margin-left: auto; border-color: rgba(251, 113, 133, .28); background: rgba(159, 18, 57, .15); color: #fda4af; font-size: .7rem; }
.survey-admin-risk-badge { border-radius: 999px; padding: 3px 7px; font-size: .62rem; font-weight: 750; }
.survey-admin-risk-badge.normal { border: 1px solid rgba(74, 222, 128, .24); background: rgba(22, 101, 52, .13); color: #86efac; }
.survey-admin-risk-badge.suspicious { border: 1px solid rgba(251, 113, 133, .32); background: rgba(159, 18, 57, .16); color: #fda4af; }
.survey-admin-fingerprint { color: #7184a8; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .65rem; }
.survey-admin-risk-flags { margin: 8px 0 0; color: #f0b5c2; font-size: .68rem; }
.survey-admin-vote-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin: 14px 0 0; }
.survey-admin-vote-summary > div { min-width: 0; padding: 10px 11px; border: 1px solid rgba(129, 140, 248, .16); border-radius: 9px; background: rgba(30, 41, 82, .3); }
.survey-admin-vote-summary dt { color: #8193b2; font-size: .65rem; font-weight: 700; }
.survey-admin-vote-summary dd { margin: 5px 0 0; color: #e1e9ff; font-size: .78rem; font-weight: 750; overflow-wrap: anywhere; }
.survey-admin-feedback-copy { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.survey-admin-feedback-copy p { display: grid; gap: 5px; min-width: 0; margin: 0; color: #c9d5e9; font-size: .8rem; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }
.survey-admin-feedback-copy strong { color: #93a4c4; font-size: .69rem; font-weight: 750; letter-spacing: .03em; }
.survey-admin-feedback-copy span { min-height: 1.6em; }
.survey-admin-muted { color: #8092b1; font-size: .8rem; }
.survey-admin-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; color: #a5b4fc; font-size: .76rem; }

@media (max-width: 900px) {
  .survey-admin-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 680px) {
  .survey-admin-page { min-height: 620px; padding: 34px 14px 60px; }
  .survey-admin-brand-row, .survey-admin-dashboard-heading { align-items: flex-start; flex-direction: column; }
  .survey-admin-console-status { margin-left: 56px; }
  .survey-admin-subtitle { margin-left: 0; }
  .survey-admin-login { margin-top: 28px; padding: 23px 18px; border-radius: 18px; }
  .survey-admin-feature-list { grid-template-columns: 1fr; gap: 10px; margin: 23px 0; }
  .survey-admin-metrics, .survey-admin-content-grid { grid-template-columns: 1fr; }
  .survey-admin-actions { width: 100%; }
  .survey-admin-actions button { flex: 1 1 auto; }
  .survey-admin-scope-bar { align-items: flex-start; flex-direction: column; gap: 12px; }
  .survey-admin-scope-group { align-items: flex-start; flex-direction: column; gap: 6px; width: 100%; }
  .survey-admin-segmented-control { width: 100%; }
  .survey-admin-segmented-control button { flex: 1 1 0; }
  .survey-admin-scope-summary { margin-left: 0; }
  .survey-admin-feedback-meta { flex-wrap: wrap; }
  .survey-admin-feedback-meta .danger { margin-left: auto; }
  .survey-admin-vote-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .survey-admin-feedback-copy { grid-template-columns: 1fr; gap: 10px; }
}

@media (prefers-reduced-motion: reduce) {
  .survey-admin-page * { transition-duration: .01ms !important; }
}
</style>
