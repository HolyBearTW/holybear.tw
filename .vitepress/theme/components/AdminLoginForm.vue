<template>
  <form class="hb-admin-login" @submit.prevent="submit">
    <p class="hb-admin-eyebrow">管理員驗證</p>
    <h2>登入管理後台</h2>
    <p class="hb-admin-muted">輸入原有的問卷管理密碼，即可使用整合式管理後台。</p>
    <label class="hb-admin-field">
      <span>管理密碼</span>
      <input v-model="password" type="password" autocomplete="current-password" required placeholder="輸入管理密碼" :disabled="loading" />
    </label>
    <button type="submit" class="hb-admin-button hb-admin-primary" :disabled="loading">{{ loading ? '驗證中…' : '登入' }}<span aria-hidden="true">→</span></button>
    <p class="hb-admin-security-note">管理密碼只保留在目前分頁記憶體中，重新載入頁面或登出後即清除。</p>
    <p v-if="errorMessage" class="hb-admin-error" role="alert">{{ errorMessage }}</p>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAdminSession } from '../composables/useAdminSession';

const { login } = useAdminSession();
const password = ref('');
const loading = ref(false);
const errorMessage = ref('');
const submit = async () => {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = '';
  try {
    await login(password.value);
    password.value = '';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登入失敗';
  } finally {
    loading.value = false;
  }
};
</script>
