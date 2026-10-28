<template>
  <svg class="icon-sprite" aria-hidden="true">
    <symbol id="icon-route" viewBox="0 0 24 24">
      <circle cx="5" cy="18" r="2" />
      <circle cx="19" cy="6" r="2" />
      <path d="M7 18h3a2 2 0 0 0 2-2V8a2 2 0 0 1 2-2h5" />
      <path d="m14 12 3 3 4-4" />
    </symbol>

    <symbol id="icon-server" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="7" rx="2" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
      <path d="M7 6.5h.01M7 17.5h.01M11 6.5h6M11 17.5h6" />
    </symbol>

    <symbol id="icon-warning" viewBox="0 0 24 24">
      <path
        d="M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"
      />
      <path d="M12 9v4M12 17h.01" />
    </symbol>

    <symbol id="icon-history" viewBox="0 0 24 24">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </symbol>

    <!-- 首页总览 -->
    <symbol id="icon-overview-grid" viewBox="0 0 24 24">
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="11" width="7" height="10" rx="1.5" />
      <rect x="3" y="14" width="8" height="7" rx="1.5" />
    </symbol>
    <symbol id="icon-activity" viewBox="0 0 24 24">
      <path d="M3 12h4l2.2-6 4.2 12 2.4-7 1.7 3H21" />
      <path d="M4 4v3M20 17v3" />
    </symbol>
    <symbol id="icon-line-status" viewBox="0 0 24 24">
      <circle cx="5" cy="17" r="2" />
      <circle cx="12" cy="8" r="2" />
      <circle cx="19" cy="14" r="2" />
      <path d="m6.4 15.5 4.2-6M13.6 9.3l3.8 3.4M3 5h4" />
    </symbol>
    <symbol id="icon-device-status" viewBox="0 0 24 24">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h5" />
      <circle cx="9" cy="16.5" r="1.5" />
      <path d="M13 17h3" />
    </symbol>
    <symbol id="icon-siren" viewBox="0 0 24 24">
      <path d="M7 17v-6a5 5 0 0 1 10 0v6M5 21h14v-4H5v4Z" />
      <path d="M12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M2 11h2M20 11h2" />
    </symbol>

    <!-- 实时监测 -->
    <symbol id="icon-line-monitor" viewBox="0 0 24 24">
      <circle cx="4" cy="17" r="2" />
      <circle cx="20" cy="7" r="2" />
      <path d="m6 16 5-3 3 1 4-5M4 5h3l1 3 2-5 2 6h3" />
    </symbol>
    <symbol id="icon-device-monitor" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M7 20h10M12 17v3M7 11h2l1.5-3 2 6 1.5-3h3" />
    </symbol>
    <symbol id="icon-wave-live" viewBox="0 0 24 24">
      <path d="M2 13h3l2-7 4 13 3-10 2 7 2-3h4" />
      <circle cx="19" cy="5" r="2" />
    </symbol>
    <symbol id="icon-network" viewBox="0 0 24 24">
      <rect x="9" y="3" width="6" height="5" rx="1" />
      <rect x="3" y="16" width="6" height="5" rx="1" />
      <rect x="15" y="16" width="6" height="5" rx="1" />
      <path d="M12 8v4M6 16v-4h12v4" />
    </symbol>
    <symbol id="icon-wifi" viewBox="0 0 24 24">
      <path d="M4 9a12 12 0 0 1 16 0M7 13a7.5 7.5 0 0 1 10 0M10 17a3 3 0 0 1 4 0" />
      <circle cx="12" cy="20" r="1" />
    </symbol>

    <!-- 故障地图 -->
    <symbol id="icon-map-points" viewBox="0 0 24 24">
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
      <path d="M9 3v15M15 6v15" />
      <circle cx="12" cy="11" r="2" />
    </symbol>
    <symbol id="icon-crosshair" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </symbol>
    <symbol id="icon-topology" viewBox="0 0 24 24">
      <circle cx="12" cy="4" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <circle cx="12" cy="13" r="2" />
      <path d="M12 6v5M10 14.5l-3.5 3M14 14.5l3.5 3" />
    </symbol>
    <symbol id="icon-replay" viewBox="0 0 24 24">
      <path d="M4 12a8 8 0 1 0 2.4-5.7L3 9" />
      <path d="M3 4v5h5M10 9l6 3-6 3V9Z" />
    </symbol>
    <symbol id="icon-layers" viewBox="0 0 24 24">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </symbol>

    <!-- 智能解析 -->
    <symbol id="icon-wave-search" viewBox="0 0 24 24">
      <path d="M2 10h3l2-5 3 10 2-7 2 4" />
      <circle cx="17" cy="16" r="4" />
      <path d="m20 19 2 2" />
    </symbol>
    <symbol id="icon-ruler" viewBox="0 0 24 24">
      <path d="m4 17 13-13 4 4L8 21l-4-4Z" />
      <path d="m13 8 3 3M10 11l2 2M7 14l3 3" />
    </symbol>
    <symbol id="icon-diagnosis" viewBox="0 0 24 24">
      <path d="M12 3 4 6v5c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6l-8-3Z" />
      <path d="M8 12h2l1-3 2 6 1-3h2" />
    </symbol>
    <symbol id="icon-compare" viewBox="0 0 24 24">
      <path d="M8 3 4 7l4 4M4 7h13a3 3 0 0 1 3 3v1M16 21l4-4-4-4M20 17H7a3 3 0 0 1-3-3v-1" />
    </symbol>
    <symbol id="icon-file-clock" viewBox="0 0 24 24">
      <path d="M14 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7M14 3l5 5h-5V3Z" />
      <circle cx="17" cy="17" r="4" />
      <path d="M17 15v2l1.5 1" />
    </symbol>

    <!-- 预警中心 -->
    <symbol id="icon-bell-alert" viewBox="0 0 24 24">
      <path d="M17 9a5 5 0 0 0-10 0c0 6-3 6-3 8h14" />
      <path d="M10 21h4M20 4v4M20 11h.01" />
    </symbol>
    <symbol id="icon-lightning" viewBox="0 0 24 24">
      <path d="m13 2-9 12h7l-1 8 10-13h-7V2Z" />
    </symbol>
    <symbol id="icon-clipboard-check" viewBox="0 0 24 24">
      <rect x="4" y="4" width="16" height="18" rx="2" />
      <path d="M9 4V2h6v2M8 13l3 3 5-6" />
    </symbol>
    <symbol id="icon-shield-rules" viewBox="0 0 24 24">
      <path d="M12 3 4 6v5c0 5 3.4 8.3 8 10 4.6-1.7 8-5 8-10V6l-8-3Z" />
      <path d="M8 9h8M8 13h5M8 17h3" />
    </symbol>
    <symbol id="icon-message" viewBox="0 0 24 24">
      <path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M7 9h10M7 13h6" />
    </symbol>

    <!-- 统计报表 -->
    <symbol id="icon-bar-chart" viewBox="0 0 24 24">
      <path d="M4 21V10h4v11M10 21V4h4v17M16 21v-7h4v7M2 21h20" />
    </symbol>
    <symbol id="icon-pie-chart" viewBox="0 0 24 24">
      <path d="M11 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M15 3.9A9 9 0 0 1 20.1 9H15V3.9Z" />
    </symbol>
    <symbol id="icon-device-report" viewBox="0 0 24 24">
      <rect x="3" y="3" width="18" height="14" rx="2" />
      <path d="M7 13V9M11 13V6M15 13v-2M8 21h8M12 17v4" />
    </symbol>
    <symbol id="icon-trending" viewBox="0 0 24 24">
      <path d="M3 18 9 12l4 4 8-10" />
      <path d="M15 6h6v6" />
    </symbol>
    <symbol id="icon-download" viewBox="0 0 24 24">
      <path d="M12 3v12M7 10l5 5 5-5M4 21h16" />
    </symbol>

    <!-- 系统设置 -->
    <symbol id="icon-users" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-2a6 6 0 0 1 12 0v2M16 4a4 4 0 0 1 0 8M17 15a6 6 0 0 1 5 6" />
    </symbol>
    <symbol id="icon-key" viewBox="0 0 24 24">
      <circle cx="8" cy="15" r="5" />
      <path d="m11.5 11.5 8-8M17 6l2 2M14 9l2 2" />
    </symbol>
    <symbol id="icon-route-settings" viewBox="0 0 24 24">
      <circle cx="5" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M7 18h3a2 2 0 0 0 2-2V8a2 2 0 0 1 2-2h2" />
      <circle cx="18" cy="17" r="3" />
      <path d="M18 12v2M18 20v2M13 17h2M21 17h2" />
    </symbol>
    <symbol id="icon-sliders" viewBox="0 0 24 24">
      <path d="M4 6h6M14 6h6M4 12h10M18 12h2M4 18h3M11 18h9" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="16" cy="12" r="2" />
      <circle cx="9" cy="18" r="2" />
    </symbol>
    <symbol id="icon-terminal" viewBox="0 0 24 24">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </symbol>

    <symbol id="icon-bell" viewBox="0 0 24 24">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </symbol>

    <symbol id="icon-fullscreen" viewBox="0 0 24 24">
      <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
    </symbol>

    <symbol id="icon-exit-fullscreen" viewBox="0 0 24 24">
      <path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5" />
    </symbol>

    <symbol id="icon-chevron" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </symbol>

    <symbol id="icon-lock" viewBox="0 0 24 24">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </symbol>

    <symbol id="icon-monitor" viewBox="0 0 24 24">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </symbol>

    <symbol id="icon-zoom-in" viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6" />
    </symbol>

    <symbol id="icon-zoom-out" viewBox="0 0 24 24">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5M7.5 10.5h6" />
    </symbol>

    <symbol id="icon-logout" viewBox="0 0 24 24">
      <path d="M10 17l5-5-5-5M15 12H3M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </symbol>
  </svg>
</template>
