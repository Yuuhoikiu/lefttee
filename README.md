# 个人站建站台

一个跑在本地、面向个人站点的「建站 + 写作 + 发布」工具。第一次打开按向导填写站点信息，就会生成一套完整的个人网站（欢迎页、首页、博客、音乐、问答、关于），之后可以在图形界面里写作、加歌、改文案，确认后一键推送到 GitHub。

- 零依赖：只需要 Python 3 和 git
- 开箱即用：内置通用模板，不含任何个人内容与示例数据
- 本地优先：文章与配置都在自己的磁盘上，发布前可逐项确认
- 可托管：纯静态站点 + Cloudflare Functions，可部署到 Cloudflare Pages 或 GitHub Pages

---

## 目录

- [快速开始](#快速开始)
- [软件使用指南](#软件使用指南)
- [全页面信息定制化](#全页面信息定制化)
- [接口定义与配置](#接口定义与配置)
- [部署](#部署)
- [目录结构](#目录结构)
- [常见问题](#常见问题)

---

## 快速开始

环境要求：Python 3.9+、git（推送需要）。

```bash
git clone https://github.com/Yuuhoikiu/lefttee.git
cd lefttee
./start.sh
```

浏览器会自动打开 `http://127.0.0.1:8765/studio/`，首次使用会弹出建站向导。

| 字段 | 说明 |
| --- | --- |
| 目标目录 | 站点文件生成位置，默认 `lefttee/site/`，必须是空目录 |
| 站点名称 | 首页、导航、浏览器标题、欢迎页显示的站点名 |
| 副标题 | 导航栏小字，例如 `LIN / PERSONAL SITE` |
| 昵称 | 关于页署名 |
| 欢迎页副标题 | 欢迎页的一句话 |
| 一句话简介 | 首页介绍与关于页正文 |
| GitHub 主页 / 联系邮箱 | 页脚与关于页链接，可留空 |
| GitHub 仓库地址 | 可选。填写后会初始化 git、创建首个提交并配置远程 |

建站台会记住上次使用的站点目录，下次启动直接打开。也可以手动指定：

```bash
python3 studio.py --site /path/to/site
STUDIO_SITE=/path/to/site ./start.sh
PORT=9000 ./start.sh
```

生成的 `site/` 与问答令牌文件 `.studio-config.json` 都在 `.gitignore` 中，不会被提交到本仓库。

---

## 软件使用指南

### 界面

- 顶部导航：文章、歌曲、首页、站点、问答五个工作区
- 左侧文章列表：搜索、新建、打开文章
- 中间编辑区：标题 / 日期 / 分类 / 摘要 + Markdown 正文
- 右侧预览区：实时渲染文章
- 顶部状态条：当前分支、待发布改动、最近提交、发布按钮

常用快捷键：

| 快捷键 | 功能 |
| --- | --- |
| `⌘/Ctrl + S` | 保存当前文章 |
| `⌘/Ctrl + B` | 在正文中插入粗体标记 |
| `Esc` | 关闭除建站向导外的弹窗 |

### 写作流程

1. 点「新建文章」，填写标题、日期、分类、摘要
2. 在正文区写 Markdown；工具栏可插入标题、粗体、链接、图片、代码块
3. 图片可以直接拖入编辑区或粘贴，自动保存到 `blog/posts/<slug>/images/`
4. `⌘/Ctrl + S` 保存，后台自动重新生成 `blog/posts-data.js`
5. 点右上角「发布到仓库」，确认后执行 commit + push

文章目录名（slug）只能包含字母、数字、`-`、`_`；不填则根据标题和日期自动生成。

### 音乐管理

1. 上传 mp3（≤100MB），会自动读取 ID3 里的歌名、歌手和内嵌封面
2. 没有内嵌封面时，手动上传封面图片（≤20MB）
3. 确认歌名、歌手、歌曲 ID 后加入播放列表
4. 拖拽调整顺序，最后点「发布歌曲」

歌曲数据写入 `album/songs.js`。模板附带 `album/cover/default.svg` 作为无封面时的占位图。

### 首页编排

「首页」页可以：

- 启用 / 停用模块
- 修改每个模块的标题与文字
- 调整模块顺序
- 设置文章归档显示篇数、音乐展示数量、问答展示条数

保存后写入 `site-layout.js`，点「发布首页」上线。

### 站点设置

「站点」页可修改站点名称、副标题、导航文案、页脚链接、欢迎页文案、音乐页标题与描述，保存后写入 `site-config.js`。

同一页下方是「仓库与部署」：

- 查看当前站点目录与分支
- 填写或修改 GitHub 仓库地址（会初始化 git 并建立首个提交）
- 打开站点预览

### 问答管理

1. 站点部署到 Cloudflare Pages 后，在 Cloudflare 项目里配置 `COUNTERS` KV 与 `QA_ADMIN_TOKEN`
2. 回到建站台「问答」页，填写站点地址与管理令牌
3. 即可查看访客提问、发布回答、删除问题

令牌保存在项目根的 `.studio-config.json`（权限 600），按站点路径隔离，不会写进站点仓库。

### 发布

- 默认只提交 `blog/` 下的文章、图片和文章数据
- 勾选「全站推送」会带上站点设置、歌曲、首页编排等改动
- 首次推送自动执行 `git push -u origin HEAD`，之后使用普通 `git push`
- 推送后由连接仓库的托管平台自动部署

---

## 全页面信息定制化

### 页面与数据源总览

| 页面 | 文件 | 数据来源 | 可定制内容 |
| --- | --- | --- | --- |
| 欢迎页 | `welcome.html` | `SITE_CONFIG.welcome` + 内联样式 | 标题、副标题、背景渐变、进入交互 |
| 首页 | `index.html` | `SITE_CONFIG` + `SITE_LAYOUT` + 文章 / 歌曲 / 问答数据 | 品牌名、导航、公告、介绍、归档、音乐预览、问答预览、页脚、访问计数 |
| 博客文章 | `blog/post.html` + `blog/posts-data.js` | Markdown 文章、图片目录 | 标题、日期、分类、摘要、正文、点赞数 |
| 音乐专辑 | `music.html` | `SITE_CONFIG.music` + `album/songs.js` | 页面标题、描述、歌曲列表、封面、播放次数 |
| 关于页 | `personal/index.html` | 静态 HTML（建站时写入） | 昵称、简介、社交链接、头像与排版 |
| 问答区 | 首页内嵌 | `/api/qa` 远程数据 | 提问、点赞、回答展示 |

博客列表数据由 `studio.py` / `build_blog.py` 自动生成，不要手改 `posts-data.js`。

### 站点全局配置：`site-config.js`

页面运行时读取 `window.SITE_CONFIG`，修改后刷新即可预览，发布后生效。

```js
window.SITE_CONFIG = {
  "brand": "我的个人站",
  "brandSub": "PERSONAL / SITE",
  "nav": [
    { "id": "blog", "label": "个人博客" },
    { "id": "qa", "label": "问答区" },
    { "id": "music", "label": "音乐专辑" },
    { "id": "dev", "label": "开发者" }
  ],
  "footer": {
    "copyright": "© 2026 我的个人站",
    "about": "关于",
    "aboutUrl": "personal/index.html",
    "github": "GitHub",
    "githubUrl": "https://github.com/",
    "contact": "联系",
    "contactUrl": "mailto:"
  },
  "welcome": { "title": "我的个人站", "subtitle": "记录技术、音乐与生活。" },
  "music": { "title": "音乐专辑", "description": "收录喜欢的歌曲与旋律。" }
};
```

| 字段 | 作用 | 限制 |
| --- | --- | --- |
| `brand` | 站点名称 | 60 字 |
| `brandSub` | 导航栏小字 | 80 字 |
| `nav[].id` | 导航目标：`blog` / `qa` / `music` / `dev` | 固定值 |
| `nav[].label` | 导航文案 | 30 字，顺序即显示顺序 |
| `footer.*` | 版权与三个链接的文案 / 地址 | 200 字 |
| `welcome.title/subtitle` | 欢迎页文案 | 40 / 60 字 |
| `music.title/description` | 音乐页标题与描述 | 40 / 200 字 |

### 首页板块：`site-layout.js`

页面按数组顺序渲染模块，`enabled: false` 时不显示。

```js
window.SITE_LAYOUT = {
  "modules": [
    { "id": "intro", "enabled": true, "title": "我的个人站", "text": "记录技术、音乐与生活的地方。" },
    { "id": "notice", "enabled": false, "text": "" },
    { "id": "archive", "enabled": true, "title": "文章归档", "count": 0 },
    { "id": "music", "enabled": true, "title": "音乐专辑", "text": "最近在听与收藏的曲子。", "count": 4 },
    { "id": "qa", "enabled": true, "title": "问答精选", "text": "访客提问与站长的回答。", "count": 3 }
  ]
};
```

| 模块 id | 名称 | 字段 | 说明 |
| --- | --- | --- | --- |
| `intro` | 站点介绍 | `title`、`text` | 首页大标题与介绍 |
| `notice` | 公告 | `text` | 默认关闭 |
| `archive` | 文章归档 | `title`、`count` | `count = 0` 显示全部 |
| `music` | 音乐专辑 | `title`、`text`、`count` | 展示歌曲数 1–20 |
| `qa` | 问答精选 | `title`、`text`、`count` | 展示条数 1–20 |

### 欢迎页 `welcome.html`

- 文案来自 `SITE_CONFIG.welcome`，静态文本只是首屏兜底
- 背景是 CSS 渐变，可在 `<style>` 的 `body { background: ... }` 中换成图片：
  `background: linear-gradient(...), url('album/bg/your.jpg') center/cover;`
- 点击任意位置进入首页；`sessionStorage.welcomeShown` 记录已访问状态

### 博客文章

目录结构：

```
blog/posts/<slug>/
├── index.md          # front matter + Markdown 正文
└── images/           # 文章图片（自动生成）
```

`index.md` 头部字段：

```markdown
---
title: 文章标题
date: 2026-11-19
created: 2026-11-19 10:00
category: 随笔
summary: 列表页显示的一句话摘要
---
```

正文支持标准 Markdown。点赞数通过 `/api/counter?key=like-<slug>` 计数，浏览器用 `localStorage` 防止重复点赞。

### 音乐页

`album/songs.js`：

```js
window.MUSIC_SONGS = [
  { "id": "song-1", "title": "歌名", "artist": "歌手", "file": "track.mp3", "cover": "cover.jpg" }
];
```

- `id` 只能包含字母、数字、`-`、`_`，用于播放计数 `play-<id>`
- `file` 指向 `album/` 下的音频；`cover` 指向 `album/cover/` 下的图片
- 无歌曲时页面显示占位封面和「暂无歌曲」

### 关于页 `personal/index.html`

建站时会把占位符替换成你的信息，之后可以直接编辑 HTML：

- 站点名、昵称、简介在 `<h1>`、`.author`、`.intro`
- 导航链接在 `<nav>` 中，替换 `href` 即可
- 想加头像：在 `<main class="card">` 内插入 `<img src="avatar.jpg" alt="头像">`，图片放到 `personal/`
- 样式集中在 `<style>`，可改背景色、卡片宽度、圆角、字体

### 建站占位符（模板变量）

内置模板使用以下占位符，建站时由向导一次性替换；自定义模板时也可以复用：

| 占位符 | 含义 |
| --- | --- |
| `{{SITE_NAME}}` | 站点名称 |
| `{{SITE_BRAND_SUB}}` | 副标题 |
| `{{SITE_INTRO}}` | 一句话简介 |
| `{{AUTHOR}}` | 昵称 |
| `{{WELCOME_SUBTITLE}}` | 欢迎页副标题 |
| `{{GITHUB_URL}}` | GitHub 主页 |
| `{{CONTACT_URL}}` | 联系链接（自动补 `mailto:`） |
| `{{YEAR}}` | 当前年份 |

### 主题与细节

- 图标：模板未附带 favicon，可在各页面 `<head>` 添加 `<link rel="icon" href="...">`
- 鼠标指针：`mouse/` 目录，CSS 中 `cursor: url('mouse/01.cur')`
- 配色：各页面 `<style>` 内直接修改颜色值；首页与音乐页分别维护
- 响应式断点：首页 `@media (max-width: 820px)`，音乐页同

---

## 接口定义与配置

接口分两类：

1. **本地建站台 API**：`studio.py` 提供，仅监听 `127.0.0.1`，用于界面读写站点文件、构建和发布
2. **站点运行时 API**：Cloudflare Functions，部署后由浏览器调用，负责访问计数与问答

### 通用约定

- 本地接口 Base URL：`http://127.0.0.1:8765`（可用 `--port` 修改）
- 站点接口 Base URL：你的部署域名，例如 `https://your-site.pages.dev`
- JSON 请求需带 `Content-Type: application/json`
- 失败统一返回，并用 HTTP 状态码表示类别：

```json
{ "ok": false, "error": "错误说明" }
```

| 状态码 | 含义 |
| --- | --- |
| 200 | 成功 |
| 400 | 参数缺失 / 格式错误 / 业务校验失败 |
| 403 | 需要确认或令牌不匹配 |
| 404 | 资源不存在 |
| 409 | 状态冲突（重复、排序不一致、未保存就上传） |
| 413 | 上传文件过大 |
| 500 / 502 | 服务端错误 / 代理远程站点失败 |

---

### 本地建站台 API

#### 站点

##### `GET /api/site`

读取当前站点状态。

**入参**：无

**出参**

```json
{
  "ok": true,
  "path": "/Users/me/site",
  "exists": true,
  "isRepo": true,
  "branch": "main",
  "remote": "https://github.com/me/my-site.git",
  "url": "https://github.com/me/my-site"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `path` | string | 站点绝对路径 |
| `exists` | boolean | 是否存在 `index.html` |
| `isRepo` | boolean | 站点目录本身是否为 git 仓库 |
| `branch` | string | 当前分支，非仓库时为空 |
| `remote` | string | `origin` 地址原样，未配置为空 |
| `url` | string | 把 SSH 地址转成 https 后的可读地址 |

##### `POST /api/site/init`

从内置模板生成站点，可选初始化 git 并提交首版。

**入参**

```json
{
  "path": "/Users/me/site",
  "name": "我的个人站",
  "subtitle": "ME / PERSONAL SITE",
  "author": "小明",
  "intro": "记录技术与生活。",
  "welcome": "欢迎来到我的个人站。",
  "githubUrl": "https://github.com/me",
  "contact": "me@example.com",
  "repoUrl": "https://github.com/me/my-site.git"
}
```

| 字段 | 必填 | 类型 | 限制 |
| --- | --- | --- | --- |
| `path` | 否 | string | 空目录或不存在；缺省为当前站点目录 |
| `name` | 是 | string | ≤40 字 |
| `subtitle` | 否 | string | ≤80 字，默认 `PERSONAL SITE` |
| `author` | 否 | string | ≤40 字，默认同 `name` |
| `intro` | 否 | string | ≤500 字 |
| `welcome` | 否 | string | ≤60 字 |
| `githubUrl` | 否 | string | 以 `http` 开头，默认 `https://github.com/` |
| `contact` | 否 | string | ≤200 字，自动补 `mailto:` |
| `repoUrl` | 否 | string | 以 `https://` 或 `git@` 开头 |

**出参**

```json
{
  "ok": true,
  "site": { "path": "/Users/me/site", "exists": true, "isRepo": true, "...": "..." },
  "logs": ["站点已创建：/Users/me/site", "已设置远程仓库：...", "已创建首个提交"]
}
```

`site` 结构同 `GET /api/site`。

**错误**：`400` 目录非空、名称为空、链接格式错误。

##### `POST /api/site/remote`

设置或修改远程仓库；站点还不是仓库时会自动初始化、配置提交身份并提交首版。

**入参**

```json
{ "url": "https://github.com/me/my-site.git" }
```

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `url` | 是 | string | `https://` 或 `git@` 开头，≤300 字 |

**出参**：同 `GET /api/site`（直接返回站点状态字段）

**错误**：`400` 地址为空 / 格式错误 / 无法写入远程配置。

#### 文章

##### `GET /api/posts`

**入参**：无

**出参**

```json
{
  "ok": true,
  "posts": [
    {
      "slug": "hello-world",
      "title": "你好世界",
      "date": "2026-11-19",
      "created": "2026-11-19 10:00",
      "category": "随笔",
      "summary": "第一篇文章",
      "images": ["cover.png"],
      "chars": 1280,
      "updated": "2026-11-19 10:32",
      "path": "blog/posts/hello-world/index.md",
      "base": "posts/hello-world/",
      "isFolder": true
    }
  ],
  "stale": false,
  "built": "2026-11-19 10:32"
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `posts[].chars` | number | 去掉空白后的正文字数 |
| `posts[].base` | string | 文章相对博客根目录的路径前缀 |
| `posts[].isFolder` | boolean | 是否为目录式文章 |
| `stale` | boolean | `posts-data.js` 是否落后于 Markdown |
| `built` | string | 数据文件生成时间，未生成时为空串 |

##### `GET /api/post?slug=<slug>`

**入参（query）**

| 参数 | 必填 | 说明 |
| --- | --- | --- |
| `slug` | 是 | 文章目录名或文件名（不含 `.md`） |

**出参**

```json
{
  "ok": true,
  "post": { "slug": "hello-world", "title": "你好世界", "...": "..." },
  "meta": {
    "title": "你好世界",
    "date": "2026-11-19",
    "created": "2026-11-19 10:00",
    "category": "随笔",
    "summary": "第一篇文章"
  },
  "content": "正文 Markdown",
  "images": [
    { "name": "cover.png", "url": "/blog/posts/hello-world/images/cover.png" }
  ]
}
```

`post` 结构同文章列表项；`meta` 为 front matter 全部键值。

**错误**：`404` 文章不存在。

##### `POST /api/post/create`

**入参**

```json
{
  "title": "你好世界",
  "date": "2026-11-19",
  "slug": "hello-world",
  "category": "随笔",
  "summary": "第一篇文章"
}
```

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `title` | 是 | string | 标题 |
| `date` | 否 | string | `YYYY-MM-DD`，缺省当天 |
| `slug` | 否 | string | 仅字母 / 数字 / `-` / `_`，缺省自动生成 |
| `category` | 否 | string | 分类 |
| `summary` | 否 | string | 摘要 |

**出参**

```json
{ "ok": true, "slug": "hello-world", "built": 1 }
```

`built` 为重新生成后的文章总数。

**错误**：`400` 标题为空 / 日期格式错误；`409` 指定的 slug 已存在。

##### `POST /api/post/save?slug=<slug>`

**入参（query）**：`slug` 必填。

**入参（body）**

```json
{
  "title": "你好世界（修订）",
  "date": "2026-11-19",
  "category": "随笔",
  "summary": "更新后的摘要",
  "content": "# 正文\n\nMarkdown 内容"
}
```

**出参**

```json
{
  "ok": true,
  "built": 1,
  "post": { "slug": "hello-world", "title": "你好世界（修订）", "...": "..." },
  "stale": false
}
```

**错误**：`404` 文章不存在；`400` 标题为空 / 日期格式错误。

##### `POST /api/post/delete?slug=<slug>`

**入参**：query `slug` 必填。

**出参**

```json
{ "ok": true, "built": 0 }
```

**错误**：`404` 文章不存在。

##### `POST /api/upload?slug=<slug>&name=<文件名>`

上传文章图片，body 为图片二进制。

**入参**

| 位置 | 参数 | 必填 | 说明 |
| --- | --- | --- | --- |
| query | `slug` | 是 | 必须是已保存的目录式文章 |
| query | `name` | 否 | 原始文件名，默认 `image` |
| body | 二进制 | 是 | png / jpg / gif / webp / svg / avif，≤20MB |

**出参**

```json
{
  "ok": true,
  "name": "cover.png",
  "markdown": "![cover](images/cover.png)",
  "url": "/blog/posts/hello-world/images/cover.png",
  "size": 20480
}
```

**错误**：`409` 文章未保存或不是目录式文章；`413` 超过 20MB；`400` 类型不支持 / 内容为空。

##### `POST /api/reveal?slug=<slug>`

在 macOS Finder 中打开文章所在目录。

**入参**：query `slug` 必填。

**出参**：`{ "ok": true }`

**错误**：`404` 文章不存在；`400` 非 macOS。

#### 构建与发布

##### `POST /api/build`

重新生成 `blog/posts-data.js`。

**入参**：无

**出参**：`{ "ok": true, "count": 3 }`

##### `GET /api/status`

**入参**：无

**出参（站点是仓库）**

```json
{
  "ok": true,
  "branch": "main",
  "lastCommit": "f45fdce 完善 README",
  "changes": [
    { "status": "M", "path": "blog/posts/hello-world/index.md" }
  ],
  "blogChanges": [
    { "status": "M", "path": "blog/posts/hello-world/index.md" }
  ],
  "otherCount": 0,
  "path": "/Users/me/site",
  "exists": true,
  "isRepo": true,
  "remote": "https://github.com/me/my-site.git",
  "url": "https://github.com/me/my-site"
}
```

`changes[].status` 为 git porcelain 状态码（`M` 修改、`A` 新增、`D` 删除、`??` 未跟踪等）；`blogChanges` 只统计 `blog/` 路径；`otherCount` 为其余改动数量。

**出参（不是仓库）**：`ok: false`，`error`、空数组，并附带站点状态字段。

##### `POST /api/publish`

提交并推送，必须显式确认。

**入参**

```json
{
  "confirm": true,
  "scope": "blog",
  "message": "更新文章"
}
```

| 字段 | 必填 | 类型 | 说明 |
| --- | --- | --- | --- |
| `confirm` | 是 | boolean | 必须为 `true`，否则 `403` |
| `scope` | 否 | string | `blog`（默认，文章数据与 `blog/`）、`songs`、`layout`、`site` 或 `all`（全站） |
| `message` | 否 | string | 提交说明，缺省自动生成 |

**出参**

```json
{ "ok": true, "logs": ["已重新生成文章数据（1 篇）", "已提交：更新文章", "已推送到远程仓库"] }
```

失败时返回 `ok: false`、`logs` 数组和 `error`，HTTP 状态码 500。

**错误**：`403` 未确认；`500` 推送失败（含 403 提示）。没有新改动时仍会正常返回，日志里会说明「没有新的改动需要提交」。

#### 歌曲

##### `GET /api/songs`

**入参**：无

**出参**

```json
{
  "ok": true,
  "songs": [
    { "id": "song-1", "title": "歌名", "artist": "歌手", "file": "track.mp3", "cover": "cover.jpg" }
  ],
  "audioFiles": ["track.mp3"],
  "coverFiles": ["cover.jpg"]
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `songs[].id` | string | 唯一 ID，仅字母 / 数字 / `-` / `_` |
| `songs[].file` | string | `album/` 下的音频文件名 |
| `songs[].cover` | string | `album/cover/` 下的封面文件名，可为空 |

##### `POST /api/songs/add`

**入参**

```json
{
  "id": "song-2",
  "title": "新歌",
  "artist": "歌手",
  "file": "track2.mp3",
  "cover": "cover2.jpg"
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | 否 | 缺省按标题生成，重复会报错 |
| `title` | 是 | 歌名 |
| `artist` | 否 | 歌手 |
| `file` | 是 | 必须是 `album/` 下真实存在的音频 |
| `cover` | 否 | 必须是 `album/cover/` 下真实存在的图片 |

**出参**：`{ "ok": true, "song": {...}, "songs": [...], "audioFiles": [...], "coverFiles": [...] }`

##### `POST /api/songs/reorder`

**入参**

```json
{ "ids": ["song-2", "song-1"] }
```

**出参**：`{ "ok": true, "songs": [...] }`

**错误**：`409` ID 集合与现有歌曲不一致；`400` 格式错误。

##### `POST /api/song/upload?kind=<audio|cover>&name=<文件名>`

body 为二进制。

| kind | 允许类型 | 大小上限 | 出参 |
| --- | --- | --- | --- |
| `audio` | `.mp3` | 100MB | 见下 |
| `cover` | png / jpg / gif / webp / svg / avif | 20MB | 见下 |

音频出参（自动读取 ID3）：

```json
{
  "ok": true,
  "kind": "audio",
  "name": "track.mp3",
  "file": "track.mp3",
  "url": "/album/track.mp3",
  "title": "歌名",
  "artist": "歌手",
  "cover": "track-cover.jpg",
  "coverUrl": "/album/cover/track-cover.jpg",
  "size": 5242880
}
```

封面出参：

```json
{
  "ok": true,
  "kind": "cover",
  "name": "cover.jpg",
  "cover": "album/cover/cover.jpg",
  "url": "/album/cover/cover.jpg",
  "size": 102400
}
```

**错误**：`400` 类型不支持 / 内容为空；`413` 超过大小限制。

#### 首页与站点配置

##### `GET /api/layout`

**出参**

```json
{
  "ok": true,
  "file": "site-layout.js",
  "modules": [
    {
      "id": "intro",
      "label": "站点介绍",
      "enabled": true,
      "title": "我的个人站",
      "text": "记录技术、音乐与生活的地方。",
      "fields": [
        { "key": "title", "label": "标题", "type": "text", "default": "我的个人站", "max": 60 }
      ]
    }
  ]
}
```

`fields` 是该模块可编辑字段的元数据（`key`、`label`、`type`、`default`、`max`，数字字段还会带 `min`），前端据此生成表单。

##### `POST /api/layout`

**入参**

```json
{
  "modules": [
    { "id": "intro", "enabled": true, "title": "我的个人站", "text": "记录技术与生活。" },
    { "id": "archive", "enabled": true, "title": "文章归档", "count": 0 }
  ]
}
```

只接受已知 id：`intro`、`notice`、`archive`、`music`、`qa`；顺序即首页显示顺序，未出现的模块会被忽略。

**出参**：`{ "ok": true, "modules": [...] }`（结构同 GET）

**错误**：`400` 缺少列表或列表为空。

##### `GET /api/site-config`

**出参**

```json
{
  "ok": true,
  "file": "site-config.js",
  "config": {
    "brand": "我的个人站",
    "brandSub": "PERSONAL / SITE",
    "nav": [{ "id": "blog", "label": "个人博客" }],
    "footer": {
      "copyright": "© 2026 我的个人站",
      "about": "关于",
      "aboutUrl": "personal/index.html",
      "github": "GitHub",
      "githubUrl": "https://github.com/",
      "contact": "联系",
      "contactUrl": "mailto:"
    },
    "welcome": { "title": "我的个人站", "subtitle": "记录技术、音乐与生活。" },
    "music": { "title": "音乐专辑", "description": "收录喜欢的歌曲与旋律。" }
  }
}
```

##### `POST /api/site-config`

**入参**：完整的 `config` 对象（字段同上）。缺失字段会用默认值补齐，`nav[].id` 仅接受 `blog`、`qa`、`music`、`dev`。

**出参**：`{ "ok": true, "config": {...} }`

**错误**：`400` 配置格式错误 / 数值越界。

#### 问答代理

建站台不直接存问答数据，而是携带管理令牌代理到已部署站点。

##### `GET /api/qa/config`

**出参**

```json
{ "ok": true, "url": "https://your-site.pages.dev", "hasToken": true }
```

##### `POST /api/qa/config`

**入参**

```json
{ "qaUrl": "https://your-site.pages.dev", "qaToken": "你的QA_ADMIN_TOKEN" }
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `qaUrl` | 是 | 以 `http://` 或 `https://` 开头 |
| `qaToken` | 否 | 留空表示不修改已保存的令牌 |

**出参**：`{ "ok": true, "url": "...", "hasToken": true }`

##### `GET /api/qa`

代理读取管理端数据，返回站点 `/api/qa?admin=1` 的原始结果：

```json
{
  "ok": true,
  "questions": [
    {
      "id": "m3x1-ab12cd34",
      "name": "访客",
      "question": "怎么部署？",
      "createdAt": "2026-11-19T02:00:00.000Z",
      "answer": "……",
      "answeredAt": "2026-11-19T03:00:00.000Z",
      "likes": 2,
      "pending": false
    }
  ],
  "pending": 1
}
```

**错误**：`502` 未配置地址/令牌或远程请求失败。

##### `POST /api/qa/answer`

**入参**

```json
{ "id": "m3x1-ab12cd34", "answer": "这里填写回答" }
```

**出参**：`{ "ok": true, "question": { ... } }`（管理端视图）

##### `POST /api/qa/delete`

**入参**

```json
{ "id": "m3x1-ab12cd34" }
```

**出参**：`{ "ok": true, "deleted": "m3x1-ab12cd34" }`

#### curl 示例

```bash
# 站点状态
curl http://127.0.0.1:8765/api/site

# 新建文章
curl -X POST http://127.0.0.1:8765/api/post/create \
  -H 'Content-Type: application/json' \
  -d '{"title":"第一篇","date":"2026-11-19","summary":"你好"}'

# 保存文章
curl -X POST 'http://127.0.0.1:8765/api/post/save?slug=first' \
  -H 'Content-Type: application/json' \
  -d '{"title":"第一篇","date":"2026-11-19","content":"# 你好\n\n正文"}'

# 全站发布
curl -X POST http://127.0.0.1:8765/api/publish \
  -H 'Content-Type: application/json' \
  -d '{"confirm":true,"scope":"all","message":"更新站点"}'
```

---

### 站点运行时 API（Cloudflare Functions）

文件位于 `template/functions/api/`，部署后路径为 `/api/*`。所有数据存放在 KV 命名空间 `COUNTERS`。

#### 访问计数 `/api/counter`

`key` 规则：1–80 位，仅字母、数字、`:`、`_`、`-`；以 `qa:` 开头会被拒绝。

`GET /api/counter?key=<key>`

```json
{ "count": 123 }
```

`POST /api/counter?key=<key>`：计数 +1

```json
{ "count": 124 }
```

错误：`400 {"error":"invalid key"}`；`500 {"error":"binding missing"}`。

页面自动使用的 key：

- `visits`：首页访问量
- `like-<slug>`：文章点赞
- `play-<song.id>`：歌曲播放次数

#### 重置计数 `/api/reset`

需要环境变量 `RESET_TOKEN`，只支持 POST。

**入参**

| 位置 | 参数 | 必填 | 说明 |
| --- | --- | --- | --- |
| query / header | `token` / `x-reset-token` | 是 | 需与 `RESET_TOKEN` 完全一致 |
| query | `key` | 否 | 只清指定键；不传则清空全部非 `qa:` 键 |

**出参**

```json
{ "deleted": ["visits", "like-hello-world"], "count": 2 }
```

**错误**：`403 {"error":"forbidden"}`；`500` 未配置令牌 / 未绑定 KV；`400` key 非法。

```bash
# 清空全部计数（保留问答）
curl -X POST 'https://你的域名/api/reset?token=你的RESET_TOKEN'

# 只清一个键
curl -X POST 'https://你的域名/api/reset?token=你的RESET_TOKEN&key=visits'
```

#### 问答 `/api/qa`

数据键前缀 `qa:q:`（问题）、`qa:like:`（点赞记录）、`qa:limit:`（每日提问限制）。

**问题对象**

```json
{
  "id": "m3x1-ab12cd34",
  "name": "访客",
  "question": "这个站点怎么部署的？",
  "createdAt": "2026-11-19T02:00:00.000Z",
  "answer": "……",
  "answeredAt": "2026-11-19T03:00:00.000Z",
  "likes": 2,
  "pending": false
}
```

公开视图只返回已回答的问题，以及当前访客自己提出但尚未回答的问题。

`GET /api/qa`（公开）

```json
{
  "ok": true,
  "questions": [
    {
      "id": "m3x1-ab12cd34",
      "name": "访客",
      "question": "这个站点怎么部署的？",
      "createdAt": "2026-11-19T02:00:00.000Z",
      "answer": "……",
      "answeredAt": "2026-11-19T03:00:00.000Z",
      "likes": 2,
      "pending": false
    }
  ],
  "canAsk": true
}
```

`GET /api/qa?admin=1`（管理端）：需请求头 `x-qa-token` 或 `Authorization: Bearer <QA_ADMIN_TOKEN>`，返回全部问题与 `pending` 数量。

`POST /api/qa` 通过 `action` 区分操作：

| action | 入参 | 权限 | 成功出参 |
| --- | --- | --- | --- |
| `ask` | `question`（2–500 字）、`name`（≤30 字，可选） | 公开 | `{ "ok": true, "question": PublicQuestion, "canAsk": false }` |
| `like` | `id` | 公开 | `{ "ok": true, "likes": 3 }` |
| `answer` | `id`、`answer`（1–2000 字） | 管理令牌 | `{ "ok": true, "question": AdminQuestion }` |
| `delete` | `id` | 管理令牌 | `{ "ok": true, "deleted": "id" }` |

**错误**

| 状态码 | 场景 |
| --- | --- |
| 400 | 问题 / 回答长度不合法、未回答就点赞、未知 action |
| 403 | 管理令牌不匹配 |
| 404 | 问题不存在 |
| 409 | 同一访客重复点赞 |
| 429 | 当天已提问过 |
| 500 | 未绑定 KV / 数据损坏 / 未配置管理令牌 |

```bash
# 提问
curl -X POST https://你的域名/api/qa \
  -H 'Content-Type: application/json' \
  -d '{"action":"ask","name":"访客","question":"这个站点怎么部署的？"}'

# 管理端读取
curl 'https://你的域名/api/qa?admin=1' -H 'x-qa-token: 你的QA_ADMIN_TOKEN'

# 回答
curl -X POST https://你的域名/api/qa \
  -H 'Content-Type: application/json' \
  -H 'x-qa-token: 你的QA_ADMIN_TOKEN' \
  -d '{"action":"answer","id":"m3x1-ab12cd34","answer":"用 Cloudflare Pages 部署的。"}'
```

### 配置项总表

| 配置 | 位置 | 说明 |
| --- | --- | --- |
| `--port` / `PORT` | 命令行 / 环境变量 | 建站台端口，默认 8765 |
| `--site` / `STUDIO_SITE` | 命令行 / 环境变量 | 站点目录；未指定时使用上次建站目录 |
| `.studio-config.json` | 项目根目录 | `lastSite`、`site`、`qaUrl`、`qaToken`；权限 600，已 gitignore |
| `COUNTERS` | Cloudflare KV 绑定 | 计数与问答数据，必须绑定 |
| `QA_ADMIN_TOKEN` | Cloudflare 环境变量 | 问答管理令牌，与建站台填写的一致 |
| `RESET_TOKEN` | Cloudflare 环境变量 | 计数重置令牌，可不配置 |
| `.gitignore` | 站点仓库根目录 | 忽略 `.DS_Store`、日志等 |

---

## 部署

### Cloudflare Pages（推荐，功能完整）

1. GitHub 新建空仓库，把地址填入建站台「站点 → 仓库与部署」并保存
2. 点「发布到仓库」完成首次推送
3. Cloudflare Dashboard → Workers & Pages → 创建 Pages 项目 → 连接该仓库
4. 构建命令留空，输出目录填 `/`
5. Settings → Functions → KV namespace bindings 绑定 `COUNTERS`
6. Settings → Environment variables 设置 `QA_ADMIN_TOKEN`（可选 `RESET_TOKEN`）
7. 回到建站台「问答」页填写站点地址与相同令牌

### GitHub Pages（纯静态）

1. 推送站点仓库
2. 仓库 Settings → Pages → Source 选择 `main` 根目录

问答、访问计数、点赞依赖 Cloudflare Functions，在 GitHub Pages 上不可用，页面其余部分正常。

### 其他平台

Vercel、Netlify 等选择静态站点部署、输出目录为仓库根目录即可；需要问答时请选择支持 Cloudflare Functions 的平台。

---

## 目录结构

```
lefttee/
├── studio.py            # 本地建站台服务
├── build_blog.py        # 生成 blog/posts-data.js（--site 指定站点）
├── studio/              # 建站台界面（HTML / CSS / JS）
├── template/            # 内置通用站点模板
│   ├── index.html       # 首页
│   ├── welcome.html     # 欢迎页
│   ├── music.html       # 音乐专辑
│   ├── site-config.js   # 站点全局配置
│   ├── site-layout.js   # 首页模块配置
│   ├── blog/            # 文章页与文章数据
│   ├── personal/        # 关于页
│   ├── album/           # 歌曲数据与封面
│   ├── functions/api/   # Cloudflare Functions
│   └── mouse/           # 鼠标指针
├── site/                # 建站生成的站点（gitignore）
└── start.sh
```

---

## 常见问题

**推送时报 403 / 没有权限**

先在终端执行 `gh auth status` 确认已登录有写权限的 GitHub 账号，再重启建站台发布；也可在目标仓库配置好凭据后手动 `git push`。

**推送超时 / 连不上 github.com**

建站台使用 git 推送，不会自动读取系统代理。如果浏览器能打开 GitHub 但推送超时，请给 git 设置代理（端口按自己的代理工具调整）：

```bash
git config --global http.proxy http://127.0.0.1:7897
# 取消代理
git config --global --unset http.proxy
```

**端口被占用**

```bash
PORT=9000 ./start.sh
```

**想换一个站点目录**

用 `--site` 指定新目录重新启动，或在向导里换一个空目录。问答配置按站点路径隔离。

**问答页提示「binding missing」**

Cloudflare 项目里没有绑定 `COUNTERS` KV，或绑定的变量名不是 `COUNTERS`。

**首页访问量 / 点赞一直为 0**

计数接口未部署或被拦截。确认站点跑在 Cloudflare Pages 且已绑定 KV；纯静态托管时该接口不可用。

**文章列表为空**

还没有文章，或 `blog/posts-data.js` 未生成。执行 `python3 build_blog.py --site site`，或在建站台保存任意文章触发重建。

**模板里没有示例图片 / 音乐？**

模板不包含任何示例文章、歌曲和个人图片，避免把他人内容带入新站。音乐页在无歌曲时显示占位封面。

---

## License

见仓库根目录的 LICENSE。
