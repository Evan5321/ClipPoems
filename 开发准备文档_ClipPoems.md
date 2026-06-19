# 剪贴诗应用 — 开发准备文档

## 1. 技术选型详解

### 1.1 前端核心

```
✅ React 18 + TypeScript
     原因：组件化、生态成熟、类型安全
     替代方案：Vue 3（社区略小，但也可行）

✅ Next.js 14 (App Router)
     原因：SSR/SSG/ISR 灵活部署、API Routes 内置后端、
           文件路由、Server Components 减少客户端 JS
     替代方案：Vite + React Router（更轻量，但需要额外配后端）

✅ dnd-kit
     原因：专为 React 设计的拖拽库，支持自由定位 (DndContext +
           useDraggable + useDroppable)，无障碍支持好
     替代方案：react-beautiful-dnd（维护模式）、interactjs（更底层）

✅ Framer Motion
     原因：React 动画标准库，spring 物理动画，Layout animations
     替代方案：GSAP（更强大但非 React 原生）、CSS transitions

✅ Zustand
     原因：极简状态管理，无 boilerplate，支持 middleware (persist/immer)
     替代方案：Jotai（原子化）、Redux Toolkit（重型）

✅ Tailwind CSS + shadcn/ui
     原因：原子化 CSS 快速迭代，主题系统完善，组件基础开箱即用
```

### 1.2 画布实现方案

这是本应用的核心技术决策，有三种方案：

| 方案 | 优势 | 劣势 | 推荐场景 |
|------|------|------|---------|
| **A. DOM 元素** | 实现简单、SEO 友好、文本可选 | 大量碎片时性能下降 | MVP 阶段推荐 |
| **B. HTML5 Canvas** | 性能好、像素级控制、导出方便 | 文本渲染复杂、交互需自实现 | 最终选择 |
| **C. SVG** | 矢量缩放、DOM 事件绑定 | 复杂滤镜性能差 | 导出格式 |

**推荐路径：** M1 用 DOM 方案快速迭代 → M2 迁移到 Canvas 方案

DOM 方案技术点：
- 碎片用绝对定位 `div`，`transform: translate(x, y) rotate(z)`
- 撕裂边缘用 `clip-path: polygon(...)` 生成不规则形状
- 阴影用 `box-shadow` + `filter: drop-shadow()`

Canvas 方案技术点（M2 迁移）：
- 使用 `react-konva`（React 绑定的 Konva.js Canvas 库）
- 每个碎片是 Konva.Group (Image + Text)，支持 Transformer 控件
- 层级管理通过 `zIndex` 排序渲染顺序

```
Canvas 方案对比：
DOM + clip-path 方案
  ├ 开发速度：⭐⭐⭐⭐⭐
  ├ 碎片性能：⭐⭐ (30+ 碎片开始卡)
  ├ 导出质量：⭐⭐⭐⭐ (html2canvas)
  └ 推荐阶段：M1 MVP

react-konva (Canvas) 方案
  ├ 开发速度：⭐⭐⭐ (需要适配)
  ├ 碎片性能：⭐⭐⭐⭐⭐ (100+ 碎片流畅)
  ├ 导出质量：⭐⭐⭐⭐⭐ (原生 Canvas toBlob)
  └ 推荐阶段：M2 正式版
```

### 1.3 语料服务

```
Python FastAPI
  ├ 分词：jieba (精确模式 + 自定义词典)
  ├ 关键词提取：jieba.analyse / TF-IDF
  ├ 爬虫 (未来)：httpx + BeautifulSoup4 / Scrapy
  ├ 语料清洗：正则 + 去重 + 质量打分
  └ API：RESTful + WebSocket (实时分词)

为什么 Python 而不是 Node？
  - 中文分词生态 Python 远强于 Node (jieba 的 Node 移植版功能不全)
  - 爬虫工具链成熟 (Scrapy、Playwright)
  - NLP 后续可扩展 (HanLP、Transformers 做语义匹配)
```

### 1.4 数据持久化

