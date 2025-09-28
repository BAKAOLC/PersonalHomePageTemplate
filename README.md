# 个人主页模板

一个基于 Vue 3 + TypeScript + Tailwind CSS 的现代化个人主页模板，专为展示艺术作品和项目而设计。

## ⚠️ 重要声明

**模板中的示例素材（图片、头像、个人信息等）仅供演示使用，具有版权保护。使用本模板时，您必须：**

1. **替换所有示例图片** - `public/assets/` 目录下的所有图片文件
2. **更换头像文件** - `public/assets/avatar.png`
3. **修改个人信息** - `src/config/personal.json` 中的所有信息
4. **更新角色配置** - `src/config/characters.json` 中的角色信息
5. **替换 FontAwesome Kit** - `index.html` 中的 FontAwesome 脚本链接

**未经授权使用示例素材可能涉及版权侵权，请务必使用您自己的内容。**

## 特性

- 🎨 **现代化设计** - 简洁美观的界面设计
- 🌓 **深色/浅色主题** - 支持主题切换
- 🌍 **多语言支持** - 中文、英文、日文
- 📱 **响应式布局** - 完美适配各种设备
- 🧭 **智能导航栏** - 响应式导航，支持功能开关和流畅动画
- 🖼️ **图片画廊** - 支持分类、标签、搜索和排序
- 📝 **文章系统** - 支持Markdown文章，分类管理，直接URL访问
- 🔗 **友链管理** - 支持分类友链，标签筛选
- 💬 **评论系统** - 集成 Giscus 评论，支持图片和文章评论
- ⚡ **高性能** - 基于 Vite 构建，支持缩略图和懒加载
- 🔧 **易于配置** - JSON 配置文件，无需编程知识
- 🎛️ **功能开关** - 可灵活启用/禁用各个功能模块

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/PersonalHomePageTemplate.git
cd PersonalHomePageTemplate
```

### 2. 安装依赖

```bash
npm install
```

### 3. 基本配置

> **⚠️ 重要提醒**：在开始配置前，请确保您已准备好自己的素材（图片、头像等）来替换模板中的示例内容。示例素材仅供演示，不得用于实际部署。

#### 配置网站信息和国际化

> **🌍 多语言支持说明**：
>
> 项目支持多语言配置，采用灵活的文本类型：
>
> - **字符串**：直接使用该文本，适用于所有语言
> - **对象**：包含语言代码键值对，如 `{"zh": "中文", "en": "English", "jp": "日本語"}`
> - **i18n引用**：使用 `$t:key` 格式引用翻译文件中的内容
>
> 系统会自动检测配置中包含的语言并启用相应的语言选项。默认支持中文（zh）、英文（en）、日文（jp），您也可以添加其他语言。

1. **配置应用基础信息**：
   编辑 `src/config/app.json`：

   ```json
   {
     "title": {
       "zh": "您的网站标题",
       "en": "Your Site Title", 
       "jp": "あなたのサイトタイトル"
     },
     "copyright": {
       "zh": "© 2025 您的名称. 保留所有权利。",
       "en": "© 2025 Your Name. All rights reserved.",
       "jp": "© 2025 あなたの名前. 全著作権所有。"
     }
   }
   ```

   > **💡 重要说明**：
   >
   > - **应用标题和版权**：这些信息从多语言文件中独立出来，避免意外修改
   > - **动态切换**：会根据用户选择的语言自动更新
   > - **浏览器标题**：页面标题会根据语言自动更新
   >
2. **配置网站 HTML 信息**：
   编辑 `src/config/html.json`：

   ```json
   {
     "title": "您的网站标题",
     "description": "您的网站描述",
     "keywords": "关键词1,关键词2,关键词3",
     "author": "您的名称",
     "url": "https://yoursite.com/",
     "image": "/assets/avatar.png",
     "themeColor": {
       "light": "#ffffff",
       "dark": "#1e293b"
     },
     "favicon": "/favicon.ico",
     "appleTouchIcon": "/assets/avatar.png"
   }
   ```

   > **💡 自动化处理**：构建时会自动将这些配置应用到 `index.html` 和 `404.html`，无需手动编辑 HTML 文件！
   >
3. **替换 FontAwesome Kit**：
   在 `index.html` 中找到并替换：

   ```html
   <!-- 将这行替换为您自己的 FontAwesome Kit -->
   <script src="https://kit.fontawesome.com/a52744a7a3.js" crossorigin="anonymous"></script>
   ```

   请访问 [FontAwesome](https://fontawesome.com/) 获取您自己的 Kit
4. **配置应用内多语言内容 (i18n)**：
   项目默认支持中文、英文、日文三种语言。多语言文件主要包含界面文字：

   **编辑 `src/i18n/zh.json`（中文）**：

   ```json
   {
     "app": {
       "loading": "加载中...",
       "error": "出错了！",
       "notFound": "页面不存在"
     },
     "nav": {
       "home": "首页",
       "gallery": "画廊",
       "articles": "文章",
       "links": "友链"
     }
   }
   ```

   **添加其他语言**：
   如需添加其他语言（如韩文），只需在 `src/i18n/` 目录下创建对应的语言文件（如 `ko.json`），并在所有多语言配置中添加 `"ko": "韩文内容"` 即可。

   > **💡 配置分离**：
   >
   > - **应用基础信息**：标题和版权在 `src/config/app.json` 中配置
   > - **HTML meta 标签**：通过 `src/config/html.json` 统一配置，构建时自动应用
   > - **界面文字**：导航、按钮、提示等文字在 `src/i18n/` 中配置
   > - **SEO 优化**：HTML meta 标签在构建时生成，确保搜索引擎能正确索引
   >

#### 配置个人信息

编辑 `src/config/personal.json`：

```json
{
  "name": {
    "en": "Your Name",
    "zh": "你的名字", 
    "jp": "あなたの名前"
  },
  "description": [
    {
      "en": "Your description",
      "zh": "你的描述",
      "jp": "あなたの説明"
    }
  ],
  "links": [
    {
      "name": {"en": "GitHub", "zh": "GitHub", "jp": "GitHub"},
      "url": "https://github.com/yourusername",
      "icon": "github",
      "color": "#333"
    }
  ]
}
```

#### 配置角色信息

编辑 `src/config/characters.json`：

```json
[
  {
    "id": "your-character-id",
    "name": {
      "en": "Character Name",
      "zh": "角色名称",
      "jp": "キャラクター名"
    },
    "description": {
      "en": "Character description",
      "zh": "角色描述", 
      "jp": "キャラクターの説明"
    },
    "color": "#667eea"
  }
]
```

#### 配置评论系统 (Giscus)

**第一步：准备 GitHub 仓库**

1. 确保您的 GitHub 仓库是公开的
2. 在仓库设置中启用 Discussions 功能：
   - 进入仓库 → Settings → General
   - 向下滚动到 "Features" 部分
   - 勾选 "Discussions"

**第二步：安装 Giscus 应用**

1. 访问 [Giscus 应用页面](https://github.com/apps/giscus)
2. 点击 "Install" 安装到您的 GitHub 账户
3. 选择要安装的仓库（可以选择所有仓库或特定仓库）

**第三步：获取配置并设置**

1. 访问 [Giscus 配置页面](https://giscus.app/zh-CN)
2. 填写您的仓库信息：`用户名/仓库名`
3. 选择页面 ↔️ discussion 映射关系：选择 "特定的 discussion"
4. 选择 Discussion 分类（推荐创建专门的 "评论" 分类）
5. 从生成的配置中获取 `repo`、`repoId`、`category`、`categoryId` 这4个值
6. 编辑 `src/config/giscus.json`：

```json
{
  "repo": "yourusername/your-repo",
  "repoId": "R_kgDOxxxxxxx", 
  "category": "评论",
  "categoryId": "DIC_kwDOxxxxxxx",
  "mapping": "specific",
  "strict": "1",
  "reactionsEnabled": "1",
  "emitMetadata": "0",
  "inputPosition": "top",
  "loading": "lazy"
}
```

**📝 主要配置项**：

- `repo`: 您的 GitHub 仓库 (格式: 用户名/仓库名)
- `repoId`: 仓库 ID (从 Giscus 配置页面获取)
- `category`: Discussion 分类名称
- `categoryId`: 分类 ID (从 Giscus 配置页面获取)

> **⚠️ 重要**：映射关系必须选择 "特定的 discussion"，其他映射方式会导致评论功能无法正常工作。

> **💡 提示**：其他配置项可以根据您的个人喜好进行调整。

#### 配置功能开关

编辑 `src/config/features.json` 来控制各个功能的启用状态：

```json
{
  "gallery": true,
  "articles": true,
  "links": true,
  "comments": true
}
```

**配置说明：**

- `gallery`: 控制画廊功能是否启用
  - `true`: 启用画廊页面，导航栏显示画廊链接
  - `false`: 禁用画廊功能，隐藏导航链接，访问画廊页面时自动跳转到首页
- `articles`: 控制文章功能是否启用
  - `true`: 启用文章页面，导航栏显示文章链接
  - `false`: 禁用文章功能，隐藏导航链接，访问文章页面时自动跳转到首页
- `links`: 控制友链功能是否启用
  - `true`: 启用友链页面，导航栏显示友链链接
  - `false`: 禁用友链功能，隐藏导航链接，访问友链页面时自动跳转到首页
- `comments`: 控制评论功能是否启用
  - `true`: 在图片查看器和文章详情页面显示评论组件
  - `false`: 隐藏所有评论相关的UI组件

**导航栏行为：**

- 导航栏会根据启用的功能自动显示相应的导航链接
- 当只有首页可访问时（所有功能都禁用），导航栏会自动隐藏
- 支持响应式设计，在移动端（< 768px）显示下拉菜单，桌面端显示水平导航栏
- 包含流畅的切换动画效果

#### 配置友链

编辑 `src/config/links.json` 来配置友链页面内容：

```json
{
  "tags": {
    "tech": {
      "zh": "技术",
      "en": "Tech", 
      "jp": "技術"
    },
    "blog": {
      "zh": "博客",
      "en": "Blog",
      "jp": "ブログ"
    }
  },
  "categories": [
    {
      "id": "friends",
      "name": {
        "zh": "好友",
        "en": "Friends",
        "jp": "友達"
      },
      "description": {
        "zh": "我的好朋友们",
        "en": "My good friends",
        "jp": "私の親友たち"
      },
      "links": [
        {
          "id": "friend-1",
          "name": "朋友的网站",
          "url": "https://friend-website.com",
          "avatar": "/assets/friend-avatar.png",
          "description": {
            "zh": "朋友网站的描述",
            "en": "Description of friend's website",
            "jp": "友達のウェブサイトの説明"
          },
          "tags": ["tech", "blog"]
        }
      ]
    }
  ]
}
```

**配置说明：**

**标签配置 (`tags`)：**

- 定义友链的标签系统，支持多语言
- 每个标签包含中文、英文、日文三种语言的名称
- 标签可用于分类和筛选友链

**分类配置 (`categories`)：**

- `id`: 分类的唯一标识符
- `name`: 分类名称（多语言）
- `description`: 分类描述（多语言）
- `links`: 该分类下的友链列表

**友链配置 (`links`)：**

- `id`: 友链的唯一标识符
- `name`: 友链名称（显示名称）
- `url`: 友链地址
- `avatar`: 友链头像图片路径（可选）
- `description`: 友链描述（多语言）
- `tags`: 友链标签数组（引用 tags 中定义的标签ID）

**使用建议：**

1. **替换示例内容**：删除所有示例友链，添加您真实的朋友链接
2. **准备头像图片**：将友链头像放置在 `public/assets/` 目录下
3. **自定义标签**：根据需要添加或修改标签类型
4. **分类组织**：可以创建多个分类来组织不同类型的友链

#### 配置文章系统

文章系统支持Markdown格式的文章，具有分类管理、搜索、排序等功能。

**第一步：配置文章分类**
编辑 `src/config/articles-categories.json`：

```json
{
  "tech": {
    "name": {
      "zh": "技术",
      "en": "Technology",
      "jp": "技術"
    },
    "color": "#3b82f6"
  },
  "life": {
    "name": {
      "zh": "生活",
      "en": "Life",
      "jp": "生活"
    },
    "color": "#10b981"
  }
}
```

**第二步：配置文章页面**
编辑 `src/config/articles-page.json`：

```json
{
  "infoCards": [
    {
      "id": "welcome",
      "title": {
        "zh": "欢迎",
        "en": "Welcome",
        "jp": "ようこそ"
      },
      "image": "/assets/welcome-card.png"
    }
  ]
}
```

**第三步：添加文章内容**
在 `src/config/articles/` 目录下创建文章配置文件：

```json
{
  "id": "my-first-article",
  "title": {
    "zh": "我的第一篇文章",
    "en": "My First Article",
    "jp": "私の最初の記事"
  },
  "content": {
    "zh": "# 标题\n\n这是文章内容...",
    "en": "# Title\n\nThis is article content...",
    "jp": "# タイトル\n\nこれは記事の内容です..."
  },
  "cover": {
    "zh": "/assets/article-cover-zh.png",
    "en": "/assets/article-cover-en.png",
    "jp": "/assets/article-cover-jp.png"
  },
  "categories": ["tech"],
  "date": "2025-01-01",
  "allowComments": true
}
```

**第四步：构建文章配置**
运行以下命令来合并所有文章配置：

```bash
npm run articles-config:build
```

**文章功能特性：**

- ✅ **Markdown支持**：完整的Markdown语法支持，包括代码高亮
- ✅ **多语言内容**：每篇文章可以有不同语言的版本
- ✅ **分类管理**：支持文章分类，可筛选和统计
- ✅ **直接访问**：支持通过URL直接访问文章（如：`#/articles/article-id`）
- ✅ **复制链接**：文章详情页面可以复制分享链接
- ✅ **评论系统**：每篇文章都有独立的评论区
- ✅ **搜索排序**：支持标题搜索、日期排序、标题排序
- ✅ **响应式设计**：完美适配桌面端和移动端

