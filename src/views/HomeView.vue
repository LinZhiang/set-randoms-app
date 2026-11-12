<script setup lang="ts">
import { computed, ref } from 'vue'
import { useSetsStore } from '@/stores/sets'

const store = useSetsStore()
const name = ref('')
const rawItems = ref('')
const formError = ref('')

const parsedItems = computed(() =>
  rawItems.value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean),
)

function onSubmit() {
  const title = name.value.trim()
  if (!title) {
    formError.value = '先写集合名称'
    return
  }
  if (parsedItems.value.length === 0) {
    formError.value = '至少放一个候选项，一行一个'
    return
  }

  formError.value = ''
  store.addSet(title, parsedItems.value)
  name.value = ''
  rawItems.value = ''
}
</script>

<template>
  <main class="page">
    <section class="stage">
      <p class="eyebrow">这一轮</p>
      <h1 v-if="store.lastDraw">{{ store.lastDraw.item }}</h1>
      <h1 v-else class="placeholder">还没有抽出结果</h1>
      <p class="stage-note">
        <template v-if="store.lastDraw">来自「{{ store.lastDraw.setName }}」</template>
        <template v-else>建一个集合，再从里面抽一个。</template>
      </p>
    </section>

    <div class="workspace">
      <form class="card" @submit.prevent="onSubmit">
        <h2>新建集合</h2>
        <label>
          名称
          <input v-model="name" maxlength="80" placeholder="例如：今晚吃什么" />
        </label>
        <label>
          候选项
          <textarea
            v-model="rawItems"
            rows="8"
            maxlength="8000"
            placeholder="一行一个&#10;火锅&#10;面&#10;沙拉"
          ></textarea>
        </label>
        <p class="hint">{{ parsedItems.length }} 个候选项</p>
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
        <button type="submit">加入集合</button>
      </form>

      <section class="card list-card">
        <div class="list-head">
          <h2>集合</h2>
          <p>{{ store.sets.length }} 个 · {{ store.totalItems }} 项</p>
        </div>

        <p v-if="store.sets.length === 0" class="empty">
          还没有集合。名称写在上面，候选项一行一个。
        </p>

        <ul v-else>
          <li
            v-for="set in store.sets"
            :key="set.id"
            :class="{ drawn: store.lastDraw?.setId === set.id }"
          >
            <div>
              <h3>{{ set.name }}</h3>
              <p>{{ set.items.length }} 项 · {{ set.items.slice(0, 4).join('、') }}</p>
            </div>
            <div class="row-actions">
              <button type="button" @click="store.draw(set.id)">抽取</button>
              <button type="button" class="ghost" @click="store.removeSet(set.id)">删除</button>
            </div>
          </li>
        </ul>

        <button
          type="button"
          class="ghost sync"
          :disabled="store.syncing || store.sets.length === 0"
          @click="store.syncRemote()"
        >
          {{ store.syncing ? '正在发送…' : '发给远程存储' }}
        </button>
        <p v-if="store.syncMessage" class="hint">{{ store.syncMessage }}</p>
      </section>
    </div>
  </main>
</template>
