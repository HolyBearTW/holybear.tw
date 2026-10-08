---
layout: page
title: 問卷管理
description: HolyBearTW 站點問卷管理頁面。
sidebar: false
aside: false
head:
  - - meta
    - name: robots
      content: noindex, nofollow
---

<ClientOnly>
  <SurveyAdminPage />
</ClientOnly>

<script setup>
import SurveyAdminPage from '../.vitepress/theme/components/SurveyAdminPage.vue'
</script>
