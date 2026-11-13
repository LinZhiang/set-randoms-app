import { createRouter, createWebHistory } from 'vue-router'
import TreeView from '../views/TreeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'tree',
      component: TreeView,
    },
    {
      path: '/level/:id',
      name: 'level',
      component: TreeView,
    },
    {
      path: '/test/:id',
      name: 'test',
      component: () => import('../views/TestView.vue'),
    },
    {
      path: '/node/:id',
      name: 'detail',
      component: () => import('../views/NodeDetailView.vue'),
    },
    {
      path: '/node/:id/edit',
      name: 'edit',
      component: () => import('../views/NodeEditView.vue'),
    },
    {
      path: '/new/:parentId?',
      name: 'create',
      component: () => import('../views/NodeEditView.vue'),
    },
  ],
})

router.afterEach(() => {
  document.title = '卡片式练习'
})

export default router