**配置说明：**

- `id`: 文章的唯一标识符，用于URL访问
- `title`: 文章标题（多语言）
- `content`: 文章内容，支持Markdown格式（多语言）
- `cover`: 文章封面图片（可选，支持多语言）
- `categories`: 文章分类数组，引用categories配置中的ID
- `date`: 发布日期（YYYY-MM-DD格式）
- `allowComments`: 是否允许评论（默认true）

### 4. 添加角色设定内容

在 `src/config/character-profiles/` 目录下创建角色配置文件：

```json
{
  "id": "my-character",
  "name": {
    "zh": "我的角色",
    "en": "My Character",
    "jp": "私のキャラクター"
  },
  "color": "#667eea",
  "variants": [
    {
      "id": "default",
      "name": {
        "zh": "默认",
        "en": "Default",
        "jp": "デフォルト"
      },
      "images": [
        {
          "id": "main-image",
          "src": "/assets/category/my-character/main.png",
          "alt": {
            "zh": "主图",
            "en": "Main image",
            "jp": "メイン画像"
          }
        }
      ],
      "infoCards": [
        {
          "id": "basic-info",
          "title": {
            "zh": "基本信息",
            "en": "Basic Information",
            "jp": "基本情報"
          },
          "content": {
            "zh": "角色的基本信息描述...",
            "en": "Basic information about the character...",
            "jp": "キャラクターの基本情報..."
          },
          "color": "#667eea"
        }
      ]
    }
  ]
}
```