```
层级             技术                    用途
┌──────────┐  ┌──────────────┐
│ 持久存储   │  │ SQLite         │ 语料库元数据、用户作品数据
│           │  │ (better-sqlite3)│
├──────────┤  ├──────────────┤
│ 缓存/状态  │  │ IndexedDB      │ 浏览器端语料缓存、离线数据
│           │  │ (idb wrapper)  │
├──────────┤  ├──────────────┤
│ 会话状态   │  │ Zustand persist│ 当前编辑状态、UI 状态
│           │  │ (localStorage) │
├──────────┤  ├──────────────┤
│ 文件存储   │  │ 本地文件系统    │ 导出的图片/SVG/PDF
│           │  │ (Tauri fs API) │
└──────────┘  └──────────────┘
```

### 1.5 跨平台方案

```
Web (主平台)
  ├ 开发：Next.js
  ├ 部署：Vercel / Docker
  └ PWA：next-pwa 插件

Desktop (Tauri)
  ├ 主进程：Rust (Tauri v2)
  ├ WebView：系统 WebView (Edge WebView2 / WKWebView)
  ├ 优势：包体 <10MB、原生文件对话框、系统托盘、快捷键
  └ 注意：需要 Rust 编译环境

Mobile (PWA)
  ├ 离线支持：Service Worker
  ├ 安装到桌面：Web App Manifest
  └ 硬件 API：Haptic Feedback (touch 震动反馈)
```

---

## 2. 项目目录结构

```
collage-poem/
├── package.json                # 前端依赖
├── next.config.ts              # Next.js 配置
├── tailwind.config.ts          # Tailwind 主题配置
├── tsconfig.json
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页 (作品列表)
│   │   ├── editor/
│   │   │   └── [id]/page.tsx   # 拼贴编辑器
│   │   ├── corpus/
│   │   │   └── page.tsx        # 语料库管理
│   │   └── gallery/
│   │       └── page.tsx        # 社区画廊 (未来)
│   │
│   ├── components/
│   │   ├── editor/
│   │   │   ├── Canvas.tsx            # 画布容器
│   │   │   ├── CanvasFragment.tsx    # 单个纸片碎片
│   │   │   ├── FragmentTornEdge.tsx  # 撕裂边缘 SVG clipPath
│   │   │   ├── Toolbar.tsx           # 顶栏工具
│   │   │   ├── LayerPanel.tsx        # 图层管理
│   │   │   └── DeleteZone.tsx        # 拖拽删除区
│   │   │
│   │   ├── corpus/
│   │   │   ├── CorpusPanel.tsx        # 语料面板容器
│   │   │   ├── FragmentGrid.tsx       # 语料碎片网格
│   │   │   ├── CorpusSearch.tsx       # 语料搜索
│   │   │   ├── RecommendedWords.tsx   # 推荐分词模式
│   │   │   ├── WordSelector.tsx       # 自主选词模式
│   │   │   └── ArticleSelector.tsx    # 文章划词模式
│   │   │
│   │   ├── settings/
│   │   │   ├── BackgroundPicker.tsx   # 背景选择器
│   │   │   ├── FontSettings.tsx       # 字体设置
│   │   │   ├── CanvasSettings.tsx     # 画布设置
│   │   │   └── TextStylePanel.tsx     # 文字样式面板
│   │   │
│   │   ├── ui/                       # shadcn/ui 组件
│   │   │   └── ... (button, dialog, etc.)
│   │   │
│   │   └── shared/
│   │       ├── DragOverlay.tsx        # 拖拽覆盖层
│   │       └── ColorPicker.tsx        # 颜色选择器
│   │
│   ├── store/
│   │   ├── canvasStore.ts         # 画布状态 (Zustand)
│   │   ├── corpusStore.ts         # 语料库状态
│   │   └── uiStore.ts             # UI 状态 (面板展开等)
│   │
│   ├── lib/
│   │   ├── canvas/
│   │   │   ├── clipPaths.ts      # 撕裂边缘多边形生成算法
│   │   │   ├── export.ts         # 导出 (html2canvas / canvas API)
│   │   │   └── alignment.ts      # 对齐辅助线算法
│   │   │
│   │   ├── corpus/
│   │   │   ├── tokenizer.ts      # 调用分词 API
│   │   │   └── search.ts         # 语料搜索逻辑
│   │   │
│   │   └── utils/
│   │       ├── id.ts             # ID 生成器
│   │       └── storage.ts        # 本地存储封装
│   │
│   ├── hooks/
│   │   ├── useAutoSave.ts        # 自动保存 hook
│   │   ├── useDragFragment.ts    # 碎片拖拽逻辑 hook
│   │   └── useKeyboard.ts        # 快捷键绑定 hook
│   │
│   └── types/
│       ├── canvas.ts             # 画布类型定义
│       ├── corpus.ts             # 语料类型定义
│       └── export.ts             # 导出选项类型
│
├── corpus-service/               # Python 语料微服务
│   ├── pyproject.toml
│   ├── main.py                   # FastAPI 入口
│   ├── routers/
│   │   ├── tokenize.py           # 分词 API
│   │   ├── corpus.py             # 语料库 CRUD
│   │   └── crawl.py              # 爬虫 API (未来)
│   ├── services/
│   │   ├── tokenizer.py          # jieba 分词封装
│   │   └── cleaner.py            # 语料清洗
│   └── data/
│       ├── builtin_corpus/       # 内置语料 JSON 文件
│       ├── user_dict.txt         # 自定义词典
│       └── stopwords.txt         # 停用词表
│
├── corpus-data/                  # 语料数据源 (git LFS)
│   ├── classical_poetry.json     # 经典诗歌
│   ├── modern_literature.json    # 现代文学
│   ├── idioms.json               # 成语熟语
│   └── daily_corpus.json         # 日常语料
│
├── tauri/                        # Tauri 桌面壳
│   ├── Cargo.toml
│   ├── src/main.rs
│   ├── tauri.conf.json
│   └── icons/
│
└── public/
    ├── manifest.json             # PWA manifest
    ├── sw.js                     # Service Worker
    ├── textures/                 # 背景纹理图片
    └── fonts/                    # 内置字体文件
```

