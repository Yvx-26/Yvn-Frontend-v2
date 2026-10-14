import type { RouteRecordRaw } from 'vue-router'

export const platformRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('../../layouts/PlatformLayout.vue'),
    redirect: '/overview/comprehensive',
    children: [
      {
        path: 'overview/comprehensive',
        name: 'comprehensive-overview',
        component: () => import('../../views/overview/ComprehensiveOverview.vue'),
      },
      {
        path: 'overview/operation',
        name: 'operation-situation',
        component: () => import('../../views/overview/OperationSituation.vue'),
      },
      {
        path: 'overview/lines',
        name: 'line-situation',
        component: () => import('../../views/overview/LineSituation.vue'),
      },
      {
        path: 'overview/devices',
        name: 'device-situation',
        component: () => import('../../views/overview/DeviceSituation.vue'),
      },
      {
        path: 'overview/alarms',
        name: 'realtime-alarm',
        component: () => import('../../views/overview/RealtimeAlarm.vue'),
      },
      {
        path: 'monitoring/lines',
        name: 'line-monitor',
        component: () => import('../../views/monitoring/LineMonitor.vue'),
      },
      {
        path: 'monitoring/devices',
        name: 'device-monitor',
        component: () => import('../../views/monitoring/DeviceMonitor.vue'),
      },
      {
        path: 'monitoring/waves',
        name: 'wave-monitor',
        component: () => import('../../views/monitoring/WaveMonitor.vue'),
      },
      {
        path: 'monitoring/links',
        name: 'link-monitor',
        component: () => import('../../views/monitoring/LinkMonitor.vue'),
      },
      {
        path: 'monitoring/status',
        name: 'online-status',
        component: () => import('../../views/monitoring/OnlineStatus.vue'),
      },
      {
        path: 'fault-map/distribution',
        name: 'fault-distribution',
        component: () => import('../../views/fault-map/FaultDistribution.vue'),
      },
      {
        path: 'fault-map/location',
        name: 'realtime-location',
        component: () => import('../../views/fault-map/RealtimeLocation.vue'),
      },
      {
        path: 'fault-map/topology',
        name: 'line-topology',
        component: () => import('../../views/fault-map/LineTopology.vue'),
      },
      {
        path: 'fault-map/playback',
        name: 'fault-playback',
        component: () => import('../../views/fault-map/FaultPlayback.vue'),
      },
      {
        path: 'fault-map/layers',
        name: 'map-layers',
        component: () => import('../../views/fault-map/MapLayers.vue'),
      },
      {
        path: 'analysis/waves',
        name: 'wave-analysis',
        component: () => import('../../views/analysis/WaveAnalysis.vue'),
      },
      {
        path: 'analysis/ranging',
        name: 'ranging-analysis',
        component: () => import('../../views/analysis/RangingAnalysis.vue'),
      },
      {
        path: 'analysis/diagnosis',
        name: 'fault-diagnosis',
        component: () => import('../../views/analysis/FaultDiagnosis.vue'),
      },
      {
        path: 'analysis/comparison',
        name: 'comparison-analysis',
        component: () => import('../../views/analysis/ComparisonAnalysis.vue'),
      },
      {
        path: 'analysis/records',
        name: 'analysis-records',
        component: () => import('../../views/analysis/AnalysisRecords.vue'),
      },
      {
        path: 'warnings/realtime',
        name: 'realtime-warning',
        component: () => import('../../views/warnings/RealtimeWarning.vue'),
      },
      {
        path: 'warnings/faults',
        name: 'fault-alarm',
        component: () => import('../../views/warnings/FaultAlarm.vue'),
      },
      {
        path: 'warnings/handling',
        name: 'alarm-handling',
        component: () => import('../../views/warnings/AlarmHandling.vue'),
      },
      {
        path: 'warnings/rules',
        name: 'warning-rules',
        component: () => import('../../views/warnings/WarningRules.vue'),
      },
      {
        path: 'warnings/notifications',
        name: 'notification-config',
        component: () => import('../../views/warnings/NotificationConfig.vue'),
      },
      {
        path: 'reports/operation',
        name: 'operation-report',
        component: () => import('../../views/reports/OperationReport.vue'),
      },
      {
        path: 'reports/faults',
        name: 'fault-report',
        component: () => import('../../views/reports/FaultReport.vue'),
      },
      {
        path: 'reports/devices',
        name: 'device-report',
        component: () => import('../../views/reports/DeviceReport.vue'),
      },
      {
        path: 'reports/trends',
        name: 'trend-analysis',
        component: () => import('../../views/reports/TrendAnalysis.vue'),
      },
      {
        path: 'reports/export',
        name: 'report-export',
        component: () => import('../../views/reports/ReportExport.vue'),
      },
      {
        path: 'settings/users',
        name: 'user-management',
        component: () => import('../../views/settings/UserManagement.vue'),
      },
      {
        path: 'settings/roles',
        name: 'role-permissions',
        component: () => import('../../views/settings/RolePermissions.vue'),
      },
      {
        path: 'settings/lines',
        name: 'line-management',
        component: () => import('../../views/settings/LineManagement.vue'),
      },
      {
        path: 'settings/devices',
        name: 'device-config',
        component: () => import('../../views/settings/DeviceConfig.vue'),
      },
      {
        path: 'settings/logs',
        name: 'system-log',
        component: () => import('../../views/settings/SystemLog.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/overview/comprehensive',
  },
]
