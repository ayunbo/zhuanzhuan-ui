import { createRouter, createWebHistory } from 'vue-router'
import { getStoredToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
      meta: {
        title: '首页',
      },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: {
        title: '用户登录',
        guestOnly: true,
      },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: {
        title: '用户注册',
        guestOnly: true,
      },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: {
        title: '个人中心',
        requiresAuth: true,
      },
    },
    {
      path: '/wallet',
      name: 'wallet',
      component: () => import('@/views/VirtualWalletView.vue'),
      meta: {
        title: '虚拟钱包',
        requiresAuth: true,
      },
    },
    {
      path: '/seller-auth',
      name: 'sellerAuth',
      component: () => import('@/views/SellerAuthView.vue'),
      meta: {
        title: '卖家认证',
        requiresAuth: true,
      },
    },
    {
      path: '/seller/goods',
      name: 'seller-goods',
      component: () => import('@/views/SellerGoodsManageView.vue'),
      meta: {
        title: '我的商品',
        requiresAuth: true,
      },
    },
    {
      path: '/order/create',
      name: 'order-create',
      component: () => import('@/views/OrderCreateView.vue'),
      meta: {
        title: '创建订单',
        requiresAuth: true,
      },
    },
    {
      path: '/order-test',
      name: 'order-test',
      component: () => import('@/views/OrderTestView.vue'),
      meta: {
        title: '订单测试',
      },
    },
    {
      path: '/goods',
      name: 'goods-list',
      component: () => import('@/views/GoodsListView.vue'),
      meta: {
        title: '商品列表',
      },
    },
    {
      path: '/goods/:id',
      name: 'goods-detail',
      component: () => import('@/views/GoodsDetailView.vue'),
      meta: {
        title: '商品详情',
      },
    },
    {
      path: '/pay',
      name: 'pay',
      component: () => import('@/views/PayView.vue'),
      meta: {
        title: '订单支付',
        requiresAuth: true,
      },
    },
    {
      path: '/my-order',
      name: 'my-order',
      component: () => import('@/views/MyOrderView.vue'),
      meta: {
        title: '我的订单',
        requiresAuth: true,
      },
    },
    {
      path: '/order/detail/:id',
      name: 'order-detail',
      component: () => import('@/views/OrderDetailView.vue'),
      meta: {
        title: '订单详情',
        requiresAuth: true,
      },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'notFound',
      component: () => import('@/views/NotFoundView.vue'),
      meta: {
        title: '页面不存在',
      },
    },
  ],
})

router.beforeEach((to) => {
  const token = getStoredToken()

  if (to.meta.requiresAuth && !token) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (to.meta.guestOnly && token) {
    return { name: 'profile' }
  }

  return true
})

router.afterEach((to) => {
  const pageTitle = to.meta.title || '用户端'
  document.title = `${pageTitle} - 赚赚`
})

export default router