---

## 3. 关键算法说明

### 3.1 撕裂边缘生成算法

```typescript
// 输入：矩形宽高 + 不规则度参数
// 输出：clip-path polygon 点集
// 算法：在每条边上采样 N 个点，每个点在法线方向随机偏移

function generateTornEdge(
  width: number, height: number,
  roughness: number = 0.15  // 0~1, 值越大边缘越不规则
): string {
  const points: [number, number][] = [];
  const segments = 6; // 每条边分段数

  // 上边缘 (从左到右)
  for (let i = 0; i <= segments; i++) {
    const x = (width * i) / segments;
    const y = randomOffset(roughness * height);
    points.push([x, y]);
  }
  // 右边缘 (从上到下) ...
  // 下边缘 (从右到左) ...
  // 左边缘 (从下到上) ...
  // 注意：最后一点要回到起点形成闭合

  return points.map(p => `${p[0]}px ${p[1]}px`).join(',');
}
```

### 3.2 画布碰撞检测（对齐辅助线）

当碎片 A 的边界与碎片 B 的边界距离 < threshold（默认 5px）时，显示对齐参考线。检测维度：
- 垂直对齐：左边界 / 水平中线 / 右边界
- 水平对齐：上边界 / 垂直中线 / 下边界

### 3.3 语料推荐算法 (M1 简化版)

```
1. 用户选择主题 → 按主题标签筛选语料
2. 随机抽取 N 条 → 按词性分组展示
3. 用户点击更多 → 基于已选词的同主题扩展

未来可改进为：
  - 基于 word2vec 的语义相似度推荐
  - 基于押韵的词尾匹配推荐
```

---

## 4. 开发环境搭建

### 4.1 前置要求

```bash
# 必需
Node.js >= 18
pnpm >= 8        # 包管理器 (比 npm/yarn 快)
Python >= 3.11   # 语料微服务
Git

# 桌面端 (M4 需要)
Rust >= 1.75     # Tauri 编译
cargo
# Windows: WebView2 (Win10+ 自带)
# macOS: Xcode Command Line Tools
# Linux: webkit2gtk-4.1
```

### 4.2 初始化步骤

```bash
# 1. 创建 Next.js 项目
pnpm create next-app collage-poem --typescript --tailwind --eslint

# 2. 安装核心依赖
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add framer-motion
pnpm add zustand
pnpm add react-icons

# 3. 安装 UI 组件
pnpm add class-variance-authority clsx tailwind-merge
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add @radix-ui/react-slider @radix-ui/react-tabs
pnpm add lucide-react

# 4. 安装 shadcn/ui (初始化)
pnpm dlx shadcn-ui@latest init

# 5. 数据库
pnpm add prisma @prisma/client better-sqlite3
pnpm add -D @types/better-sqlite3

# 6. Python 语料服务
cd corpus-service
pip install fastapi uvicorn jieba httpx beautifulsoup4
```

