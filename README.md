# 个人站建站台

一个跑在本地、面向个人站点的「建站 + 写作 + 发布」小工具。第一次打开时按向导填写站点名称和简介，就会生成一套完整的个人网站（首页、博客、音乐、问答、关于），之后可以在图形界面里写文章、加歌、改站点设置，确认后一键推送到 GitHub。

- 零依赖：只需要 Python 3 和 git
- 开箱即用：内置通用站点模板，不包含任何个人内容
- 本地优先：文章和配置都在你自己的磁盘上，发布前可以逐项确认
- 可托管：模板是纯静态站点 + Cloudflare Functions，可部署到 Cloudflare Pages，也可以只发布静态部分到 GitHub Pages

## 快速开始

```bash
git clone https://github.com/Yuuhoikiu/lefttee.git
cd lefttee
./start.sh
```

浏览器会自动打开 `http://127.0.0.1:8765/studio/`。首次使用会弹出建站向导：

| 字段 | 说明 |
| --- | --- |
| 目标目录 | 站点文件生成位置，默认是项目下的 `site/`，必须是空目录 |
| 站点名称 | 显示在首页、导航和浏览器标题里 |
| 副标题 | 导航栏小字，例如 `LIN / PERSONAL SITE` |
| 昵称 | 关于页署名 |
| 欢迎页副标题 | 首屏欢迎页的一句话 |
| 一句话简介 | 首页介绍与关于页正文 |
| GitHub 主页 / 联系邮箱 | 页脚与关于页链接，可留空 |
| GitHub 仓库地址 | 可选。填写后会初始化 git、建立首个提交并配置远程仓库 |

创建完成后，站点会生成在 `site/`（或你指定的目录），建站台会记住这个目录，下次启动直接打开。如果填了仓库地址，之后在「发布到仓库」里就能直接推送到 main。

也可以手动启动并指定已有站点目录：

```bash
python3 studio.py --site /path/to/site
# 或
STUDIO_SITE=/path/to/site ./start.sh
```

## 界面功能

- **文章**：新建 / 编辑 / 删除 Markdown 文章，拖拽或粘贴图片会自动放进该文章的 `images/` 目录
- **歌曲**：添加音频与封面、调整顺序，写入 `album/songs.js`
- **首页**：开关首页模块、修改模块标题和顺序，写入 `site-layout.js`
- **站点**：修改站点名称、副标题、导航、页脚、欢迎页与音乐页文案，写入 `site-config.js`；同页可查看站点目录、当前分支并保存远程仓库地址
- **问答**：连接已部署的站点，查看访客提问并发布回答
- **发布**：默认只提交 `blog/` 下的文章、图片与文章数据；勾选「全站推送」才会带上站点设置等其他改动

## 部署

### Cloudflare Pages（推荐，功能完整）

1. 在 GitHub 新建一个空仓库，把地址填进建站台的「仓库与部署」，保存后在「发布到仓库」推送一次
2. 打开 Cloudflare Dashboard → Workers & Pages → 创建 Pages 项目 → 连接该仓库
3. 构建命令留空，输出目录填 `/`
4. 在 Pages 项目的 Settings → Functions → KV namespace bindings 中绑定变量名 `COUNTERS`
5. 在 Settings → Environment variables 中设置：
   - `QA_ADMIN_TOKEN`：问答管理令牌（填写后回到建站台「问答」页保存同样的令牌）
   - `RESET_TOKEN`：访问计数重置令牌（可选）

模板里的 `functions/` 目录会提供访问计数与问答接口。只做纯静态托管时，这些接口不可用，页面仍然可以正常浏览。

### GitHub Pages（纯静态）

1. 推送站点仓库
2. 仓库 Settings → Pages → Source 选择 `main` 分支根目录
3. 问答和访问计数依赖 Cloudflare Functions，在 GitHub Pages 上不可用

### 其他平台

站点是标准静态文件，Vercel、Netlify 等平台选择静态站点部署、输出目录为仓库根目录即可。需要问答时，请使用支持 Cloudflare Functions 的平台。

## 目录结构

```
lefttee/
├── studio.py            # 本地建站台服务
├── build_blog.py        # 生成 blog/posts-data.js
├── studio/              # 建站台界面（HTML / CSS / JS）
├── template/            # 内置通用站点模板
│   ├── index.html       # 首页
│   ├── welcome.html     # 欢迎页
│   ├── music.html       # 音乐专辑
│   ├── blog/            # 博客文章页与文章数据
│   ├── personal/        # 关于页
│   ├── album/           # 歌曲数据与封面
│   ├── functions/api/   # Cloudflare Functions（问答 / 计数）
│   └── mouse/           # 自定义鼠标指针
├── site/                # 建站向导生成的站点（不提交到本仓库）
└── start.sh
```

`site/` 和 `.studio-config.json`（问答令牌）已加入 `.gitignore`，不会被提交。

## 常见问题

**推送时报 403 / 没有权限**

先在终端执行 `gh auth status` 确认已登录有写权限的 GitHub 账号，然后重启建站台再发布。也可以在目标仓库里配置好凭据后手动 `git push`。

**端口被占用**

```bash
PORT=9000 ./start.sh
```

**想换一个站点目录**

重新用 `--site` 启动即可；也可以把 `site/` 删除后重新建站。注意 `.studio-config.json` 中的问答配置按站点路径隔离。

**模板里的图片/音乐**

模板不包含任何示例文章、歌曲和个人图片。音乐页在没有歌曲时会显示占位封面与提示，添加第一首歌后自动恢复。

## License

见仓库根目录的 LICENSE。
