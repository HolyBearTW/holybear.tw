<template>
  <AdminShell title="管理後台" subtitle="統一進入問卷管理與楓之谷成長報告管理。">
    <template #actions><button v-if="authenticated" class="hb-admin-button" type="button" @click="logout">登出</button></template>
    <AdminLoginForm v-if="!authenticated" />
    <template v-else>
      <div class="hb-admin-modules">
        <a class="hb-admin-panel hb-admin-module" href="/admin/survey">
          <span class="hb-admin-module-icon" aria-hidden="true">☷</span>
          <h2>問卷管理後台</h2>
          <p>查看滿意度統計、填答內容與自由文字回覆，匯出 CSV，並管理測試或垃圾回覆。</p>
          <span class="hb-admin-module-action">進入問卷管理 <span aria-hidden="true">→</span></span>
        </a>
        <a class="hb-admin-panel hb-admin-module" href="/admin/growth">
          <span class="hb-admin-module-icon" aria-hidden="true">↗</span>
          <h2>楓之谷成長報告管理後台</h2>
          <p>查看已建立成長追蹤的角色、報告最後更新時間、歷史資料範圍與同步狀態。</p>
          <span class="hb-admin-module-badge">僅供查詢</span>
          <span class="hb-admin-module-action">進入成長報告管理 <span aria-hidden="true">→</span></span>
        </a>
      </div>
      <p class="hb-admin-data-note">成長報告後台只提供查詢與重新整理最新資料。</p>
    </template>
  </AdminShell>
</template>

<script setup lang="ts">
import AdminShell from './AdminShell.vue';
import AdminLoginForm from './AdminLoginForm.vue';
import { useAdminSession } from '../composables/useAdminSession';

const { authenticated, logout } = useAdminSession();
</script>
