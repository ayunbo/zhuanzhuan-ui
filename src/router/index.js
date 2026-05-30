import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const userCenterMeta = {
  showNavbarSearch: false,
}

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
      path: '/chat',
      name: 'chat',
      meta: {
        showNavbarSearch: false,
      },
      component: () => import('../views/chat/ChatView.vue'),
    },
    {
      path: '/checkout/:id',
      name: 'order-checkout',
      meta: {
        showNavbarSearch: false,
      },
      component: () => import('../views/OrderCheckoutView.vue'),
    },
    {
      path: '/payment/:orderId',
      name: 'payment',
      meta: {
        showNavbarSearch: false,
      },
      component: () => import('../views/PaymentView.vue'),
    },
    {
      path: '/order/detail/:id',
      name: 'order-detail',
      meta: {
        showNavbarSearch: false,
      },
      component: () => import('../views/OrderDetailView.vue'),
    },
    {
      path: '/order/review',
      name: 'order-review',
      meta: {
        showNavbarSearch: false,
      },
      component: () => import('../views/ReviewCreateView.vue'),
    },
    {
      path: '/history',
      name: 'browse-history',
      meta: {
        showNavbarSearch: false,
      },
      component: () => import('../views/BrowseHistoryView.vue'),
    },
    {
      path: '/seller/:id',
      name: 'seller-profile',
      component: () => import('../views/SellerProfileView.vue'),
    },
    {
      path: '/user',
      component: () => import('../views/UserCenterLayout.vue'),
      meta: userCenterMeta,
      children: [
        {
          path: '',
          name: 'user-center',
          component: () => import('../views/UserCenterHomeView.vue'),
          meta: {
            ...userCenterMeta,
          },
        },
        {
          path: 'published',
          name: 'user-published',
          component: () => import('../views/UserPublishedGoodsView.vue'),
          meta: {
            ...userCenterMeta,
            title: '我发布的',
          },
        },
        {
          path: 'sold',
          name: 'user-sold',
          component: () => import('../views/UserCenterSectionView.vue'),
          meta: {
            ...userCenterMeta,
            title: '我卖出的',
          },
        },
        {
          path: 'bought',
          name: 'user-bought',
          component: () => import('../views/UserBoughtOrdersView.vue'),
          meta: {
            ...userCenterMeta,
            title: '我买到的',
          },
        },
        {
          path: 'favorites',
          name: 'user-favorites',
          component: () => import('../views/UserFavoritesView.vue'),
          meta: {
            ...userCenterMeta,
            title: '我的收藏',
          },
        },
        {
          path: 'reports',
          name: 'user-reports',
          component: () => import('../views/UserReportsView.vue'),
          meta: {
            ...userCenterMeta,
            title: '我的举报',
          },
        },
        {
          path: 'search-history',
          name: 'user-search-history',
          component: () => import('../views/UserSearchHistoryView.vue'),
          meta: {
            ...userCenterMeta,
            title: '搜索历史',
          },
        },
        {
          path: 'profile',
          name: 'user-profile',
          component: () => import('../views/UserProfileSettingsView.vue'),
          meta: {
            ...userCenterMeta,
            title: '个人资料',
          },
        },
        {
          path: 'security',
          name: 'user-security',
          component: () => import('../views/UserSellerAuthView.vue'),
          meta: {
            ...userCenterMeta,
            title: '卖家认证',
          },
        },
        {
          path: 'wallet',
          name: 'user-wallet',
          component: () => import('../views/UserWalletView.vue'),
          meta: {
            ...userCenterMeta,
            title: '我的钱包',
          },
        },
      ],
    },
  ],
})

export default router
