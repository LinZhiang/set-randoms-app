<script setup lang="ts">
defineProps<{
  name: string
  details: string
  nested?: boolean
  hasTest: boolean
  hasDeeper: boolean
  selected: boolean
  detailsOpen: boolean
  confirming: boolean
  canEdit: boolean
  saving: boolean
  views?: number
}>()

const emit = defineEmits<{
  select: []
  test: []
  deeper: []
  add: []
  edit: []
  askRemove: []
  remove: []
  cancelRemove: []
}>()
</script>

<template>
  <div class="entry" :class="{ nested, selected }">
    <div class="node-row">
      <button class="node-name" type="button" @click="emit('select')">
        <span>{{ name }}</span>
        <small v-if="!hasTest">查看 {{ views ?? 0 }} 次</small>
      </button>
      <button v-if="hasTest" class="mini" type="button" aria-label="测试" @click="emit('test')">
        测
      </button>
      <button
        v-if="hasDeeper"
        class="chevron mini"
        type="button"
        aria-label="查看更深层"
        @click="emit('deeper')"
      ></button>
    </div>

    <div v-if="selected" class="icon-row">
      <button type="button" aria-label="添加子节点" :disabled="!canEdit" @click="emit('add')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button type="button" aria-label="编辑" :disabled="!canEdit" @click="emit('edit')">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        class="danger"
        type="button"
        aria-label="删除"
        :disabled="!canEdit"
        @click="emit('askRemove')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 7h14M9 7V5h6v2M8 7l1 12h6l1-12"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <p v-if="detailsOpen" class="inline-details">{{ details || '还没有详情。' }}</p>

    <div v-if="confirming" class="inline-confirm">
      <p>删除「{{ name }}」以及里面的子节点？</p>
      <button class="danger" type="button" :disabled="saving" @click="emit('remove')">删除</button>
      <button class="ghost" type="button" @click="emit('cancelRemove')">取消</button>
    </div>
  </div>
</template>
