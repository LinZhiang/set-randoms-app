<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { onMounted } from 'vue'
import { useSetsStore } from '@/stores/sets'

const store = useSetsStore()

onMounted(() => {
  void store.refreshLink()
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="mark" aria-hidden="true"></span>
        <span>
          <strong>Set Randoms</strong>
          <small>随机集合</small>
        </span>
      </RouterLink>

      <p class="status" :data-state="store.link.state">
        <span class="dot" aria-hidden="true"></span>
        {{ store.link.message }}
      </p>

      <nav>
        <RouterLink to="/">抽取</RouterLink>
        <RouterLink to="/storage">存储</RouterLink>
      </nav>
    </header>

    <RouterView />
  </div>
</template>
