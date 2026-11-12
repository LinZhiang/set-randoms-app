<script setup lang="ts">
import { useSetsStore } from '@/stores/sets'

const store = useSetsStore()
</script>

<template>
  <main class="page storage-page">
    <section class="card storage-card">
      <p class="eyebrow">Node 远程存储</p>
      <h1>先接上，先不存</h1>
      <p class="lead">
        页面把集合发给
        <code>server/index.mjs</code>。服务会检查格式，然后丢弃内容，不写内存、文件或数据库。
      </p>

      <p class="status inline" :data-state="store.link.state">
        <span class="dot" aria-hidden="true"></span>
        {{ store.link.message }}
      </p>

      <div class="actions">
        <button type="button" @click="store.refreshLink()">重新检测</button>
        <button
          type="button"
          class="ghost"
          :disabled="store.syncing || store.sets.length === 0"
          @click="store.syncRemote()"
        >
          {{ store.syncing ? '正在发送…' : '发送当前集合' }}
        </button>
      </div>
      <p v-if="store.syncMessage" class="hint">{{ store.syncMessage }}</p>

      <dl>
        <div>
          <dt>GET /api/health</dt>
          <dd>查看服务是否在运行。persistence 目前固定为 false。</dd>
        </div>
        <div>
          <dt>GET /api/sets</dt>
          <dd>读取入口已留好，因为没有落盘，所以总是返回空数组。</dd>
        </div>
        <div>
          <dt>PUT /api/sets</dt>
          <dd>接收 <code>{ "sets": [] }</code>，校验通过后回复已接收，但不保存。</dd>
        </div>
      </dl>
    </section>
  </main>
</template>
