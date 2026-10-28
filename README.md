# 电缆行波监测云平台前端

面向电缆行波监测、设备管理和线路可视化的桌面 Web 前端，通过 HTTP API 与配套后端连接。

## 1. 技术框架

| 技术                       | 用途                         |
| -------------------------- | ---------------------------- |
| Vue 3 + TypeScript         | 页面开发与类型约束           |
| Vite                       | 开发服务与生产构建           |
| Vue Router + Pinia         | 路由管理与全局状态管理       |
| 高德地图 JS API + Three.js | 地理线路展示与 3D 拓扑       |
| SVG + CSS                  | 波形曲线、界面布局和动态效果 |
| Vitest + Vue Test Utils    | 单元与组件测试               |
| ESLint + Oxlint + Prettier | 代码检查与格式化             |

## 2. 运行环境配置

- **Node.js**：满足 `^22.18.0 || >=24.12.0`。
- **包管理器**：npm，保留 `package-lock.json`。
- **浏览器**：支持 CSS 容器查询、Subgrid 和 WebGL 的现代桌面浏览器。
- **后端**：需单独启动配套 API 服务；开发环境默认代理到 `http://127.0.0.1:8000`。

首次运行时，将 `.env.example` 复制为 `.env.local`，填写以下配置；已有本机配置时不要覆盖。

```dotenv
VITE_API_BASE_URL=
VITE_AMAP_KEY=your_amap_web_key
VITE_AMAP_SECURITY_CODE=your_amap_security_code
```

`VITE_API_BASE_URL` 留空时使用同源 `/api` 请求；前后端分离部署时填写后端源站地址，不添加 `/api` 后缀。修改环境变量后需重启开发服务或重新构建；真实配置不要提交到 GitHub。

在项目根目录安装依赖并启动：

```sh
npm ci
npm run dev
```

访问终端打印的地址，通常为 `http://localhost:5173`。

常用命令：

```sh
npm run build              # 类型检查并构建，产物位于 dist/
npm run preview            # 本地预览构建产物
npm run test:unit -- --run # 运行测试
```

## 3. 目录结构

```text
Frontend.v2/
├─ public/                  静态资源
├─ src/
│  ├─ assets/               全局样式与资源
│  ├─ components/           公共组件
│  ├─ composables/          轮询等复用逻辑
│  ├─ config/               导航配置
│  ├─ domain/               设备、线路及地图业务模型
│  ├─ integrations/amap/    高德地图 SDK 集成
│  ├─ layouts/              平台整体布局
│  ├─ router/               页面路由
│  ├─ services/             HTTP 请求与后端接口
│  ├─ stores/               全局业务状态
│  ├─ utils/                波形转换等工具函数
│  ├─ views/                业务页面
│  │  ├─ overview/          首页总览
│  │  ├─ monitoring/        实时监测
│  │  ├─ fault-map/         故障地图与线路拓扑
│  │  ├─ settings/          线路与设备配置
│  │  └─ analysis/、warnings/、reports/  预留业务模块
│  ├─ __tests__/            测试文件
│  ├─ App.vue               根组件
│  └─ main.ts               应用入口
├─ .env.example             环境变量模板
├─ index.html               页面入口
├─ package.json             依赖与运行命令
├─ package-lock.json        依赖锁文件
├─ vite.config.ts           构建与开发代理配置
└─ README.md                项目说明
```

页面专用组件、类型和样式与对应页面共置；首页四页共用 `views/overview/overview-layout.css` 管理网格对齐。

## 4. 已实现功能

| 模块     | 已实现内容                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| 首页总览 | 综合总览、运行态势、线路态势、设备态势；汇总指标、接收统计、节点状态、最新波形曲线及详情跳转                     |
| 实时监测 | 线路、设备和行波监测；切换设备/相间、协议校验、波形采样值查看与前段缩放、全屏、暂停/继续刷新、线路 JSON 快照导出 |
| 故障地图 | 地图线路绘制、节点交互、故障分布页面、2D/3D 线路拓扑、底图与图层切换及透明度调整                                 |
| 系统设置 | 线路和设备档案新增/编辑、定位节点绑定与排序、监测终端关联定位设备、配置保存与近期在线状态检查                    |
| 公共能力 | 导航切换、侧栏收展、平台全屏、请求取消、错误与空数据提示、桌面响应式布局                                         |

说明：实时数据目前采用 HTTP 轮询，并非服务端推送；告警、智能解析、报表及账户权限等业务仍有预留页面。地图展示不代表已完成自动故障定位闭环，平台配置保存也不代表已向设备下发参数。正式部署前仍需处理已知依赖安全风险、统计口径问题并补齐访问控制。
