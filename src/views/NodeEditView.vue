<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNodesStore } from '@/stores/nodes'

interface ParentOption {
  id: string
  name: string
  path: string
}

const route = useRoute()
const router = useRouter()
const store = useNodesStore()

const name = ref('')
const details = ref('')
const parentId = ref('')
const query = ref('')
const searching = ref(false)
const error = ref('')
const filled = ref(false)

const isCreate = computed(() => route.name === 'create')
const nodeId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const node = computed(() => (nodeId.value ? store.findNode(nodeId.value) : null))
const parent = computed(() => (parentId.value ? store.findNode(parentId.value) : null))

const parentOptions = computed(() => {
  const blocked = new Set<string>()
  if (!isCreate.value && nodeId.value) {
    const stack = [nodeId.value]
    blocked.add(nodeId.value)
    while (stack.length > 0) {
      const current = stack.pop()
      if (!current) continue
      for (const item of store.nodes) {
        if (item.parentId === current && !blocked.has(item.id)) {
          blocked.add(item.id)
          stack.push(item.id)
        }
      }
    }
  }

  const options: ParentOption[] = []
  const walk = (currentParent: string | null, prefix: string) => {
    for (const item of store.childrenOf(currentParent)) {
      if (blocked.has(item.id)) continue
      const path = prefix ? `${prefix} / ${item.name}` : item.name
      options.push({ id: item.id, name: item.name, path })
      walk(item.id, path)
    }
  }
  walk(null, '')
  return options
})

const visibleOptions = computed(() => {
  const keyword = query.value.trim().toLocaleLowerCase()
  if (!searching.value || !keyword) return parentOptions.value
  return parentOptions.value.filter(
    (option) =>
      option.name.toLocaleLowerCase().includes(keyword) ||
      option.path.toLocaleLowerCase().includes(keyword),
  )
})

const showTop = computed(() => {
  const keyword = query.value.trim()
  return !searching.value || !keyword || '顶层'.includes(keyword)
})

let closeTimer = 0

function startSearch() {
  window.clearTimeout(closeTimer)
  searching.value = true
  query.value = ''
}

function stopSearch() {
  window.clearTimeout(closeTimer)
  closeTimer = window.setTimeout(() => {
    searching.value = false
    query.value = ''
  }, 180)
}

function chooseParent(id: string) {
  window.clearTimeout(closeTimer)
  parentId.value = id
  searching.value = false
  query.value = ''
}

function onQuery(event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement) query.value = target.value
}

function applyDraft() {
  error.value = ''
  if (isCreate.value) {
    name.value = ''
    details.value = ''
    parentId.value = typeof route.params.parentId === 'string' ? route.params.parentId : ''
    filled.value = true
    return
  }
  if (!node.value) return
  name.value = node.value.name
  details.value = node.value.details
  parentId.value = node.value.parentId ?? ''
  filled.value = true
}

watch(
  () => route.fullPath,
  () => {
    filled.value = false
    applyDraft()
  },
  { immediate: true },
)

watch(node, (current) => {
  if (!isCreate.value && !filled.value && current) applyDraft()
})

async function onSubmit() {
  error.value = ''
  if (!name.value.trim()) {
    error.value = '先写名称'
    return
  }
  const draft = {
    parentId: parentId.value || null,
    name: name.value,
    details: details.value,
  }
  try {
    if (isCreate.value) {
      const created = await store.addNode(draft)
      await router.replace(`/node/${created.id}`)
      return
    }
    await store.saveNode(nodeId.value, draft)
    await router.replace(`/node/${nodeId.value}`)
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  }
}
</script>

<template>
  <main class="screen editor">
    <p v-if="store.link === 'syncing' && !isCreate && !node" class="empty">正在读取…</p>
    <p v-else-if="!isCreate && !node" class="empty">这个节点不存在，可能已在别的设备上删除。</p>
    <form v-else @submit.prevent="onSubmit">
      <p v-if="isCreate" class="sync-note">
        {{ parent ? `添加到「${parent.name}」下面。` : '添加为顶层类型。' }}
      </p>
      <label>
        名称
        <input v-model="name" maxlength="80" enterkeyhint="next" placeholder="例如：原神、限定池" />
      </label>
      <label>
        详情
        <textarea
          v-model="details"
          maxlength="8000"
          rows="10"
          placeholder="写下这次抽卡的内容"
        ></textarea>
      </label>
      <div class="parent-field">
        <label for="parent-search">放在</label>
        <input
          id="parent-search"
          :value="searching ? query : (parent?.name ?? '')"
          :placeholder="parent ? parent.name : '搜索节点，不填就是顶层'"
          maxlength="80"
          enterkeyhint="search"
          autocomplete="off"
          @focus="startSearch"
          @input="onQuery"
          @blur="stopSearch"
        />
        <ul v-show="searching" class="parent-list">
          <li v-if="showTop">
            <button type="button" @pointerdown.prevent="chooseParent('')">顶层</button>
          </li>
          <li v-for="option in visibleOptions" :key="option.id">
            <button type="button" @pointerdown.prevent="chooseParent(option.id)">
              <strong>{{ option.name }}</strong>
              <small v-if="option.path !== option.name">{{ option.path }}</small>
            </button>
          </li>
          <li v-if="!showTop && visibleOptions.length === 0" class="parent-empty">没有匹配的节点</li>
        </ul>
      </div>
      <p v-if="error" class="form-error" role="alert">{{ error }}</p>
      <div class="dock">
        <button type="submit" :disabled="!store.canEdit || store.saving">
          {{ store.saving ? '正在保存…' : '保存' }}
        </button>
      </div>
    </form>
  </main>
</template>
