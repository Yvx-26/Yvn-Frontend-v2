<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import IconSprite from '../components/IconSprite.vue'
import { navigationItems } from '../config/navigation'
import { fetchDashboardSummary } from '../services/telemetry-api'
import { useInfrastructureStore } from '../stores/infrastructure'

const route = useRoute()
const router = useRouter()
const infrastructureStore = useInfrastructureStore()
const alarmCount = ref(0)
const topMenus = navigationItems
const lastVisitedPathByTop = ref<Record<string, string>>(
  Object.fromEntries(navigationItems.map((item) => [item.id, item.children[0]?.path ?? '/'])),
)
const sidebarExpanded = ref(false)
const noticeOpen = ref(false)
const userMenuOpen = ref(false)
const currentTime = ref(new Date())
const isFullscreen = ref(false)
let timer: number | undefined

const currentTopMenu = computed(
  () =>
    topMenus.find((item) => item.children.some((child) => child.path === route.path)) ??
    topMenus[0]!,
)
const sideMenus = computed(() => currentTopMenu.value.children)
const currentSideMenu = computed(() => sideMenus.value.find((item) => item.path === route.path))
const activeSideMenu = computed(() => currentSideMenu.value?.id)

watch(
  () => route.path,
  (path) => {
    const owner = topMenus.find((item) => item.children.some((child) => child.path === path))
    if (owner) lastVisitedPathByTop.value[owner.id] = path
  },
  { immediate: true },
)

const dateText = computed(() => {
  const date = currentTime.value
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(date)
  return `${year}-${month}-${day} ${weekday}`
})

const timeText = computed(() =>
  currentTime.value.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }),
)

function selectTopMenu(id: string) {
  const menu = topMenus.find((item) => item.id === id)
  const targetPath = lastVisitedPathByTop.value[id] ?? menu?.children[0]?.path
  if (targetPath && targetPath !== route.path) void router.push(targetPath)
}

function selectSideMenu(path: string) {
  if (path !== route.path) void router.push(path)
}

function toggleNotice() {
  noticeOpen.value = !noticeOpen.value
  userMenuOpen.value = false
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
  noticeOpen.value = false
}

function closePopovers(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.topbar-action')) noticeOpen.value = false
  if (!target.closest('.user-area')) userMenuOpen.value = false
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen()
    else await document.exitFullscreen()
  } catch {
    isFullscreen.value = false
  }
}

function syncFullscreenState() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

onMounted(() => {
  void fetchDashboardSummary()
    .then((summary) => {
      alarmCount.value = summary.alarm_count
    })
    .catch(() => {
      alarmCount.value = 0
    })
  timer = window.setInterval(() => (currentTime.value = new Date()), 1000)
  document.addEventListener('click', closePopovers)
  document.addEventListener('fullscreenchange', syncFullscreenState)
})

onBeforeUnmount(() => {
  if (timer) window.clearInterval(timer)
  document.removeEventListener('click', closePopovers)
  document.removeEventListener('fullscreenchange', syncFullscreenState)
})
</script>

