# ClipPoems

---
  📋 项目概览

  ClipPoems 是一个拼贴诗歌创作工具，允许用户从中文语料库中选取文字片段，在画布上
  自由拼贴成诗。它是一个全栈 monorepo 项目，包含三层架构：

  ---
  🏗️ 项目结构

  ClipPoems/
  ├── src/                          # Next.js 前端 (React 18 + TypeScript)
  │   ├── app/                      # Next.js App Router 页面
  │   │   ├── page.tsx              # 首页（目前是占位页）
  │   │   ├── layout.tsx            # 根布局
  │   │   ├── globals.css           # 全局样式 (Tailwind CSS)
  │   │   ├── editor/[id]/          # 拼贴编辑器页面
  │   │   ├── corpus/               # 语料库浏览页
  │   │   └── gallery/              # 作品画廊页
  │   ├── components/               # React 组件
  │   │   ├── editor/               # 编辑器组件 (Canvas, CanvasFragment,
  Toolbar...)
  │   │   ├── corpus/               # 语料库组件 (CorpusPanel, CorpusSearch,
  WordSelector...)
  │   │   ├── settings/             # 设置面板 (BackgroundPicker,
  FontSettings...)
  │   │   └── shared/               # 通用组件 (ColorPicker, DragOverlay)
  │   ├── store/                    # Zustand 状态管理
  │   │   ├── canvasStore.ts        # 画布状态 (fragments, selection,
  background)
  │   │   ├── corpusStore.ts        # 语料库状态
  │   │   └── uiStore.ts            # UI 状态
  │   ├── hooks/                    # 自定义 Hooks (useAutoSave,
  useDragFragment, useKeyboard)
  │   ├── lib/                      # 工具函数
  │   │   ├── canvas/               # 画布逻辑 (alignment, clipPaths, export)
  │   │   ├── corpus/               # 语料库 API 调用 (search, tokenizer)
  │   │   └── utils/                # 通用工具 (id, storage)
  │   └── types/                    # TypeScript 类型
  ├── corpus-service/               # Python 语料微服务 (FastAPI)
  │   ├── main.py                   # FastAPI 入口 (路由 /health, /api/version)
  │   ├── routers/                  # 路由模块 (corpus.py, crawl.py,
  tokenize.py)
  │   ├── services/                 # 业务逻辑 (cleaner, tokenizer)
  │   └── pyproject.toml            # Python 依赖 (fastapi, jieba, httpx,
  beautifulsoup4)
  ├── corpus-data/                  # 语料数据文件 (JSON)
  │   ├── classical_poetry.json     # 古典诗词
  │   ├── modern_literature.json    # 现代文学
  │   ├── daily_corpus.json         # 日常语料
  │   └── idioms.json               # 成语
  ├── prisma/                       # 数据库 (SQLite)
  │   └── schema.prisma             # 模型: Canvas, CanvasFragment, Work
  ├── tauri/                        # Tauri 桌面壳 (Rust)
  │   ├── tauri.conf.json           # Tauri 配置 (窗口 1200x800)
  │   ├── Cargo.toml                # Rust 依赖
  │   └── src/main.rs               # Rust 入口
  ├── public/                       # 静态资源
  │   ├── manifest.json
  │   └── sw.js                     # Service Worker
  └── 配置文件
      ├── next.config.ts            # Next.js 配置
      ├── tailwind.config.ts        # Tailwind CSS 配置
      ├── tsconfig.json             # TypeScript 配置
      ├── components.json           # shadcn/ui 配置
      ├── postcss.config.js         # PostCSS 配置
      ├── pnpm-workspace.yaml       # pnpm 工作区配置
      └── .env                      # 环境变量

  关键依赖

  ┌──────────┬────────────────────────────────────────┐
  │   层级   │                 技术栈                 │
  ├──────────┼────────────────────────────────────────┤
  │ 前端框架 │ Next.js 14, React 18, TypeScript       │
  ├──────────┼────────────────────────────────────────┤
  │ 样式     │ Tailwind CSS, shadcn/ui, framer-motion │
  ├──────────┼────────────────────────────────────────┤
  │ 状态管理 │ Zustand                                │
  ├──────────┼────────────────────────────────────────┤
  │ 拖拽     │ @dnd-kit                               │
  ├──────────┼────────────────────────────────────────┤
  │ 中文 NLP │ jieba (Python 分词)                    │
  ├──────────┼────────────────────────────────────────┤
  │ 数据库   │ SQLite + Prisma ORM                    │
  ├──────────┼────────────────────────────────────────┤
  │ 桌面壳   │ Tauri (Rust)                           │
  ├──────────┼────────────────────────────────────────┤
  │ 画布导出 │ html2canvas                            │
  └──────────┴────────────────────────────────────────┘

  ---
  🚀 运行项目步骤

  1️⃣ 安装前端依赖

  pnpm install

  这会在 postinstall 钩子中自动执行 prisma generate 生成 Prisma 客户端。

  2️⃣ 初始化数据库

  pnpm db:push

  这会根据 prisma/schema.prisma 创建 SQLite 数据库文件 (prisma/dev.db)。

  3️⃣ 安装 Python 语料微服务

  cd corpus-service
  pip install -e .
  或: pip install fastapi uvicorn jieba httpx beautifulsoup4 pydantic
  cd ..

  需要 Python 3.11+。

  4️⃣ 运行项目（两种方式）

  方式 A — 仅运行 Web 端（适合调试前端）：

  pnpm dev
   → http://localhost:3000

  ▎ 语料功能会不可用（因为没有启动后端微服务）。

  方式 B — 同时运行前端 + 语料微服务（完整体验）：

  pnpm dev:all
  前端 → http://localhost:3000
  语料微服务 → http://localhost:8000

  5️⃣ (可选) 查看数据库

  pnpm db:studio
  → Prisma Studio 在浏览器中打开，可视化浏览 SQLite 数据

  6️⃣ (可选) Tauri 桌面应用

  需要安装 Rust 工具链 (https://www.rust-lang.org/tools/install)，然后：

  cd tauri
  cargo tauri dev
