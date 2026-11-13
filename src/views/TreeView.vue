<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import NodeBlock from '@/components/NodeBlock.vue'
import { useNodesStore } from '@/stores/nodes'

const store = useNodesStore()
const route = useRoute()
const router = useRouter()
const hintDismissed = ref(localStorage.getItem('record-draws-install-hint') === '1')
const selectedId = ref<string | null>(null)
const detailsOpenId = ref<string | null>(null)
const confirmingId = ref<string | null>(null)
const actionError = ref('')

const standalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true
const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
const showIosHint = computed(() => ios && !standalone && !hintDismissed.value)
const showInstall = computed(
  () => store.installPrompt !== null && !standalone && !hintDismissed.value,
)

const parentId = computed(() =>
  route.name === 'level' && typeof route.params.id === 'string' ? route.params.id : null,
)
const groups = computed(() =>
  store.childrenOf(parentId.value).map((node) => ({
    id: node.id,
    name: node.name,
    details: node.details,
    hasChildren: store.childrenOf(node.id).length > 0,
    children: store.childrenOf(node.id).map((child) => ({
      id: child.id,
      name: child.name,
      details: child.details,
      hasDeeper: store.childrenOf(child.id).length > 0,
    })),
  })),
)

watch(parentId, () => {
  selectedId.value = null
  detailsOpenId.value = null
  confirmingId.value = null
  actionError.value = ''
})

function dismissHint() {
  hintDismissed.value = true
  localStorage.setItem('record-draws-install-hint', '1')
}

function onName(id: string) {
  actionError.value = ''
  if (selectedId.value !== id) {
    selectedId.value = id
    detailsOpenId.value = null
    confirmingId.value = null
    return
  }
  detailsOpenId.value = detailsOpenId.value === id ? null : id
}

async function remove(id: string) {
  actionError.value = ''
  try {
    await store.removeNode(id)
    if (selectedId.value === id) selectedId.value = null
    detailsOpenId.value = null
    confirmingId.value = null
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '删除失败'
  }
}
</script>

<template>
  <main class="screen">
    <section v-if="showInstall || showIosHint" class="install">
      <p v-if="showInstall">可以把「记录抽卡」安装到手机桌面。</p>
      <p v-else>用 Safari 的分享按钮，选择「添加到主屏幕」。</p>
      <div class="install-actions">
        <button v-if="showInstall" type="button" @click="store.promptInstall()">安装</button>
        <button class="ghost" type="button" @click="dismissHint">知道了</button>
      </div>
    </section>

    <p v-if="store.link === 'offline'" class="banner" role="status">存储服务没连上，先不要修改。</p>

    <p v-if="store.link === 'syncing' && groups.length === 0" class="empty">正在读取…</p>
    <p v-else-if="groups.length === 0" class="empty">
      {{ parentId ? '这里还没有子节点。' : '还没有记录。先加一个最顶层的类型。' }}
    </p>

    <ul v-else class="groups">
      <li v-for="group in groups" :key="group.id" class="group">
        <NodeBlock
          :name="group.name"
          :details="group.details"
          :has-test="group.hasChildren"
          :has-deeper="false"
          :selected="selectedId === group.id"
          :details-open="detailsOpenId === group.id"
          :confirming="confirmingId === group.id"
          :can-edit="store.canEdit"
          :saving="store.saving"
          @select="onName(group.id)"
          @test="router.push(`/test/${group.id}`)"
          @add="router.push(`/new/${group.id}`)"
          @edit="router.push(`/node/${group.id}/edit`)"
          @ask-remove="confirmingId = group.id"
          @remove="remove(group.id)"
          @cancel-remove="confirmingId = null"
        />
        <ul v-if="group.children.length" class="subnodes">
          <li v-for="child in group.children" :key="child.id">
            <NodeBlock
              nested
              :name="child.name"
              :details="child.details"
              :has-test="child.hasDeeper"
              :has-deeper="child.hasDeeper"
              :selected="selectedId === child.id"
              :details-open="detailsOpenId === child.id"
              :confirming="confirmingId === child.id"
              :can-edit="store.canEdit"
              :saving="store.saving"
              @select="onName(child.id)"
              @test="router.push(`/test/${child.id}`)"
              @deeper="router.push(`/level/${child.id}`)"
              @add="router.push(`/new/${child.id}`)"
              @edit="router.push(`/node/${child.id}/edit`)"
              @ask-remove="confirmingId = child.id"
              @remove="remove(child.id)"
              @cancel-remove="confirmingId = null"
            />
          </li>
        </ul>
      </li>
    </ul>

    <p v-if="actionError" class="form-error" role="alert">{{ actionError }}</p>

    <div class="dock">
      <button
        type="button"
        :disabled="!store.canEdit"
        @click="router.push(parentId ? `/new/${parentId}` : '/new')"
      >
        {{ parentId ? '添加子项' : '添加' }}
      </button>
    </div>
  </main>
</template>
