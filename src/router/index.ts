import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'
import { platformRoutes } from './routes/platform'

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL),
) {
  return createRouter({
    history,
    routes: platformRoutes,
  })
}

const router = createAppRouter()

export default router
