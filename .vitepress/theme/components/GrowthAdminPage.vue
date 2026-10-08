<template>
  <AdminShell title="楓之谷成長報告管理" subtitle="查詢已建立成長追蹤的角色、報告最後更新時間與歷史資料同步進度。" section="growth">
    <template #actions>
      <template v-if="authenticated">
        <button type="button" class="hb-admin-button" @click="loadReports(dashboard?.offset || 0)" :disabled="loading">↻ {{ loading ? '讀取中…' : '重新整理' }}</button>
        <button type="button" class="hb-admin-button" @click="logout">登出</button>
      </template>
    </template>
    <p v-if="errorMessage" class="hb-admin-error" role="alert">{{ errorMessage }}</p>
    <AdminLoginForm v-if="!authenticated" />
    <template v-else>
      <div v-if="dashboard" class="hb-admin-metrics" aria-label="成長報告概況">
        <article class="hb-admin-panel hb-admin-metric"><span>已建立追蹤</span><strong>{{ dashboard.summary.totalProfiles }}</strong><small>已要求生成報告的角色</small></article>
        <article class="hb-admin-panel hb-admin-metric"><span>已有成長報告</span><strong>{{ dashboard.summary.generatedReports }}</strong><small>已儲存歷史資料</small></article>
        <article class="hb-admin-panel hb-admin-metric"><span>同步中／待同步</span><strong>{{ dashboard.summary.syncingProfiles }}</strong><small>包含首次生成與每日更新</small></article>
        <article class="hb-admin-panel hb-admin-metric"><span>同步失敗</span><strong>{{ dashboard.summary.failedProfiles }}</strong><small>仍保留已生成的報告</small></article>
      </div>
      <form class="hb-admin-panel hb-admin-filters" @submit.prevent="applyFilters">
        <label class="hb-admin-field"><span>角色搜尋</span><input v-model="queryInput" type="search" maxlength="100" placeholder="角色名稱或 OCID" :disabled="loading" /></label>
        <label class="hb-admin-field"><span>報告生成狀態</span><select v-model="reportInput" :disabled="loading"><option value="all">全部角色</option><option value="generated">已有成長報告</option><option value="waiting">尚未生成報告</option></select></label>
        <label class="hb-admin-field"><span>同步狀態</span><select v-model="statusInput" :disabled="loading"><option value="all">全部狀態</option><option v-for="(label, value) in statusLabels" :key="value" :value="value">{{ label }}</option></select></label>
        <button type="submit" class="hb-admin-button hb-admin-primary" :disabled="loading">查詢</button>
      </form>
      <p class="hb-admin-data-note">「報告最後更新」是歷史資料實際寫入的時間；「完整同步至」是已完成同步的歷史日期。重新整理會讀取最新儲存資料，角色歷史由既有排程持續同步。時間皆以台灣時間顯示。</p>
      <section v-if="dashboard || loading" class="hb-admin-panel" :aria-busy="loading" aria-label="角色成長報告列表">
        <div class="hb-admin-results-heading">
          <h2>角色成長報告<span v-if="dashboard"> · {{ dashboard.total }} 位</span></h2>
          <p v-if="dashboard" class="hb-admin-muted">查詢時間：{{ formatDate(dashboard.checkedAt) }}</p>
          <p v-if="loading" class="hb-admin-muted" role="status">正在讀取成長報告資料…</p>
        </div>
        <div v-if="dashboard" class="hb-admin-table-scroll">
          <table v-if="dashboard.reports.length" class="hb-admin-table">
            <thead><tr><th scope="col">角色</th><th scope="col">報告最後更新</th><th scope="col">歷史資料</th><th scope="col">同步狀態</th></tr></thead>
            <tbody>
              <tr v-for="report in dashboard.reports" :key="report.ocid">
                <td><strong>{{ report.characterName || '角色資料尚未取得' }}</strong><small>{{ [report.worldName, report.jobName, report.level ? `Lv. ${report.level}` : ''].filter(Boolean).join(' · ') || '等待首次同步' }}</small><span class="hb-admin-ocid" :title="report.ocid">{{ report.ocid }}</span></td>
                <td><time v-if="report.reportUpdatedAt" :datetime="report.reportUpdatedAt">{{ formatDate(report.reportUpdatedAt) }}</time><span v-else class="hb-admin-muted">尚未生成報告</span><small>建立追蹤：{{ formatDate(report.createdAt) }}</small></td>
                <td><span v-if="report.latestSnapshotDate">{{ report.historyStartDate || report.latestSnapshotDate }} ～ {{ report.latestSnapshotDate }}</span><span v-else class="hb-admin-muted">尚無歷史資料</span><small>{{ report.snapshotCount }} 天資料 · 完整同步至 {{ report.lastSyncedDate || '尚未完成' }}</small></td>
                <td><span class="hb-admin-status" :class="report.status">{{ statusLabels[report.status] }}</span><small>同步目標：{{ report.syncTargetDate }}</small><small v-if="report.status === 'retry' && report.nextRetryAt">下次重試：{{ formatDate(report.nextRetryAt) }}</small></td>
              </tr>
            </tbody>
          </table>
          <p v-else class="hb-admin-empty">{{ dashboard.summary.totalProfiles ? '沒有符合搜尋與篩選條件的角色。' : '目前尚無角色建立成長報告追蹤。' }}</p>
        </div>
      </section>
      <nav v-if="dashboard && dashboard.total > dashboard.limit" class="hb-admin-pagination" aria-label="成長報告列表分頁">
        <button class="hb-admin-button" type="button" :disabled="loading || dashboard.offset === 0" @click="loadReports(Math.max(0, dashboard.offset - dashboard.limit))">上一頁</button>
        <span>第 {{ Math.floor(dashboard.offset / dashboard.limit) + 1 }} / {{ Math.ceil(dashboard.total / dashboard.limit) }} 頁</span>
        <button class="hb-admin-button" type="button" :disabled="loading || !dashboard.hasMore" @click="loadReports(dashboard.offset + dashboard.limit)">下一頁</button>
      </nav>
    </template>
  </AdminShell>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import AdminShell from './AdminShell.vue';