**角色设定功能特性：**

- ✅ **多语言支持**：角色名称、差分名称、图片描述、信息卡片都支持多语言
- ✅ **多差分支持**：每个角色可以有多个不同的差分（服装、状态等）
- ✅ **信息卡片**：每个差分可以包含多个信息卡片，展示角色的详细信息
- ✅ **图片管理**：每个差分可以包含多张图片，支持主图展示和缩略图浏览
- ✅ **颜色主题**：每个角色和差分都可以设置独特的颜色主题
- ✅ **组合式配置**：支持将角色配置拆分成多个文件，便于管理

**配置说明：**

- `id`: 角色的唯一标识符
- `name`: 角色名称（多语言）
- `color`: 角色的主题颜色（可选）
- `variants`: 角色差分数组
  - `id`: 差分的唯一标识符
  - `name`: 差分名称（多语言）
  - `images`: 图片数组（可选）
  - `infoCards`: 信息卡片数组（可选）

**第四步：构建角色配置**
运行以下命令来合并所有角色配置：

```bash
npm run character-profiles-config:build
```

> **📝 重要提示**：
>
> - `src/config/character-profiles.json` 是自动生成的文件，**不要手动编辑**
> - 所有角色配置都应该在 `src/config/character-profiles/` 目录下的单独文件中进行
> - 开发模式下会自动监听文件变化并重新生成配置

