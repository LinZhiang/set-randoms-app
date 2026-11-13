<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import NodeTools from '@/components/NodeTools.vue'
import { useNodesStore } from '@/stores/nodes'

const props = defineProps<{
  parentId: string | null
}>()

const store = useNodesStore()
const router = useRouter()
const selectedId = ref<string | null>(null)
const showAll = ref(false)

const nodes = computed(() => store.childrenOf(props.parentId))
const visible = computed(() => (showAll.value ? nodes.value : nodes.value.slice(0, 2)))
const hiddenCount = computed(() => Math.max(nodes.value.length - 2, 0))

function choose(id: string) {
  if (selectedId.value === id) {
    void router.push(`/node/${id}`)
    return
  }
  selectedId.value = id
}
</script>

<template>
  <p v-if="nodes.length > 2 && !showAll" class="sync-note">默认只显示前两个。</p>
  <ul v-if="visible.length" class="tree">
    <li v-for="node in visible" :key="node.id" :class="{ selected: selectedId === node.id }">
      <button
        class="label"
        type="button"
        :aria-pressed="selectedId === node.id"
        @click="choose(node.id)"
      >
        <strong>{{ node.name }}</strong>
      </button>
      <NodeTools v-if="selectedId === node.id" :node-id="node.id" />
    </li>
  </ul>
  <button v-if="hiddenCount > 0" class="more" type="button" @click="showAll = !showAll">
    {{ showAll ? '只看前两个' : `还有 ${hiddenCount} 个` }}
  </button>
</template>