import AdminLoginForm from './AdminLoginForm.vue';
import { useAdminSession } from '../composables/useAdminSession';

type SyncStatus = 'pending' | 'running' | 'retry' | 'completed' | 'failed';
interface GrowthDashboard {
  summary: { totalProfiles: number; generatedReports: number; syncingProfiles: number; failedProfiles: number };
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
  checkedAt: string;
  reports: {
    ocid: string;
    characterName: string;
    worldName: string;
    jobName: string;
    level: number | null;
    createdAt: string;
    historyStartDate: string | null;
    latestSnapshotDate: string | null;
    lastSyncedDate: string | null;
    syncTargetDate: string;
    reportUpdatedAt: string | null;
    snapshotCount: number;
    status: SyncStatus;
    nextRetryAt: string | null;
  }[];
}

const { authenticated, logout, request } = useAdminSession();
const dashboard = ref<GrowthDashboard | null>(null);
const loading = ref(false);
const errorMessage = ref('');
const queryInput = ref('');
const reportInput = ref('all');
const statusInput = ref('all');
const filters = ref({ query: '', report: 'all', status: 'all' });
const statusLabels: Record<SyncStatus, string> = { pending: '等待同步', running: '同步中', retry: '等待重試', completed: '同步完成', failed: '同步失敗' };
const dateFormatter = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', dateStyle: 'medium', timeStyle: 'short', hourCycle: 'h23' });
const formatDate = (value: string) => dateFormatter.format(new Date(value));

const loadReports = async (offset = 0) => {
  if (!authenticated.value || loading.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    const params = new URLSearchParams({ ...filters.value, limit: '50', offset: String(offset) });
    const response = await request(`/api/admin/growth?${params}`);
    const result = await response.json() as GrowthDashboard;
    if (authenticated.value) dashboard.value = result;
  } catch (error) {
    dashboard.value = null;
    errorMessage.value = error instanceof Error ? error.message : '無法讀取成長報告資料';
  } finally {
    loading.value = false;
  }
};

const applyFilters = () => {
  filters.value = { query: queryInput.value.trim(), report: reportInput.value, status: statusInput.value };
  void loadReports();
};
watch(authenticated, (value) => {
  if (value) void loadReports();
  else dashboard.value = null;
});
onMounted(() => { if (authenticated.value) void loadReports(); });
</script>