### 5. 添加图片内容

1. 将图片放置在 `public/assets/category/` 目录下
2. 在 `src/config/images/` 目录下创建对应的JSON配置文件
3. 运行脚本生成缩略图：

```bash
npm run generate-thumbnails
```

### 6. 启动开发服务器

```bash
npm run dev
```

> **💡 开发模式特性**：
>
> 开发服务器启动后，Vite插件会自动处理以下操作：
>
> - 监听配置文件变化并自动合并
> - 自动生成图片缩略图
> - 实时应用HTML配置更改
> - 热重载支持，修改代码后自动刷新页面
>
> 因此，在开发过程中您只需要专注于内容编辑，大部分配置处理都是自动的。

### 6. 构建生产版本

```bash
npm run build
```

## 目录结构

```
├── public/                 # 静态资源
│   ├── assets/            # 图片资源
│   │   ├── category/      # 分类图片
│   │   └── thumbnails/    # 缩略图（自动生成）
│   └── favicon.ico
├── src/
│   ├── components/        # Vue组件
│   ├── config/           # 配置文件
│   │   ├── app.json      # 应用基础配置 (重要：需要修改)
│   │   ├── html.json     # HTML meta 标签配置 (重要：需要修改)
│   │   ├── personal.json # 个人信息
│   │   ├── characters.json # 角色配置
│   │   ├── tags.json     # 标签配置
│   │   ├── features.json # 功能开关配置
│   │   ├── giscus.json   # 评论系统配置
│   │   ├── links.json    # 友链配置
│   │   ├── articles-categories.json # 文章分类配置
│   │   ├── articles-page.json # 文章页面配置
│   │   ├── articles.json # 文章配置（自动生成）
│   │   ├── images.json   # 图片配置（自动生成）
│   │   ├── articles/     # 文章配置文件夹
│   │   └── images/       # 图片配置文件夹
│   ├── i18n/             # 国际化文件 (界面文字翻译)
│   │   ├── zh.json       # 中文翻译
│   │   ├── en.json       # 英文翻译
│   │   └── jp.json       # 日文翻译
│   ├── utils/            # 工具函数
│   │   └── appConfig.ts  # 应用配置工具
│   ├── stores/           # 状态管理
│   └── views/            # 页面组件
└── scripts/              # 构建脚本
```

