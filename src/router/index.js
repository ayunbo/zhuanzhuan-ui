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
    {
      path: '/goods/:id',
      name: 'goods-detail',
      component: () => import('../views/GoodsDetailView.vue'),
    },
    {
      path: '/user',
      component: () => import('../views/UserCenterLayout.vue'),
      meta: {
        showNavbarSearch: false,
      },
      children: [
        {
          path: '',
          name: 'user-center',
          component: () => import('../views/UserCenterHomeView.vue'),
          meta: {
            showNavbarSearch: false,
          },
        },
        {
          path: 'published',
          name: 'user-published',
          component: () => import('../views/UserCenterSectionView.vue'),
          meta: {
            showNavbarSearch: false,
            title: '我发布的',
          },
        },
        {
          path: 'sold',
          name: 'user-sold',
          component: () => import('../views/UserCenterSectionView.vue'),
          meta: {
            showNavbarSearch: false,
            title: '我卖出的',
          },
        },
        {
          path: 'bought',
          name: 'user-bought',
          component: () => import('../views/UserCenterSectionView.vue'),
          meta: {
            showNavbarSearch: false,
            title: '我买到的',
          },
        },
        {
          path: 'favorites',
          name: 'user-favorites',
          component: () => import('../views/UserCenterSectionView.vue'),
          meta: {
            showNavbarSearch: false,
            title: '我的收藏',
          },
        },
        {
          path: 'profile',
          name: 'user-profile',
          component: () => import('../views/UserProfileSettingsView.vue'),
          meta: {
            showNavbarSearch: false,
            title: '个人资料',
          },
        },
        {
          path: 'security',
          name: 'user-security',
          component: () => import('../views/UserCenterSectionView.vue'),
          meta: {
            showNavbarSearch: false,
            title: '账号与安全',
          },
        },
      ],
    },
  ],
})

export default router
