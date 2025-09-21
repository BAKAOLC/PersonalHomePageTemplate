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
- 💬 **评论系统** - 集成 Giscus 评论
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
1. **配置网站 HTML 信息**：
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

2. **替换 FontAwesome Kit**：
   在 `index.html` 中找到并替换：
   ```html
   <!-- 将这行替换为您自己的 FontAwesome Kit -->
   <script src="https://kit.fontawesome.com/a52744a7a3.js" crossorigin="anonymous"></script>
   ```
   请访问 [FontAwesome](https://fontawesome.com/) 获取您自己的 Kit

3. **配置应用内多语言内容 (i18n)**：
   项目支持中文、英文、日文三种语言。您需要修改以下文件中的应用内容：
   
   **编辑 `src/i18n/zh.json`（中文）**：
   ```json
   {
     "app": {
       "title": "您的网站标题",
       "copyright": "© 2025 您的名称. 保留所有权利。"
     }
   }
   ```
   
   **编辑 `src/i18n/en.json`（英文）**：
   ```json
   {
     "app": {
       "title": "Your Site Title",
       "copyright": "© 2025 Your Name. All rights reserved."
     }
   }
   ```
   
   **编辑 `src/i18n/jp.json`（日文）**：
   ```json
   {
     "app": {
       "title": "あなたのサイトタイトル",
       "copyright": "© 2025 あなたの名前. 全著作権所有。"
     }
   }
   ```
   
   > **💡 提示**：
   > - **浏览器标题栏**：会根据语言切换自动更新，用户体验友好
   > - **HTML meta 标签**：通过 `src/config/html.json` 统一配置，构建时自动应用
   > - **应用内容**：所有界面文字都支持多语言切换
   > - **SEO 优化**：HTML meta 标签在构建时生成，确保搜索引擎能正确索引

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

**第三步：获取配置信息**
1. 访问 [Giscus 配置页面](https://giscus.app/zh-CN)
2. 填写您的仓库信息：`用户名/仓库名`
3. 选择页面 ↔️ discussion 映射关系：
   - **重要**：选择 "特定的 discussion"
   - **不要选择** "pathname" 或其他映射方式
   - **原因**：项目使用 hash 路由 (`/#/`)，pathname 映射无法正常工作
4. 选择 Discussion 分类（推荐创建专门的 "评论" 分类）
5. 复制生成的配置信息

**第四步：配置文件**
编辑 `src/config/giscus.json`：
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

**配置说明：**
- `repo`: 您的 GitHub 仓库 (格式: 用户名/仓库名)
- `repoId`: 仓库 ID (从 Giscus 配置页面获取)
- `category`: Discussion 分类名称
- `categoryId`: 分类 ID (从 Giscus 配置页面获取)
- `mapping`: 页面映射方式 (使用 "specific"，因为项目采用 hash 路由)
- `strict`: 严格匹配模式
- `reactionsEnabled`: 启用反应功能
- `inputPosition`: 输入框位置 ("top" 或 "bottom")

#### 配置功能开关

编辑 `src/config/features.json` 来控制各个功能的启用状态：

```json
{
  "gallery": true,
  "links": true,
  "comments": true
}
```

**配置说明：**
- `gallery`: 控制画廊功能是否启用
  - `true`: 启用画廊页面，导航栏显示画廊链接
  - `false`: 禁用画廊功能，隐藏导航链接，访问画廊页面时自动跳转到首页
- `links`: 控制友链功能是否启用
  - `true`: 启用友链页面，导航栏显示友链链接
  - `false`: 禁用友链功能，隐藏导航链接，访问友链页面时自动跳转到首页
- `comments`: 控制评论功能是否启用
  - `true`: 在图片查看器等页面显示评论组件
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
4. **多语言支持**：为每个友链提供多语言描述
5. **分类组织**：可以创建多个分类来组织不同类型的友链

### 4. 添加图片内容

1. 将图片放置在 `public/assets/category/` 目录下
2. 在 `src/config/images/` 目录下创建对应的JSON配置文件
3. 运行脚本生成缩略图：

```bash
npm run generate-thumbnails
```

### 5. 启动开发服务器

```bash
npm run dev
```

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
│   │   ├── html.json     # HTML meta 标签配置 (重要：需要修改)
│   │   ├── personal.json # 个人信息
│   │   ├── characters.json # 角色配置
│   │   ├── tags.json     # 标签配置
│   │   ├── features.json # 功能开关配置
│   │   ├── giscus.json   # 评论系统配置
│   │   └── images/       # 图片配置文件夹
│   ├── i18n/             # 国际化文件 (重要：需要修改)
│   │   ├── zh.json       # 中文翻译
│   │   ├── en.json       # 英文翻译
│   │   └── jp.json       # 日文翻译
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

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览构建结果
- `npm run generate-thumbnails` - 生成缩略图
- `npm run images-config:build` - 构建图片配置

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

### 多语言切换问题
- **浏览器标题不更新**：检查 `src/i18n/` 目录下对应语言文件中的 `app.title` 配置
- **版权信息不切换**：检查 `app.copyright` 字段是否存在于所有语言文件中
- **语言切换后页面内容混乱**：确保所有语言文件的 JSON 结构保持一致
- **控制台报错**：检查 JSON 文件格式是否正确，是否有语法错误
- **SEO 问题**：搜索引擎只能看到 `index.html` 中的静态 meta 标签，动态内容对 SEO 无效

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **样式框架**: Tailwind CSS
- **状态管理**: Pinia
- **国际化**: Vue I18n
- **评论系统**: Giscus
- **图标**: FontAwesome

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