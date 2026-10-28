import type { MonitoringFrame } from './types'

// 综合总览会在路由切换时卸载。保留最近一帧可以让用户返回页面时立即看到
// 已有波形，再由后台轮询替换为最新数据。
export const overviewRuntimeCache: { latestBatch?: MonitoringFrame } = {}