<template>
  <div class="cloud-platform" :class="{ 'sidebar-is-expanded': sidebarExpanded }">
    <IconSprite />

    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true"><span>HNUT</span></div>
        <div class="brand-copy">
          <span class="brand-company">河南工业大学</span>
          <h1>线缆行波智能解析及实时故障地图定位云平台</h1>
        </div>
      </div>

      <nav class="top-nav" aria-label="主导航">
        <button
          v-for="item in topMenus"
          :key="item.id"
          type="button"
          class="top-nav-item"
          :aria-label="item.label"
          :class="{ active: currentTopMenu.id === item.id }"
          @click="selectTopMenu(item.id)"
        >
          <span class="full-label">{{ item.label }}</span
          ><span class="short-label">{{ item.shortLabel }}</span>
        </button>
      </nav>

      <div class="system-status">
        <div class="datetime">
          <span>{{ dateText }}</span
          ><strong>{{ timeText }}</strong>
        </div>
        <div class="topbar-action">
          <button
            type="button"
            class="icon-button"
            aria-label="查看告警"
            @click.stop="toggleNotice"
          >
            <svg><use href="#icon-bell" /></svg
            ><span v-if="alarmCount > 0" class="badge">{{ alarmCount }}</span>
          </button>
          <Transition name="popover">
            <div v-if="noticeOpen" class="popover notice-popover">
              <div class="popover-head">
                <strong>未处理告警</strong><button type="button">全部查看</button>
              </div>
              <div v-if="alarmCount === 0" class="notice-item">
                <span></span>
                <div><strong>暂无真实告警</strong><small>告警业务接口尚未接入</small></div>
              </div>
            </div>
          </Transition>
        </div>
        <button
          type="button"
          class="icon-button fullscreen-button"
          :aria-label="isFullscreen ? '退出全屏' : '进入全屏'"
          @click="toggleFullscreen"
        >
          <svg><use :href="isFullscreen ? '#icon-exit-fullscreen' : '#icon-fullscreen'" /></svg>
        </button>
        <div class="user-area">
          <button type="button" class="user-trigger" @click.stop="toggleUserMenu">
            <span class="avatar">夏</span
            ><span class="user-copy"><strong>夏工</strong><small>运维管理员</small></span
            ><svg class="user-chevron"><use href="#icon-chevron" /></svg>
          </button>
          <Transition name="popover">
            <div v-if="userMenuOpen" class="popover user-popover">
              <button type="button">
                <svg><use href="#icon-lock" /></svg>修改密码
              </button>
              <button type="button">
                <svg><use href="#icon-monitor" /></svg>切换大屏模式
              </button>
              <div class="menu-divider"></div>
              <button type="button" class="logout">
                <svg><use href="#icon-logout" /></svg>退出登录
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </header>

    <aside class="sidebar" :class="{ expanded: sidebarExpanded }">
      <div class="side-menu">
        <button
          v-for="item in sideMenus"
          :key="item.id"
          type="button"
          class="side-menu-item"
          :class="{ active: activeSideMenu === item.id }"
          :aria-label="item.label"
          @click="selectSideMenu(item.path)"
        >
          <svg><use :href="`#icon-${item.icon}`" /></svg
          ><span class="side-label">{{ item.label }}</span
          ><span v-if="!sidebarExpanded" class="tooltip">{{ item.label }}</span>
        </button>
      </div>
      <button
        type="button"
        class="collapse-button"
        :aria-label="sidebarExpanded ? '收起侧边栏' : '展开侧边栏'"
        @click="sidebarExpanded = !sidebarExpanded"
      >
        <svg :class="{ reversed: sidebarExpanded }"><use href="#icon-chevron" /></svg
        ><span>{{ sidebarExpanded ? '收起导航' : '' }}</span>
      </button>
    </aside>

    <main class="workspace">
      <div class="workspace-header">
        <div>
          <span class="eyebrow">{{ currentTopMenu.code }} / {{ currentTopMenu.label }}</span>
          <h2>{{ currentSideMenu?.label }}</h2>
        </div>
        <div class="workspace-header-controls">
          <div class="connection-state">
            <i></i>{{ infrastructureStore.backendConnected ? '平台连接正常' : '平台连接异常' }}
          </div>
        </div>
      </div>
      <RouterView />
      <footer class="workspace-footer">
        <span
          ><i class="green"></i
          >{{ infrastructureStore.backendConnected ? '云平台服务正常' : '云平台服务异常' }}</span
        ><span
          ><i class="cyan"></i
          >{{ infrastructureStore.backendConnected ? '数据接口已连接' : '数据接口未连接' }}</span
        ><span>系统版本 V1.0.0</span>
      </footer>
    </main>
  </div>
</template>
