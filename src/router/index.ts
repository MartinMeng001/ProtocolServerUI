import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

// 路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: {
          title: '仪表盘',
          icon: 'Odometer',
          requiresAuth: false
        }
      },
      {
        path: 'devices',
        name: 'Devices',
        component: () => import('@/views/Devices.vue'),
        meta: {
          title: '设备管理',
          icon: 'Monitor',
          requiresAuth: false
        }
      },
      {
        path: 'device/:deviceId', // 冒号表示这是一个动态参数
        name: 'DeviceDetail',
        component: () => import('@/views/DeviceDetail.vue'), // 假设有一个 DeviceDetail.vue 组件
        meta: {
          title: '设备详情',
          requiresAuth: false,
          hideInMenu: true // 在菜单中隐藏
        }
      },
      {
        path: 'connections',
        name: 'Connections',
        component: () => import('@/views/Connections.vue'),
        meta: {
          title: '连接管理',
          icon: 'Connection',
          requiresAuth: false
        }
      },
      {
        path: 'config',
        name: 'Config',
        component: () => import('@/views/Config.vue'),
        meta: {
          title: '设备配置',
          icon: 'Setting',
          requiresAuth: false
        }
      },
      {
        path: 'logs',
        name: 'Logs',
        component: () => import('@/views/Logs.vue'),
        meta: {
          title: '日志管理',
          icon: 'Document',
          requiresAuth: false
        }
      }
    ]
  },
  // {
  //   path: '/404',
  //   name: 'NotFound',
  //   component: () => import('@/views/NotFound.vue'),
  //   meta: {
  //     title: '页面未找到',
  //     requiresAuth: false,
  //     hideInMenu: true,
  //     hideInLayout: true
  //   }
  // },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404'
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 始终滚动到顶部
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta?.title) {
    document.title = `${to.meta.title} - 物联网设备管理系统`
  } else {
    document.title = '物联网设备管理系统'
  }

  // 身份验证检查（如果需要的话）
  if (to.meta?.requiresAuth) {
    // 这里可以添加身份验证逻辑
    // const isAuthenticated = checkAuth()
    // if (!isAuthenticated) {
    //   next('/login')
    //   return
    // }
  }

  // 路由权限检查
  if (to.meta?.requiresPermission) {
    // 这里可以添加权限检查逻辑
    // const hasPermission = checkPermission(to.meta.requiresPermission)
    // if (!hasPermission) {
    //   next('/403')
    //   return
    // }
  }

  next()
})

router.afterEach((to, from) => {
  // 路由跳转后的处理
  console.log(`路由跳转: ${from.path} -> ${to.path}`)
})

// 路由错误处理
router.onError((error) => {
  console.error('路由错误:', error)
})

// 导出路由实例
export default router

// 导出路由配置，供其他地方使用（如菜单生成）
export { routes }

// 获取菜单路由（排除隐藏的路由）
export const getMenuRoutes = (): RouteRecordRaw[] => {
  const layoutRoute = routes.find(route => route.name === 'Layout')
  if (layoutRoute && layoutRoute.children) {
    return layoutRoute.children.filter(route =>
      !route.meta?.hideInMenu &&
      !route.meta?.hideInLayout
    )
  }
  return []
}

// 根据路由名称获取路由配置
export const getRouteByName = (name: string): RouteRecordRaw | undefined => {
  return routes.find(route => route.name === name)
}

// 检查路由是否存在
export const isValidRoute = (path: string): boolean => {
  return routes.some(route =>
    route.path === path ||
    (route.children && route.children.some(child => child.path === path))
  )
}

// 路由元数据类型声明
declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    icon?: string
    requiresAuth?: boolean
    requiresPermission?: string | string[]
    hideInMenu?: boolean
    hideInLayout?: boolean
    keepAlive?: boolean
    affix?: boolean
  }
}