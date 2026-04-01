import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      meta: {
        hideChrome: true,
      },
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/publish',
      name: 'publish',
      component: () => import('../views/PublishGoodsView.vue'),
    },
    {
      path: '/search',
      name: 'search',
      component: () => import('../views/SearchResultView.vue'),
    },
  ],
})

export default router
