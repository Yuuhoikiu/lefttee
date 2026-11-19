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

### 本地建站台 API

Base URL：`http://127.0.0.1:8765`。请求 / 响应均为 JSON（上传接口为二进制 body）。失败统一返回：

```json
{ "ok": false, "error": "错误说明" }
```

#### 站点

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/site` | — | 站点状态：`path`、`exists`、`isRepo`、`branch`、`remote`、`url` |
| POST | `/api/site/init` | body 见下 | 从模板生成站点，可选初始化 git |
| POST | `/api/site/remote` | `{ "url": "https://github.com/user/repo.git" }` | 设置 / 修改远程仓库，必要时初始化 git 并提交首版 |

`/api/site/init` 请求体：

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

返回 `{ "ok": true, "site": {...}, "logs": ["站点已创建：...", "已创建首个提交"] }`。

#### 文章

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/posts` | — | 文章列表，附带 `stale`（数据是否过期）与 `built` 时间 |
| GET | `/api/post` | `?slug=` | 单篇详情：`post`、`meta`、`content`、`images` |
| POST | `/api/post/create` | `{ "title", "date", "slug?", "category", "summary" }` | 新建文章目录与 `index.md` |
| POST | `/api/post/save` | `?slug=` + `{ "title", "date", "category", "summary", "content" }` | 保存并自动重建数据 |
| POST | `/api/post/delete` | `?slug=` | 删除文章目录 |
| POST | `/api/upload` | `?slug=&name=`，body 为图片二进制 | 上传图片到该文章 `images/`，返回 `markdown` 片段 |
| POST | `/api/reveal` | `?slug=` | macOS 上在 Finder 中打开文章目录 |

`date` 格式 `YYYY-MM-DD`；`slug` 仅限字母、数字、`-`、`_`。

#### 构建与发布

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/build` | — | 重新生成 `blog/posts-data.js`，返回文章数 |
| GET | `/api/status` | — | git 状态：`branch`、`lastCommit`、`changes`、`blogChanges`、`otherCount` |
| POST | `/api/publish` | `{ "confirm": true, "scope": "blog" \| "all", "message": "提交说明" }` | 提交并推送；`confirm` 必须为 `true` |

`scope = "blog"` 只提交 `blog/` 路径；`scope = "all"` 全站提交。首次推送自动使用 `git push -u origin HEAD`。

#### 歌曲

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/songs` | — | `songs`、`audioFiles`、`coverFiles` |
| POST | `/api/songs/add` | `{ "id?", "title", "artist", "file", "cover" }` | 追加歌曲 |
| POST | `/api/songs/reorder` | `{ "ids": ["song-1", "song-2"] }` | 按数组顺序重排 |
| POST | `/api/song/upload` | `?kind=audio\|cover&name=` + 二进制 body | 音频限 mp3（≤100MB），封面图片 ≤20MB |

#### 首页与站点配置

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/layout` | — | 首页模块数组（含字段定义） |
| POST | `/api/layout` | `{ "modules": [ ... ] }` | 写入 `site-layout.js` |
| GET | `/api/site-config` | — | 读取 `site-config.js` |
| POST | `/api/site-config` | 配置对象（字段同上文） | 写入 `site-config.js` |

#### 问答代理

建站台不直接存问答数据，而是携带管理令牌代理到已部署站点。

| 方法 | 路径 | 参数 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/qa/config` | — | 返回已配置的站点地址与是否已有令牌 |
| POST | `/api/qa/config` | `{ "qaUrl": "https://...", "qaToken": "..." }` | 保存问答连接配置 |
| GET | `/api/qa` | — | 代理读取全部问题（含待回答） |
| POST | `/api/qa/answer` | `{ "id", "answer" }` | 发布回答 |
| POST | `/api/qa/delete` | `{ "id" }` | 删除问题 |

#### curl 示例

```bash
# 站点状态
curl http://127.0.0.1:8765/api/site

# 新建文章
curl -X POST http://127.0.0.1:8765/api/post/create \
  -H 'Content-Type: application/json' \
  -d '{"title":"第一篇","date":"2026-11-19","summary":"你好"}'

# 全站发布
curl -X POST http://127.0.0.1:8765/api/publish \
  -H 'Content-Type: application/json' \
  -d '{"confirm":true,"scope":"all","message":"更新站点"}'
```

### 站点运行时 API（Cloudflare Functions）

文件位于 `template/functions/api/`，部署后路径为 `/api/*`。所有数据存放在 KV 命名空间 `COUNTERS`。

#### 访问计数 `/api/counter`

| 方法 | 查询参数 | 说明 |
| --- | --- | --- |
| GET | `key` | 读取计数，返回 `{ "count": 123 }` |
| POST | `key` | 计数 +1，返回最新值 |

`key` 允许字母、数字、`:`、`_`、`-`，以 `qa:` 开头会被拒绝。页面自动使用：

- `visits`：首页访问量
- `like-<slug>`：文章点赞
- `play-<song.id>`：歌曲播放次数

#### 重置计数 `/api/reset`

需要环境变量 `RESET_TOKEN`。

```bash
# 清空全部计数（保留问答）
curl -X POST 'https://你的域名/api/reset?token=你的RESET_TOKEN'

# 只清一个键
curl -X POST 'https://你的域名/api/reset?token=你的RESET_TOKEN&key=visits'
```

令牌也可放在请求头 `x-reset-token`。不带 `key` 时会遍历删除所有非 `qa:` 开头的键。

#### 问答 `/api/qa`

数据键前缀 `qa:q:`，点赞记录 `qa:like:`，每日提问限制 `qa:limit:`。

`GET /api/qa`

- 公开：返回已回答问题 + 当前访客自己未回答的问题，附带 `canAsk`
- 管理：`?admin=1`，需请求头 `x-qa-token` 或 `Authorization: Bearer <QA_ADMIN_TOKEN>`，返回全部问题与待回答数

`POST /api/qa`，body 中的 `action`：

| action | 字段 | 权限 | 说明 |
| --- | --- | --- | --- |
| `ask` | `question`（2–500 字）、`name`（≤30 字，可选） | 公开 | 同一访客每天限 1 条（上海时区） |
| `like` | `id` | 公开 | 仅已回答问题可点赞，同一访客只能赞一次 |
| `answer` | `id`、`answer`（1–2000 字） | 管理令牌 | 写入回答时间 |
| `delete` | `id` | 管理令牌 | 删除问题及点赞记录 |

示例：

```bash
# 提问
curl -X POST https://你的域名/api/qa \
  -H 'Content-Type: application/json' \
  -d '{"action":"ask","name":"访客","question":"这个站点怎么部署的？"}'

# 管理端读取
curl https://你的域名/api/qa?admin=1 -H 'x-qa-token: 你的QA_ADMIN_TOKEN'
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
