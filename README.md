# 电缆行波监测云平台前端

本项目使用 Vue 3、TypeScript、Vite、Vue Router 和 Pinia。开发环境通过 Vite 将 `/api` 请求代理到 `http://127.0.0.1:8000`。

## 启动与检查

```sh
npm install
```

首次运行时复制环境变量模板，并在 `.env.local` 中填写高德地图配置。开发环境下
`VITE_API_BASE_URL` 可以留空，前端会继续通过 Vite 代理访问本机后端；前后端
分离部署时再填写后端完整地址。`.env.local` 仅保存在本机，不要提交到仓库。

```powershell
Copy-Item .env.example .env.local
```

```sh
npm run dev
```

```sh
npm run build
npm run test:unit -- --run
npx eslint src --no-cache
npx oxlint src
```

## 根目录说明

| 目录或文件 | 作用 | 是否可直接删除 |
| --- | --- | --- |
| `src/` | 前端业务源码 | 不可删除 |
| `public/` | 不经打包处理、直接复制到站点根目录的静态文件；当前保存网站图标 | 不可删除 |
| `dist/` | `npm run build` 生成的生产部署文件 | 可以重新生成，但部署时需要 |
| `node_modules/` | npm 安装的第三方依赖 | 可以通过 `npm install` 重新生成 |
| `.vscode/` | VS Code 推荐插件和工作区设置 | 不影响生产运行 |
| `index.html` | Vite 页面入口 | 不可删除 |
| `package.json` | 依赖、启动、构建、测试和检查命令 | 不可删除 |
| `package-lock.json` | 锁定依赖版本，保证不同电脑安装结果一致 | 建议保留 |
| `vite.config.ts` | Vite 插件、路径别名和后端代理配置 | 不可删除 |
| `vitest.config.ts` | 单元测试环境配置 | 需要运行测试时不可删除 |
| `tsconfig*.json` | TypeScript、Vue 和测试类型检查配置 | 不可删除 |
| `eslint.config.ts`、`.oxlintrc.json` | 代码质量检查配置 | 建议保留 |
| `.prettierrc.json`、`.editorconfig` | 代码格式和编辑器风格配置 | 建议保留 |
| `.env.example` | 可提交的环境变量模板，仅包含占位值 | 建议保留并上传 |
| `.env.local` | 本机真实环境变量，可能包含地图配置 | 不可上传，已由 `.gitignore` 排除 |
| `env.d.ts` | Vite/Vue 环境类型声明 | 不可删除 |

## `src/` 目录说明

| 目录或文件 | 作用 |
| --- | --- |
| `main.ts` | 创建 Vue 应用，注册 Pinia 和路由，初始化基础设施数据 |
| `App.vue` | 应用根组件，承载路由出口 |
| `assets/` | 全局样式等需要参与 Vite 打包的资源 |
| `components/` | 多个页面共用的组件；`common/` 中包含未完成模块使用的统一占位组件 |
| `config/` | 系统导航、菜单名称、图标和路由地址等静态配置 |
| `domain/` | 跨页面共享的业务领域类型，例如设备、线路和绑定关系 |
| `layouts/` | 页面整体框架，包括顶部导航、侧边栏和主内容区 |
| `router/` | Vue Router 创建逻辑；`routes/` 保存平台全部页面路由 |
| `services/` | 与后端通信的 API 封装及统一 HTTP 请求处理 |
| `stores/` | Pinia 全局状态；当前主要维护线路、设备和绑定关系 |
| `utils/` | 无页面状态的通用计算函数，例如波形统计 |
| `views/` | 按导航模块划分的页面和页面专用组件 |
| `__tests__/` | Vitest 单元测试，不会进入生产包 |
| `components/IconSprite.vue` | 全站 SVG 图标定义，供页面通过图标 ID 复用 |

## `src/views/` 页面目录说明

| 目录 | 对应功能 |
| --- | --- |
| `overview/` | 首页总览：综合总览、运行态势、线路态势、设备态势和告警入口 |
| `monitoring/` | 实时监测：线路监测、设备监测、行波监测，以及尚未接入业务的占位页 |
| `fault-map/` | 故障地图：故障分布、线路拓扑、地图图层及尚未接入业务的占位页 |
| `analysis/` | 智能解析模块；当前页面主要为后续业务预留的占位页 |
| `warnings/` | 预警中心模块；当前页面主要为后续业务预留的占位页 |
| `reports/` | 统计报表模块；当前页面主要为后续业务预留的占位页 |
| `settings/` | 系统设置：线路管理、设备配置及其他预留管理页面 |

页面规模较大时采用如下结构：

```text
页面入口.vue
页面名/
├─ components/   页面专用组件
├─ types.ts      页面专用 TypeScript 类型
├─ data.ts       仍在使用的静态配置或数据转换定义
└─ 页面名.css    页面专用样式
```

如果某个页面已经改用真实后端数据，旧的模拟 `data.ts` 不应继续保留；只有从页面入口或其组件能够追踪到引用的文件才属于有效业务代码。
