<template>
  <main class="hb-admin-page">
    <div class="hb-admin-shell">
      <header class="hb-admin-header">
        <div class="hb-admin-brand-row">
          <div class="hb-admin-brand">
            <span class="hb-admin-brand-mark"><img src="/logo.png" alt="HolyBearTW" /></span>
            <div>
              <p class="hb-admin-eyebrow">HOLYBEARTW ADMIN<span v-if="section"> / {{ section.toUpperCase() }}</span></p>
              <h1>{{ title }}</h1>
            </div>
          </div>
          <span class="hb-admin-console-status"><i aria-hidden="true"></i>{{ authenticated ? '管理員已登入' : '管理員驗證' }}</span>
        </div>
        <p class="hb-admin-subtitle">{{ subtitle }}</p>
      </header>
      <div class="hb-admin-toolbar">
        <nav aria-label="管理後台導覽" class="hb-admin-nav">
          <a href="/admin/" :aria-current="!section ? 'page' : undefined">管理後台</a>
          <a href="/admin/survey" :aria-current="section === 'survey' ? 'page' : undefined">問卷管理</a>
          <a href="/admin/growth" :aria-current="section === 'growth' ? 'page' : undefined">成長報告管理</a>
        </nav>
        <div v-if="$slots.actions" class="hb-admin-actions"><slot name="actions" /></div>
      </div>
      <slot />
    </div>
  </main>
</template>

<script setup lang="ts">
import { useAdminSession } from '../composables/useAdminSession';

defineProps<{ title: string; subtitle: string; section?: 'survey' | 'growth' }>();
const { authenticated } = useAdminSession();
</script>

<style src="../styles/admin.css"></style>