## 详细配置指南

### 图片配置

在 `src/config/images/` 目录下创建 JSON 文件：

```json
{
  "id": "unique-image-id",
  "name": {
    "en": "Image Title",
    "zh": "图片标题",
    "jp": "画像タイトル"
  },
  "description": {
    "en": "Image description",
    "zh": "图片描述",
    "jp": "画像の説明"
  },
  "artist": {
    "en": "Artist Name",
    "zh": "作者名称", 
    "jp": "アーティスト名"
  },
  "src": "/assets/category/character-name/category-name/image.png",
  "tags": ["tag1", "tag2"],
  "characters": ["character-id"],
  "date": "2024-01-01"
}
```

### 标签配置

编辑 `src/config/tags.json`：

```json
[
  {
    "id": "tag-id",
    "name": {
      "en": "Tag Name",
      "zh": "标签名称",
      "jp": "タグ名"
    },
    "color": "#3b82f6"
  }
]
```

### FontAwesome 配置

1. 访问 [FontAwesome](https://fontawesome.com/) 注册账户
2. 创建新的 Kit
3. 复制 Kit 的脚本链接
4. 在 `index.html` 中替换现有的 FontAwesome 脚本：
   ```html
   <script src="https://kit.fontawesome.com/YOUR-KIT-ID.js" crossorigin="anonymous"></script>
   ```

## 部署

### GitHub Pages

1. 在 `vite.config.ts` 中设置正确的 base URL
2. 运行构建命令：`npm run build`
3. 将 `dist` 目录内容部署到 GitHub Pages

### 其他平台

项目构建后会在 `dist` 目录生成静态文件，可以部署到任何静态网站托管平台。

## 开发脚本

### 🚀 基础开发命令

| 命令                | 说明                 | 使用场景       |
| ------------------- | -------------------- | -------------- |
| `npm run dev`       | 启动开发服务器       | 日常开发调试   |
| `npm run build`     | 构建生产版本         | 部署前构建     |
| `npm run ci-build`  | CI构建（跳过预构建） | 持续集成环境   |
| `npm run preview`   | 预览构建结果         | 构建后本地测试 |
| `npm run typecheck` | TypeScript类型检查   | 代码质量检查   |

### 🔧 代码质量

| 命令               | 说明               | 使用场景             |
| ------------------ | ------------------ | -------------------- |
| `npm run lint`     | 运行ESLint代码检查 | 检查代码规范         |
| `npm run lint:fix` | 自动修复代码问题   | 修复可自动解决的问题 |

### 📝 内容管理

#### 图片管理

| 命令                            | 说明           | 使用场景           |
| ------------------------------- | -------------- | ------------------ |
| `npm run generate-thumbnails`   | 生成图片缩略图 | 添加新图片后       |
| `npm run images-config:build`   | 构建图片配置   | 修改图片配置后     |
| `npm run images-config:split`   | 拆分图片配置   | 将大配置文件拆分   |
| `npm run images-config:merge`   | 合并图片配置   | 将多个配置文件合并 |
| `npm run images-config:cleanup` | 清理图片配置   | 清理无效配置       |

#### 文章管理

| 命令                              | 说明         | 使用场景           |
| --------------------------------- | ------------ | ------------------ |
| `npm run articles-config:build`   | 构建文章配置 | 修改文章配置后     |
| `npm run articles-config:split`   | 拆分文章配置 | 将大配置文件拆分   |
| `npm run articles-config:merge`   | 合并文章配置 | 将多个配置文件合并 |
| `npm run articles-config:cleanup` | 清理文章配置 | 清理无效配置       |

#### 角色设定管理

| 命令                                        | 说明         | 使用场景           |
| ------------------------------------------- | ------------ | ------------------ |
| `npm run character-profiles-config:build`   | 构建角色配置 | 修改角色配置后     |
| `npm run character-profiles-config:split`   | 拆分角色配置 | 将大配置文件拆分   |
| `npm run character-profiles-config:merge`   | 合并角色配置 | 将多个配置文件合并 |
| `npm run character-profiles-config:cleanup` | 清理角色配置 | 清理无效配置       |

### 🛠️ 维护工具

| 命令                      | 说明                                   | 使用场景         |
| ------------------------- | -------------------------------------- | ---------------- |
| `npm run prebuild`        | 预构建（自动运行配置构建和缩略图生成） | 构建前自动执行   |
| `npm run cleanup-backups` | 清理配置备份文件                       | 定期清理临时文件 |

### 💡 常用工作流

**日常开发：**

```bash
npm run dev
```

> **🚀 开发模式自动处理**：
>
> 在开发模式下（`npm run dev`），Vite插件会自动处理大部分配置合并和构建步骤：
>
> - **图片配置**：修改 `src/config/images/` 下的配置文件后会自动合并到 `images.json`
> - **文章配置**：修改 `src/config/articles/` 下的配置文件后会自动合并到 `articles.json`
> - **角色配置**：修改 `src/config/character-profiles/` 下的配置文件后会自动合并到 `character-profiles.json`
> - **HTML配置**：修改 `src/config/html.json` 后会自动应用到 `index.html` 和 `404.html`
> - **缩略图生成**：添加新图片后会自动生成缩略图
>
> 因此，在开发过程中通常只需要运行 `npm run dev` 即可，无需手动执行配置构建命令。

**添加新内容后：**

```bash
# 开发模式下会自动处理，无需手动执行
# 但生产构建前建议手动执行以确保配置正确

# 添加图片后（可选，开发模式已自动处理）
npm run generate-thumbnails
npm run images-config:build

# 添加文章后（可选，开发模式已自动处理）
npm run articles-config:build

# 添加角色设定后（可选，开发模式已自动处理）
npm run character-profiles-config:build
```

**部署前：**

```bash
npm run lint:fix
npm run typecheck
npm run build
npm run preview
```

**清理维护：**

```bash
npm run cleanup-backups
```

## 故障排除

### 图片不显示

- 检查图片路径是否正确
- 确认图片文件存在于 `public/assets/category/` 目录
- 运行 `npm run generate-thumbnails` 生成缩略图

### 配置不生效

- 检查JSON文件格式是否正确
- 运行 `npm run images-config:build` 重新构建配置

### FontAwesome 图标不显示

- 确认已替换为您自己的 FontAwesome Kit
- 检查网络连接是否正常
- 确认 Kit 状态为激活

### Giscus 评论不显示

- 确认 GitHub 仓库是公开的
- 检查是否已启用 Discussions 功能
- 确认 Giscus 应用已正确安装到仓库
- 验证 `repoId` 和 `categoryId` 是否正确
- 检查仓库名格式是否为 `用户名/仓库名`
- 确认网站域名已添加到 Giscus 应用的授权列表中

### Giscus 评论加载缓慢

- 检查网络连接
- 考虑将 `loading` 设置为 "eager" 以提前加载
- 确认 GitHub 服务状态正常

### 文章系统问题

- **文章不显示**：
  - 检查 `src/config/features.json` 中 `articles` 是否为 `true`
  - 运行 `npm run articles-config:build` 重新构建文章配置
  - 确认文章JSON格式正确，包含必需字段（id, title, content, date）
- **文章链接无法访问**：
  - 确认文章ID在配置中存在
  - 检查路由是否正确配置
  - 清除浏览器缓存重试
- **Markdown渲染异常**：
  - 检查文章内容中的Markdown语法
  - 确认代码块的语言标识符正确
  - 避免在JSON中使用未转义的特殊字符
- **文章评论不显示**：
  - 确认文章配置中 `allowComments` 为 `true`
  - 检查 Giscus 配置是否正确
  - 确认评论功能已启用（`features.json` 中 `comments: true`）

### 多语言切换问题

- **浏览器标题不更新**：检查 `src/config/app.json` 中的 `title` 配置
- **版权信息不切换**：检查 `src/config/app.json` 中的 `copyright` 配置
- **语言切换后页面内容混乱**：确保所有语言文件的 JSON 结构保持一致
- **控制台报错**：检查 JSON 文件格式是否正确，是否有语法错误
- **SEO 问题**：搜索引擎只能看到 `index.html` 中的静态 meta 标签，动态内容对 SEO 无效
- **新语言不显示**：确保在 `src/i18n/` 目录下创建了对应的语言文件（如 `ko.json`）
- **多语言配置不生效**：检查配置文件中是否包含正确的语言键值对，系统会自动检测配置中包含的语言

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **样式框架**: Tailwind CSS
- **状态管理**: Pinia
- **路由**: Vue Router (Hash模式)
- **国际化**: Vue I18n
- **Markdown**: Marked + Highlight.js
- **评论系统**: Giscus
- **图标**: FontAwesome
- **图片处理**: Sharp (缩略图生成)

### 🔌 Vite插件

项目包含多个自定义Vite插件，提供开发时的自动处理功能：

- **articles-config-plugin**: 自动合并文章配置文件
- **images-config-plugin**: 自动合并图片配置文件
- **html-config-plugin**: 自动应用HTML配置到模板文件
- **thumbnail-plugin**: 自动生成图片缩略图
- **utf8-encoding-plugin**: 确保文件编码正确

这些插件在开发模式下会自动监听配置文件变化并实时处理，简化开发流程。

## 版权声明

### 代码许可证

本项目的代码部分采用 MIT License 许可证。

### 示例素材版权

**重要**：模板中包含的示例素材（包括但不限于）：

- 示例图片 (`public/assets/category/` 目录下的图片)
- 头像文件 (`public/assets/avatar.png`)
- 角色设计和相关艺术作品

**版权信息：**

- 角色设计：律影映幻 (Ritsukage Utsumabo) © OLC (BAKAOLC)
- 艺术作品：月兔弥生 (Yuetuo Yayoi) 及其他原始作者
- 版权所有 © 2025 OLC. All Rights Reserved.

**这些素材均为原作者所有，享有完整的版权保护，仅供模板演示使用。**

### 使用条款

- ✅ **允许**：使用、修改、分发本项目的代码
- ❌ **禁止**：在您的项目中使用示例素材
- ✅ **必须**：将所有示例素材替换为您自己的内容

### 免责声明

使用者有责任确保替换所有示例素材。未经授权使用示例素材造成的任何法律后果，由使用者自行承担。

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**注意**: 这是一个模板项目，请根据您的需求修改配置文件和内容。
