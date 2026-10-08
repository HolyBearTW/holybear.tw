---
layout: page
title: 管理後台
description: HolyBearTW 整合式管理後台。
sidebar: false
aside: false
head:
  - - meta
    - name: robots
      content: noindex, nofollow
---

<ClientOnly>
  <AdminHomePage />
</ClientOnly>

<script setup>
import AdminHomePage from '../.vitepress/theme/components/AdminHomePage.vue'
</script>
