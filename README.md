# ClipPoems · 剪贴诗

> 从中文语料库中拾取文字碎片，在画布上自由拼贴成诗。

ClipPoems 是一个拼贴诗歌创作工具。内置古典诗词、成语、现代文学等语料库，用户可以浏览、搜索、选取文字碎片，拖拽到画布上自由排列组合，调整样式与布局，最终导出为图片或文本。

## 功能特性

### 语料库系统

- **5 类内置语料**：古典诗词（李白、杜甫、苏轼、李清照等 117 首）、成语熟语（530 条）、现代文学、日常语料、推荐语料
- **三种浏览模式**：
  - 碎片网格 — 按分类浏览，支持作者/朝代/词性/字数筛选
  - 文章划词 — 阅读原文，鼠标划选任意片段添加
  - 推荐分词 — 输入文本，自动分词并按词性分组推荐
- **搜索**：关键词、作者、标签、字数范围多维度搜索，300ms 防抖
- **随机灵感**：🎲 随机抽取 10 个碎片（当前分类或全分类），Fisher-Yates 洗牌
- **碎片收藏**：选中碎片自动持久化（刷新不丢失），支持保存命名碎片组、加载/重命名/删除/清空

### 拼贴画布

- **拖拽创作**：从语料面板拖拽碎片到画布，画布内自由拖动定位
- **撕裂纸片效果**：自动生成不规则撕裂边缘 clip-path，模拟真实纸片
- **碎片编辑**：双击编辑文字，支持旋转（Shift 吸附 15°）、自由缩放宽高、层级调整（置顶/置底）
- **样式面板**：字体（7 种中文字体）、字号、颜色、字间距、行高、透明度、背景色、横竖排
- **画布设置**：6 种预设尺寸 + 自定义、纯色/渐变/纹理/图片背景、透明度、网格、缩放（50%–200% + 适配屏幕 + Ctrl 滚轮）
- **全局样式**：一键应用默认文字样式到所有碎片，新建碎片自动继承

### 保存与导出

- **自动保存**：每 30 秒自动保存到 localStorage，完整快照
- **手动保存**：保存到作品库、另存为副本
- **作品画廊**：网格视图、碎片预览缩略图、重命名、删除
- **导出**：PNG 高清图片（2x）、纯文本（按位置排序）
- **未保存保护**：脏状态追踪，离开编辑器弹出确认框，浏览器关闭/刷新触发原生未保存提示

### 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Delete` / `Backspace` | 删除选中碎片 |
| `Ctrl+A` | 全选碎片 |
| `Esc` | 取消选择 / 退出编辑 |
| `Ctrl+滚轮` | 缩放画布 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 (App Router) + React 18 + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui + framer-motion |
| 状态管理 | Zustand |
| 拖拽 | @dnd-kit |
| 画布导出 | html2canvas |
| 中文分词 | Python FastAPI + jieba（可选，前端有离线降级） |
| 数据持久化 | localStorage（作品库、草稿、碎片组） |
| 桌面端 | Tauri (Rust)（骨架已搭建） |

## 项目结构

```
ClipPoems/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # 首页
│   │   ├── editor/[id]/            # 拼贴编辑器
│   │   ├── corpus/                 # 语料库浏览页
│   │   └── gallery/                # 作品画廊
│   ├── components/
│   │   ├── canvas/                 # 画布组件 (Canvas, CanvasFragment, Toolbar, LayerPanel...)
│   │   ├── corpus/                 # 语料组件 (CorpusPanel, FragmentGrid, WordSelector...)
│   │   ├── settings/               # 设置面板 (CanvasSettings, FragmentStylePanel...)
│   │   ├── layout/                 # 布局 (TopNav)
│   │   └── shared/                 # 通用组件 (ResizeHandle, ColorPicker...)
│   ├── store/                      # Zustand 状态 (canvasStore, corpusStore, uiStore)
│   ├── hooks/                      # 自定义 Hooks (useAutoSave, useKeyboard, usePanelResize)
│   ├── lib/
│   │   ├── canvas/                 # 画布逻辑 (clipPaths, export, storage, alignment)
│   │   ├── corpus/                 # 语料逻辑 (loader, search, tokenizer, fragmentGroups)
│   │   └── utils/                  # 工具函数
│   └── types/                      # TypeScript 类型定义
├── corpus-data/                    # 内置语料 JSON 数据
├── corpus-service/                 # Python 分词微服务 (FastAPI + jieba)
├── prisma/                         # Prisma schema (SQLite)
├── tauri/                          # Tauri 桌面应用骨架
└── public/                         # 静态资源 (manifest, service worker)
```

## 快速开始

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm
- Python 3.11+（可选，仅完整分词功能需要）

### 安装与运行

```bash
# 1. 安装前端依赖
pnpm install

# 2a. 仅运行前端（语料基础功能可用，高级分词走离线降级）
pnpm dev
# → http://localhost:3000

# 2b. 同时运行前端 + Python 分词服务（完整功能）
cd corpus-service && pip install -e . && cd ..
pnpm dev:all
# → 前端 http://localhost:3000 | 分词服务 http://localhost:8000
```

### 可用脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm dev:all` | 同时启动前端 + Python 分词服务 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 运行生产版本 |
| `pnpm lint` | ESLint 代码检查 |
| `pnpm format` | Prettier 格式化 |
| `pnpm corpus` | 单独启动 Python 分词服务 |
| `pnpm db:push` | 初始化 SQLite 数据库 |
| `pnpm db:studio` | Prisma Studio 可视化数据库 |

## 部署

项目数据全部存储在浏览器 localStorage 中，无需后端数据库即可运行核心功能。

| 平台 | 说明 |
|------|------|
| **Vercel** | 推荐方案，零配置部署，Next.js 官方平台 |
| **Netlify** | 内置 Next.js 插件，免费版可用 |
| **Cloudflare Pages** | 免费 CDN，通过 `@cloudflare/next-on-pages` 适配 |
| **GitHub Pages** | 需 `output: 'export'` 静态导出，不支持 SSR |

如需完整的分词功能，可将 Python 分词服务单独部署到 Render / Railway / Fly.io 的免费容器，前端通过环境变量指向该 API 地址。

## 桌面应用

项目包含 Tauri 桌面端骨架，安装 Rust 工具链后可打包为桌面应用：

```bash
cd tauri
cargo tauri dev
```
