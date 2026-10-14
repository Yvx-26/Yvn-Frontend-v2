export interface SideMenuItem {
  id: string
  label: string
  icon: string
  path: string
}

export interface NavigationItem {
  id: string
  label: string
  shortLabel: string
  code: string
  children: SideMenuItem[]
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'overview',
    label: '首页总览',
    shortLabel: '首页',
    code: 'OVERVIEW',
    children: [
      {
        id: 'comprehensive-overview',
        label: '综合总览',
        icon: 'overview-grid',
        path: '/overview/comprehensive',
      },
      {
        id: 'operation-situation',
        label: '运行态势',
        icon: 'activity',
        path: '/overview/operation',
      },
      { id: 'line-situation', label: '线路态势', icon: 'line-status', path: '/overview/lines' },
      {
        id: 'device-situation',
        label: '设备态势',
        icon: 'device-status',
        path: '/overview/devices',
      },
      { id: 'realtime-alarm', label: '实时告警', icon: 'siren', path: '/overview/alarms' },
    ],
  },
  {
    id: 'monitor',
    label: '实时监测',
    shortLabel: '监测',
    code: 'MONITORING',
    children: [
      { id: 'line-monitor', label: '线路监测', icon: 'line-monitor', path: '/monitoring/lines' },
      {
        id: 'device-monitor',
        label: '设备监测',
        icon: 'device-monitor',
        path: '/monitoring/devices',
      },
      { id: 'wave-monitor', label: '行波监测', icon: 'wave-live', path: '/monitoring/waves' },
      { id: 'link-monitor', label: '数据链路', icon: 'network', path: '/monitoring/links' },
      { id: 'online-status', label: '在线状态', icon: 'wifi', path: '/monitoring/status' },
    ],
  },
  {
    id: 'map',
    label: '故障地图',
    shortLabel: '地图',
    code: 'FAULT MAP',
    children: [
      {
        id: 'fault-distribution',
        label: '故障分布',
        icon: 'map-points',
        path: '/fault-map/distribution',
      },
      {
        id: 'realtime-location',
        label: '实时定位',
        icon: 'crosshair',
        path: '/fault-map/location',
      },
      { id: 'line-topology', label: '线路拓扑', icon: 'topology', path: '/fault-map/topology' },
      { id: 'fault-playback', label: '故障回放', icon: 'replay', path: '/fault-map/playback' },
      { id: 'map-layers', label: '地图图层', icon: 'layers', path: '/fault-map/layers' },
    ],
  },
  {
    id: 'analysis',
    label: '智能解析',
    shortLabel: '解析',
    code: 'ANALYSIS',
    children: [
      { id: 'wave-analysis', label: '波形解析', icon: 'wave-search', path: '/analysis/waves' },
      { id: 'ranging-analysis', label: '行波测距', icon: 'ruler', path: '/analysis/ranging' },
      { id: 'fault-diagnosis', label: '故障研判', icon: 'diagnosis', path: '/analysis/diagnosis' },
      {
        id: 'comparison-analysis',
        label: '对比分析',
        icon: 'compare',
        path: '/analysis/comparison',
      },
      { id: 'analysis-records', label: '解析记录', icon: 'file-clock', path: '/analysis/records' },
    ],
  },
  {
    id: 'warning',
    label: '预警中心',
    shortLabel: '预警',
    code: 'WARNING',
    children: [
      { id: 'realtime-warning', label: '实时预警', icon: 'bell-alert', path: '/warnings/realtime' },
      { id: 'fault-alarm', label: '故障告警', icon: 'lightning', path: '/warnings/faults' },
      {
        id: 'alarm-handling',
        label: '告警处置',
        icon: 'clipboard-check',
        path: '/warnings/handling',
      },
      { id: 'warning-rules', label: '预警规则', icon: 'shield-rules', path: '/warnings/rules' },
      {
        id: 'notification-config',
        label: '通知配置',
        icon: 'message',
        path: '/warnings/notifications',
      },
    ],
  },
  {
    id: 'report',
    label: '统计报表',
    shortLabel: '报表',
    code: 'REPORTS',
    children: [
      { id: 'operation-report', label: '运行统计', icon: 'bar-chart', path: '/reports/operation' },
      { id: 'fault-report', label: '故障统计', icon: 'pie-chart', path: '/reports/faults' },
      { id: 'device-report', label: '设备报表', icon: 'device-report', path: '/reports/devices' },
      { id: 'trend-analysis', label: '趋势分析', icon: 'trending', path: '/reports/trends' },
      { id: 'report-export', label: '报表导出', icon: 'download', path: '/reports/export' },
    ],
  },
  {
    id: 'settings',
    label: '系统设置',
    shortLabel: '设置',
    code: 'SETTINGS',
    children: [
      { id: 'user-management', label: '用户管理', icon: 'users', path: '/settings/users' },
      { id: 'role-permissions', label: '角色权限', icon: 'key', path: '/settings/roles' },
      { id: 'line-management', label: '线路管理', icon: 'route-settings', path: '/settings/lines' },
      { id: 'device-config', label: '设备配置', icon: 'sliders', path: '/settings/devices' },
      { id: 'system-log', label: '系统日志', icon: 'terminal', path: '/settings/logs' },
    ],
  },
]
