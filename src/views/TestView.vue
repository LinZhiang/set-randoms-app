<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNodesStore } from '@/stores/nodes'

const route = useRoute()
const router = useRouter()
const store = useNodesStore()
const index = ref(0)
const detailsOpen = ref(false)
const order = ref<string[] | null>(null)
const countedId = ref('')
const direction = ref(1)

const nodeId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const source = computed(() => store.findNode(nodeId.value))

function shuffle(ids: string[]) {
  const copy = [...ids]
  for (let cursor = copy.length - 1; cursor > 0; cursor -= 1) {
    const roll = crypto.getRandomValues(new Uint32Array(1))[0]
    const swap = roll === undefined ? 0 : roll % (cursor + 1)
    const current = copy[cursor]
    const other = copy[swap]
    if (current === undefined || other === undefined) continue
    copy[cursor] = other
    copy[swap] = current
  }
  return copy
}

watch(
  () => [store.link, store.leavesUnder(nodeId.value).map((node) => node.id).join(',')] as const,
  ([link, key]) => {
    const ids = key ? key.split(',') : []
    if (!order.value) {
      if (link === 'syncing' && ids.length === 0) return
      order.value = shuffle(ids)
      return
    }
    const alive = new Set(ids)
    const next = order.value.filter((id) => alive.has(id))
    for (const id of ids) {
      if (!next.includes(id)) next.push(id)
    }
    order.value = next
  },
  { immediate: true },
)

const cards = computed(() =>
  (order.value ?? [])
    .map((id) => store.findNode(id))
    .filter((node) => node !== null),
)
const card = computed(() => cards.value[index.value] ?? null)

watch(
  card,
  (current) => {
    if (!current || countedId.value === current.id) return
    countedId.value = current.id
    void store.markViewed(current.id)
  },
  { immediate: true },
)

watch(cards, (list) => {
  if (index.value > list.length - 1) index.value = Math.max(0, list.length - 1)
})

watch(index, () => {
  detailsOpen.value = false
})

function goBack() {
  const parentId = source.value?.parentId
  void router.push(parentId ? `/level/${parentId}` : '/')
}

function step(delta: number) {
  const next = index.value + delta
  if (next < 0 || next >= cards.value.length) return
  direction.value = delta
  index.value = next
}
</script>

<template>
  <main class="screen test-screen">
    <p v-if="store.link === 'syncing' && !source && cards.length === 0" class="empty">正在读取…</p>
    <template v-else-if="!source">
      <p class="empty">这个节点不存在，可能已在别的设备上删除。</p>
    </template>
    <template v-else-if="cards.length === 0">
      <p class="empty">「{{ source.name }}」下面还没有叶子节点。</p>
    </template>
    <div v-else-if="card" class="card-stage">
      <Transition :name="direction > 0 ? 'card-next' : 'card-prev'">
        <button :key="card.id" class="draw-card" type="button" @click="detailsOpen = !detailsOpen">
          <p class="card-count">{{ index + 1 }} / {{ cards.length }}</p>
          <h2>{{ card.name }}</h2>
          <p class="card-views">查看 {{ card.views ?? 0 }} 次</p>
          <p v-if="detailsOpen" class="card-details">{{ card.details || '还没有详情。' }}</p>
          <p v-else class="card-hint">点击展开详情</p>
        </button>
      </Transition>
    </div>

    <div class="dock actions">
      <button type="button" :disabled="index === 0 || cards.length === 0" @click="step(-1)">
        上一张
      </button>
      <button
        type="button"
        :disabled="index >= cards.length - 1 || cards.length === 0"
        @click="step(1)"
      >
        下一张
      </button>
      <button class="ghost" type="button" @click="goBack">返回</button>
    </div>
  </main>
</template>