### 4.3 开发命令

```json
{
  "scripts": {
    "dev": "next dev",                        // 前端开发 (localhost:3000)
    "corpus": "cd corpus-service && uvicorn main:app --reload --port 8000",
    "dev:all": "concurrently \"pnpm dev\" \"pnpm corpus\"",
    "tauri:dev": "tauri dev",                 // 桌面端开发
    "build": "next build",
    "tauri:build": "tauri build"              // 打包桌面应用
  }
}
```

---

## 5. 语料数据准备

### 5.1 数据格式 (JSON)

```json
{
  "id": "classical-001",
  "title": "静夜思",
  "author": "李白",
  "dynasty": "唐",
  "source": "全唐诗",
  "type": "classical_poetry",
  "content": "床前明月光，疑是地上霜。举头望明月，低头思故乡。",
  "segments": [
    { "text": "床前", "pos": "location", "length": 2 },
    { "text": "明月光", "pos": "noun", "length": 3 },
    { "text": "疑是", "pos": "verb", "length": 2 },
    { "text": "地上霜", "pos": "noun", "length": 3 },
    { "text": "举头", "pos": "verb", "length": 2 },
    { "text": "望", "pos": "verb", "length": 1 },
    { "text": "明月", "pos": "noun", "length": 2 },
    { "text": "低头", "pos": "verb", "length": 2 },
    { "text": "思", "pos": "verb", "length": 1 },
    { "text": "故乡", "pos": "noun", "length": 2 }
  ],
  "tags": ["思乡", "月亮", "夜晚", "唐代"],
  "difficulty": 1
}
```

### 5.2 语料来源

| 来源 | 数量目标 | 版权说明 |
|------|---------|---------|
| 古诗词（公版） | 500+ 首 | 已进入公共领域 |
| 现代诗（公版/授权） | 200+ 首 | 需要确认版权 |
| 成语词典（公版） | 3000+ 条 | 已进入公共领域 |
| 自建日常语料 | 2000+ 条 | 自有版权 |
| AI 辅助生成 | 酌情 | 需标注 AI 生成 |

> **法律提示：** 内置语料必须确保不侵犯第三方版权。古诗词、成语等公版内容无风险。现当代作品需要确认版权状态，或仅提供片段式引用（合理使用抗辩）。

---

## 6. 关键依赖清单

### 6.1 前端 (package.json)

| 包名 | 用途 | 版本建议 |
|------|------|---------|
| next | 框架 | ^14.2 |
| react / react-dom | UI 库 | ^18.3 |
| @dnd-kit/core | 拖拽引擎 | ^6.1 |
| @dnd-kit/utilities | 拖拽工具 | ^6.1 |
| framer-motion | 动画 | ^11.x |
| zustand | 状态管理 | ^4.5 |
| react-konva | Canvas 渲染 (M2) | ^18.2 |
| html2canvas | DOM 导出 (M1) | ^1.4 |
| jszip | 批量导出 | ^3.10 |
| file-saver | 文件保存 | ^2.0 |
| prisma | ORM | ^5.x |
| tailwindcss | 样式 | ^3.4 |

### 6.2 Python 后端 (pyproject.toml)

| 包名 | 用途 |
|------|------|
| fastapi | API 框架 |
| uvicorn | ASGI 服务器 |
| jieba | 中文分词 |
| httpx | HTTP 客户端 (爬虫) |
| beautifulsoup4 | HTML 解析 |
| pydantic | 数据验证 |

---

## 7. 编码规范

### 7.1 命名规范
- TypeScript: camelCase (变量/函数), PascalCase (组件/类型), kebab-case (文件名)
- Python: snake_case
- CSS: kebab-case (Tailwind 优先)
- Git: feat/fix/chore 前缀 + 中文/英文描述

### 7.2 组件规范
- 每个组件一个文件夹：`ComponentName/index.tsx` + `ComponentName/type.ts`
- Server Component 默认，需要交互的加 `"use client"`
- 大型组件拆分为子组件

### 7.3 状态管理原则
- 服务器状态 → React Query / fetch in Server Component
- 客户端 UI 状态 → Zustand (画布碎片、面板状态)
- 表单状态 → React Hook Form (未来设置页面)
- URL 状态 → useSearchParams (语料搜索参数)
