#!/usr/bin/env python3
"""个人站建站台

用法：
    python3 studio.py              # 启动后浏览器打开 http://127.0.0.1:8765/studio/
    python3 studio.py --port 9000  # 换端口
    python3 studio.py --no-open    # 不自动打开浏览器
    python3 studio.py --site /path/to/site  # 指定已有站点目录

功能：
    - 首次打开按向导创建个人站（博客 + 音乐 + 问答 + 关于），自动套用内置模板
    - 图形化新建 / 编辑 / 删除文章，自动创建 blog/posts/<slug>/ 目录
    - 图片拖拽上传到文章自己的 images/ 目录并插入 Markdown
    - 每次保存后自动重新生成 blog/posts-data.js（也可手动执行 build_blog.py --site 目录）
    - 歌曲添加、上传音频/封面与排序（写入 album/songs.js）
    - 问答管理：查看访客提问并在写作台发布回答
    - 查看 git 变更，确认后才 commit + push（发布必须手动确认）
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# 建站台本体与站点分离：所有文章 / 构建 / git 操作都落在站点目录里。
ROOT = Path(__file__).resolve().parent
STUDIO_DIR = ROOT / "studio"
TEMPLATE_DIR = ROOT / "template"
DEFAULT_SITE = ROOT / "site"
SITE = DEFAULT_SITE
POSTS_DIR = SITE / "blog" / "posts"
DATA_FILE = SITE / "blog" / "posts-data.js"
SONGS_FILE = SITE / "album" / "songs.js"
LAYOUT_FILE = SITE / "site-layout.js"
SITE_CONFIG_FILE = SITE / "site-config.js"
CONFIG_FILE = ROOT / ".studio-config.json"

SLUG_RE = re.compile(r"^[A-Za-z0-9_-]{1,80}$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
FRONT_MATTER = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.S)
SONGS_PATTERN = re.compile(r"window\.MUSIC_SONGS\s*=\s*(\[[\s\S]*?\])\s*;?", re.S)
LAYOUT_PATTERN = re.compile(r"window\.SITE_LAYOUT\s*=\s*(\{[\s\S]*\})\s*;?", re.S)
SITE_CONFIG_PATTERN = re.compile(r"window\.SITE_CONFIG\s*=\s*(\{[\s\S]*\})\s*;?", re.S)
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"}
AUDIO_EXTS = {".mp3", ".ogg", ".wav", ".m4a", ".flac", ".aac"}
MAX_UPLOAD = 20 * 1024 * 1024
MAX_AUDIO_UPLOAD = 100 * 1024 * 1024
META_ORDER = ["title", "date", "created", "category", "summary"]
PUBLISH_SCOPES = {
    "blog": ["blog"],
    "songs": ["album", "music.html"],
    "layout": ["site-layout.js", "index.html"],
    "site": ["site-config.js", "welcome.html", "music.html", "index.html"],
    "all": [],
}
PUBLISH_PATHS = PUBLISH_SCOPES["blog"]  # 默认只提交博客目录
DEFAULT_QA_URL = ""

# 首页板块目录：顺序即默认顺序，id 与 index.html 的 data-module 对应。
# 每个板块定义可配置字段 schema，前端据此动态渲染控件。
LAYOUT_CATALOG = [
    {
        "id": "intro", "label": "站点介绍", "enabled": True,
        "fields": [
            {"key": "title", "label": "标题", "type": "text",
             "default": "我的个人站", "max": 60},
            {"key": "text", "label": "介绍文字", "type": "textarea",
             "default": "记录技术、音乐与生活的地方。", "max": 500},
        ],
    },
    {
        "id": "notice", "label": "公告", "enabled": False,
        "fields": [
            {"key": "text", "label": "公告内容", "type": "textarea",
             "default": "", "max": 500},
        ],
    },
    {
        "id": "archive", "label": "文章归档", "enabled": True,
        "fields": [
            {"key": "title", "label": "标题", "type": "text",
             "default": "文章归档", "max": 60},
            {"key": "count", "label": "显示篇数（0 = 全部）", "type": "number",
             "default": 0, "min": 0, "max": 100},
        ],
    },
    {
        "id": "music", "label": "音乐专辑", "enabled": True,
        "fields": [
            {"key": "title", "label": "标题", "type": "text",
             "default": "音乐专辑", "max": 60},
            {"key": "text", "label": "副标题", "type": "text",
             "default": "最近在听与收藏的曲子。", "max": 100},
            {"key": "count", "label": "显示歌曲数", "type": "number",
             "default": 4, "min": 1, "max": 20},
        ],
    },
    {
        "id": "qa", "label": "问答精选", "enabled": True,
        "fields": [
            {"key": "title", "label": "标题", "type": "text",
             "default": "问答精选", "max": 60},
            {"key": "text", "label": "副标题", "type": "text",
             "default": "访客提问与站长的回答。", "max": 100},
            {"key": "count", "label": "显示条数", "type": "number",
             "default": 3, "min": 1, "max": 20},
        ],
    },
]


def configure_site(path):
    """把文章目录、数据文件和 git 操作都指向站点目录。"""
    global SITE, POSTS_DIR, DATA_FILE, SONGS_FILE, LAYOUT_FILE, SITE_CONFIG_FILE
    site = Path(path).expanduser().resolve()
    SITE = site
    POSTS_DIR = site / "blog" / "posts"
    DATA_FILE = site / "blog" / "posts-data.js"
    SONGS_FILE = site / "album" / "songs.js"
    LAYOUT_FILE = site / "site-layout.js"
    SITE_CONFIG_FILE = site / "site-config.js"
    return site


sys.path.insert(0, str(ROOT))
import build_blog  # noqa: E402  复用文章收集 / 生成逻辑


# ---------------------------------------------------------------- Markdown

def parse_md(text):
    """返回 (front matter 字典, 正文)。"""
    match = FRONT_MATTER.match(text)
    if not match:
        return {}, text.lstrip("\r\n")
    meta = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip().strip("\"'")
    return meta, text[match.end():].lstrip("\r\n")


def dump_md(meta, content):
    keys = [k for k in META_ORDER if k in meta]
    keys += [k for k in meta if k not in keys]
    lines = ["---"]
    for key in keys:
        value = str(meta.get(key, "")).replace("\n", " ").strip()
        lines.append(f"{key}: {value}" if value else f"{key}:")
    lines.append("---")
    body = content.strip("\r\n")
    return "\n".join(lines) + "\n\n" + (body + "\n" if body else "")


# ---------------------------------------------------------------- 文章读写

def post_source(slug):
    """slug 对应的 Markdown 文件（兼容单文件文章），不存在返回 None。"""
    if not slug or not SLUG_RE.match(slug):
        return None
    folder = POSTS_DIR / slug
    if (folder / "index.md").is_file():
        return folder / "index.md"
    single = POSTS_DIR / (slug + ".md")
    if single.is_file():
        return single
    return None


def post_info(path):
    meta, body = parse_md(path.read_text(encoding="utf-8"))
    is_folder = path.name == "index.md"
    slug = path.parent.name if is_folder else path.stem
    images = []
    if is_folder:
        img_dir = path.parent / "images"
        if img_dir.is_dir():
            images = sorted(
                p.name for p in img_dir.iterdir()
                if p.is_file() and p.suffix.lower() in IMAGE_EXTS
            )
    stamp = time.strftime("%Y-%m-%d %H:%M", time.localtime(path.stat().st_mtime))
    return {
        "slug": slug,
        "title": meta.get("title") or slug,
        "date": meta.get("date", ""),
        "created": meta.get("created", ""),
        "category": meta.get("category", ""),
        "summary": meta.get("summary", ""),
        "images": images,
        "chars": len(re.sub(r"\s+", "", body)),
        "updated": stamp,
        "path": str(path.relative_to(SITE)),
        "base": f"posts/{slug}/" if is_folder else "posts/",
        "isFolder": is_folder,
    }


def collect_posts():
    posts = []
    if not POSTS_DIR.is_dir():
        return posts
    for path in sorted(POSTS_DIR.iterdir()):
        if path.is_dir() and (path / "index.md").is_file():
            posts.append(post_info(path / "index.md"))
        elif path.is_file() and path.suffix == ".md":
            posts.append(post_info(path))
    posts.sort(key=lambda p: (p["date"], p["created"]), reverse=True)
    return posts


def data_stale(posts):
    """posts-data.js 是否落后于最新文章。"""
    if not DATA_FILE.is_file():
        return True
    built = DATA_FILE.stat().st_mtime
    for path in POSTS_DIR.rglob("*.md"):
        if path.stat().st_mtime > built:
            return True
    return False


def rebuild():
    return build_blog.write_data(POSTS_DIR, DATA_FILE)


def slugify(text):
    value = re.sub(r"[^A-Za-z0-9]+", "-", text or "").strip("-").lower()
    return value[:60]


def unique_slug(title, date):
    base = f"{date}-{slugify(title) or 'post'}"
    slug, index = base, 2
    while (POSTS_DIR / slug).exists() or (POSTS_DIR / (slug + ".md")).exists():
        slug = f"{base}-{index}"
        index += 1
    return slug


# ---------------------------------------------------------------- 歌曲

def read_songs():
    if not SONGS_FILE.is_file():
        return []
    text = SONGS_FILE.read_text(encoding="utf-8")
    match = SONGS_PATTERN.search(text)
    if not match:
        return []
    try:
        data = json.loads(match.group(1))
    except ValueError:
        return []
    return [item for item in data if isinstance(item, dict) and item.get("id")]


def write_songs(songs):
    SONGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = json.dumps(songs, ensure_ascii=False, indent=2)
    SONGS_FILE.write_text(f"window.MUSIC_SONGS = {payload};\n", encoding="utf-8")


def song_assets():
    album = SITE / "album"
    audio = []
    covers = []
    if album.is_dir():
        audio = sorted(
            p.name for p in album.iterdir()
            if p.is_file() and p.suffix.lower() in AUDIO_EXTS
        )
    cover_dir = album / "cover"
    if cover_dir.is_dir():
        covers = sorted(
            p.name for p in cover_dir.iterdir()
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS
        )
    return audio, covers


def normalize_song(payload, existing_ids):
    song_id = (payload.get("id") or "").strip() or f"song-{int(time.time())}"
    if not SLUG_RE.match(song_id):
        raise ValueError("歌曲 ID 只能包含字母、数字、- 和 _")
    if song_id in existing_ids:
        raise ValueError("歌曲 ID 已存在")

    title = (payload.get("title") or "").strip()
    artist = (payload.get("artist") or "").strip()
    if not title:
        raise ValueError("歌名不能为空")
    if not artist:
        raise ValueError("歌手不能为空")

    file_name = Path((payload.get("file") or "").strip()).name
    if not file_name or Path(file_name).suffix.lower() not in AUDIO_EXTS:
        raise ValueError("请选择 mp3 / ogg / wav / m4a / flac / aac 音频")
    if not (SITE / "album" / file_name).is_file():
        raise ValueError("音频文件不存在，请先上传")

    cover_name = Path((payload.get("cover") or "").strip()).name
    if not cover_name or Path(cover_name).suffix.lower() not in IMAGE_EXTS:
        raise ValueError("请选择 jpg / png / webp 等封面图片")
    if not (SITE / "album" / "cover" / cover_name).is_file():
        raise ValueError("封面文件不存在，请先上传")

    return {
        "id": song_id,
        "title": title,
        "artist": artist,
        "file": file_name,
        "cover": f"album/cover/{cover_name}",
    }


# ---------------------------------------------------------------- ID3

def synchsafe(raw):
    value = 0
    for byte in raw:
        value = (value << 7) | (byte & 0x7F)
    return value


def decode_id3_text(raw, encoding):
    codecs = {0: "latin-1", 1: "utf-16", 2: "utf-16-be", 3: "utf-8"}
    try:
        text = raw.decode(codecs.get(encoding, "utf-8"), "replace")
    except LookupError:
        return ""
    return text.replace("\x00", "").strip()


def parse_apic(content, legacy=False):
    """解析 APIC/PIC 帧，返回 (图片字节, 扩展名)。"""
    if not content:
        return None
    encoding = content[0]
    rest = content[1:]
    if legacy:
        mime = rest[:3].decode("latin-1", "replace").lower()
        rest = rest[3:]
    else:
        end = rest.find(b"\x00")
        if end < 0:
            return None
        mime = rest[:end].decode("latin-1", "replace").lower()
        rest = rest[end + 1:]
    if not rest:
        return None
    rest = rest[1:]  # 跳过图片类型
    if encoding in (1, 2):
        end = rest.find(b"\x00\x00")
        rest = rest[end + 2:] if end >= 0 else b""
    else:
        end = rest.find(b"\x00")
        rest = rest[end + 1:] if end >= 0 else b""
    image = rest
    if not image:
        return None
    if image[:3] == b"\xff\xd8\xff":
        return image, ".jpg"
    if image[:8] == b"\x89PNG\r\n\x1a\n":
        return image, ".png"
    if "png" in mime:
        return image, ".png"
    if "jpeg" in mime or "jpg" in mime:
        return image, ".jpg"
    if "webp" in mime:
        return image, ".webp"
    return None


def read_id3(data):
    """从 MP3 的 ID3v2 标签提取 (标题, 歌手, (封面字节, 扩展名))。"""
    if len(data) < 10 or data[:3] != b"ID3":
        return "", "", None
    major = data[3]
    flags = data[5]
    size = synchsafe(data[6:10])
    body = data[10:10 + size]
    pos = 0
    if flags & 0x40 and len(body) >= 4:
        pos = synchsafe(body[:4]) if major >= 4 else int.from_bytes(body[:4], "big") + 4

    title = artist = ""
    cover = None
    while pos < len(body):
        if major == 2:
            if pos + 6 > len(body):
                break
            frame_id = body[pos:pos + 3]
            frame_size = int.from_bytes(body[pos + 3:pos + 6], "big")
            header = 6
        else:
            if pos + 10 > len(body):
                break
            frame_id = body[pos:pos + 4]
            frame_size = (
                synchsafe(body[pos + 4:pos + 8])
                if major >= 4
                else int.from_bytes(body[pos + 4:pos + 8], "big")
            )
            header = 10
        if not frame_id or frame_id[0:1] == b"\x00" or frame_size <= 0:
            break
        content = body[pos + header:pos + header + frame_size]
        if frame_id == b"TIT2":
            title = decode_id3_text(content[1:], content[0] if content else 0)
        elif frame_id == b"TPE1":
            artist = decode_id3_text(content[1:], content[0] if content else 0)
        elif frame_id in (b"APIC", b"PIC"):
            picture = parse_apic(content, frame_id == b"PIC")
            if picture and not cover:
                cover = picture
        pos += header + frame_size
    return title, artist, cover


# ---------------------------------------------------------------- 首页板块

def _layout_defaults():
    """返回 {id: {label, enabled, fields}} 的目录副本。"""
    out = {}
    for module in LAYOUT_CATALOG:
        out[module["id"]] = {
            "label": module["label"],
            "enabled": module.get("enabled", True),
            "fields": [dict(field) for field in module.get("fields", [])],
        }
    return out


def _coerce_field(field, value):
    """把字段值规整为合法值（类型 / 长度 / 上下限）。"""
    ftype = field.get("type")
    if ftype == "number":
        try:
            number = int(value)
        except (TypeError, ValueError):
            number = int(field.get("default", 0) or 0)
        number = max(int(field.get("min", 0)), min(number, int(field.get("max", 1000))))
        return number
    text = str(value or "").strip()
    if not text and field.get("default"):
        text = str(field["default"])
    return text[: int(field.get("max", 500))]


def read_layout():
    """读取 site-layout.js，缺失或损坏时回退到默认值。"""
    catalog = _layout_defaults()
    saved_list = []
    if LAYOUT_FILE.is_file():
        match = LAYOUT_PATTERN.search(LAYOUT_FILE.read_text(encoding="utf-8"))
        if match:
            try:
                saved_list = json.loads(match.group(1)).get("modules") or []
            except ValueError:
                saved_list = []
    saved = {
        item["id"]: item
        for item in saved_list
        if isinstance(item, dict) and item.get("id")
    }

    def build(module_id):
        spec = catalog[module_id]
        item = saved.get(module_id, {})
        module = {
            "id": module_id,
            "label": spec["label"],
            "enabled": item.get("enabled", spec["enabled"]) is not False,
        }
        for field in spec["fields"]:
            key = field["key"]
            value = item.get(key) if key in item else field.get("default")
            module[key] = _coerce_field(field, value)
        module["fields"] = spec["fields"]
        return module

    ordered = []
    seen = set()
    for item in saved_list:
        module_id = item.get("id") if isinstance(item, dict) else None
        if module_id in catalog and module_id not in seen:
            ordered.append(build(module_id))
            seen.add(module_id)
    for module_id in catalog:
        if module_id not in seen:
            ordered.append(build(module_id))
    return ordered


def write_layout(payload):
    """校验并写入首页板块配置。"""
    incoming = payload.get("modules")
    if not isinstance(incoming, list):
        raise ValueError("缺少板块列表")

    catalog = _layout_defaults()
    seen = set()
    modules = []
    for item in incoming:
        if not isinstance(item, dict):
            continue
        module_id = item.get("id")
        if module_id not in catalog or module_id in seen:
            continue
        seen.add(module_id)
        spec = catalog[module_id]
        module = {"id": module_id, "enabled": item.get("enabled") is not False}
        for field in spec["fields"]:
            key = field["key"]
            module[key] = _coerce_field(field, item.get(key))
        modules.append(module)

    if not modules:
        raise ValueError("板块列表为空")

    LAYOUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps({"modules": modules}, ensure_ascii=False, indent=2)
    LAYOUT_FILE.write_text(f"window.SITE_LAYOUT = {text};\n", encoding="utf-8")
    return read_layout()


# ---------------------------------------------------------------- 站点配置

SITE_CONFIG_DEFAULTS = {
    "brand": "我的个人站",
    "brandSub": "PERSONAL / SITE",
    "nav": [
        {"id": "blog", "label": "个人博客"},
        {"id": "qa", "label": "问答区"},
        {"id": "music", "label": "音乐专辑"},
        {"id": "dev", "label": "开发者"},
    ],
    "footer": {
        "copyright": f"© {time.strftime('%Y')} 我的个人站",
        "about": "关于",
        "aboutUrl": "personal/index.html",
        "github": "GitHub",
        "githubUrl": "https://github.com/",
        "contact": "联系",
        "contactUrl": "mailto:",
    },
    "welcome": {"title": "我的个人站", "subtitle": "记录技术、音乐与生活。"},
    "music": {"title": "音乐专辑",
              "description": "收录喜欢的歌曲与旋律。"},
}


def _coerce_text(value, default="", maxlen=100):
    text = str(value or "").strip()
    if not text:
        text = default
    return text[:maxlen]


def read_site_config():
    """读取 site-config.js，缺失或损坏时回退到默认值。"""
    config = json.loads(json.dumps(SITE_CONFIG_DEFAULTS))
    if SITE_CONFIG_FILE.is_file():
        match = SITE_CONFIG_PATTERN.search(SITE_CONFIG_FILE.read_text(encoding="utf-8"))
        if match:
            try:
                saved = json.loads(match.group(1))
            except ValueError:
                saved = {}
            if isinstance(saved, dict):
                config["brand"] = _coerce_text(saved.get("brand"), config["brand"], 60)
                config["brandSub"] = _coerce_text(saved.get("brandSub"), config["brandSub"], 80)
                nav = saved.get("nav")
                if isinstance(nav, list) and nav:
                    config["nav"] = [
                        {"id": _coerce_text(item.get("id"), "", 30),
                         "label": _coerce_text(item.get("label"), "", 30)}
                        for item in nav if isinstance(item, dict) and item.get("label")
                    ]
                footer = saved.get("footer")
                if isinstance(footer, dict):
                    for key in config["footer"]:
                        if key in footer:
                            config["footer"][key] = _coerce_text(
                                footer[key], config["footer"][key], 200)
                welcome = saved.get("welcome")
                if isinstance(welcome, dict):
                    config["welcome"]["title"] = _coerce_text(
                        welcome.get("title"), config["welcome"]["title"], 40)
                    config["welcome"]["subtitle"] = _coerce_text(
                        welcome.get("subtitle"), config["welcome"]["subtitle"], 60)
                music = saved.get("music")
                if isinstance(music, dict):
                    config["music"]["title"] = _coerce_text(
                        music.get("title"), config["music"]["title"], 40)
                    config["music"]["description"] = _coerce_text(
                        music.get("description"), config["music"]["description"], 200)
    return config


def write_site_config(payload):
    """校验并写入站点配置。"""
    config = read_site_config()
    if not isinstance(payload, dict):
        raise ValueError("配置格式错误")

    if "brand" in payload:
        config["brand"] = _coerce_text(payload["brand"], config["brand"], 60)
    if "brandSub" in payload:
        config["brandSub"] = _coerce_text(payload["brandSub"], config["brandSub"], 80)

    nav = payload.get("nav")
    if isinstance(nav, list):
        cleaned = []
        for item in nav:
            if isinstance(item, dict) and item.get("label"):
                cleaned.append({
                    "id": _coerce_text(item.get("id"), "", 30),
                    "label": _coerce_text(item["label"], "", 30),
                })
        if cleaned:
            config["nav"] = cleaned

    footer = payload.get("footer")
    if isinstance(footer, dict):
        for key in config["footer"]:
            if key in footer:
                config["footer"][key] = _coerce_text(
                    footer[key], config["footer"][key], 200)

    welcome = payload.get("welcome")
    if isinstance(welcome, dict):
        if "title" in welcome:
            config["welcome"]["title"] = _coerce_text(welcome["title"], config["welcome"]["title"], 40)
        if "subtitle" in welcome:
            config["welcome"]["subtitle"] = _coerce_text(welcome["subtitle"], config["welcome"]["subtitle"], 60)

    music = payload.get("music")
    if isinstance(music, dict):
        if "title" in music:
            config["music"]["title"] = _coerce_text(music["title"], config["music"]["title"], 40)
        if "description" in music:
            config["music"]["description"] = _coerce_text(
                music["description"], config["music"]["description"], 200)

    SITE_CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(config, ensure_ascii=False, indent=2)
    SITE_CONFIG_FILE.write_text(f"window.SITE_CONFIG = {text};\n", encoding="utf-8")
    return config


# ---------------------------------------------------------------- 问答配置

def _read_config_file():
    if not CONFIG_FILE.is_file():
        return {}
    try:
        data = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return {}
    return data if isinstance(data, dict) else {}


def remember_site(path):
    """记住上次使用的站点目录，下次启动自动打开。"""
    data = _read_config_file()
    data["lastSite"] = str(path)
    CONFIG_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    try:
        os.chmod(CONFIG_FILE, 0o600)
    except OSError:
        pass


def last_site():
    return str(_read_config_file().get("lastSite") or "").strip()


def load_config():
    """问答连接配置按站点隔离，换站点后不会串用上一个站点的令牌。"""
    config = {"qaUrl": "", "qaToken": "", "site": str(SITE)}
    data = _read_config_file()
    if data.get("site") == str(SITE):
        config["qaUrl"] = str(data.get("qaUrl") or "").strip().rstrip("/")
        config["qaToken"] = str(data.get("qaToken") or "").strip()
    return config


def save_config(payload):
    config = load_config()
    url = str(payload.get("qaUrl") or config["qaUrl"]).strip().rstrip("/")
    if url and not re.match(r"^https?://", url):
        raise ValueError("站点地址必须以 http:// 或 https:// 开头")
    token = str(payload.get("qaToken") or "").strip()
    if token:
        config["qaToken"] = token
    config["qaUrl"] = url
    config["site"] = str(SITE)
    data = _read_config_file()
    data.update(config)
    CONFIG_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    try:
        os.chmod(CONFIG_FILE, 0o600)
    except OSError:
        pass
    return config


def qa_request(method, path, payload=None):
    config = load_config()
    if not config["qaToken"]:
        return None, "请先在问答设置中填写管理令牌"
    url = config["qaUrl"].rstrip("/") + path
    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "x-qa-token": config["qaToken"],
            "User-Agent": "mcr-studio/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
        return json.loads(raw), ""
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", "replace")
        try:
            data = json.loads(raw)
            message = data.get("error") or raw
        except ValueError:
            message = raw or f"HTTP {exc.code}"
        return None, message
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return None, f"无法连接站点：{exc}"
    except ValueError as exc:
        return None, f"站点返回的不是 JSON：{exc}"


# ---------------------------------------------------------------- 建站

TEMPLATE_TEXT_EXTS = {".html", ".js", ".json", ".css", ".svg", ".md", ".txt"}


def site_status():
    url, remote = "", ""
    code, _, _ = git("rev-parse", "--is-inside-work-tree")
    is_repo = code == 0
    branch = ""
    if is_repo:
        _, branch, _ = git("rev-parse", "--abbrev-ref", "HEAD")
        code, remote, _ = git("remote", "get-url", "origin")
        if code != 0:
            remote = ""
        if remote:
            url = re.sub(r"^git@github\.com:", "https://github.com/", remote)
            url = re.sub(r"\.git$", "", url)
    return {
        "path": str(SITE),
        "exists": (SITE / "index.html").is_file(),
        "isRepo": is_repo,
        "branch": branch,
        "remote": remote,
        "url": url,
    }


def _clean_url(value, prefix, fallback):
    text = str(value or "").strip()
    if not text:
        return fallback
    if not text.startswith(prefix):
        raise ValueError(f"链接需要以 {prefix} 开头")
    return text[:200]


def _git_identity():
    """没有全局 git 身份时，尽量用 gh 登录账号作为提交者。"""
    name = email = ""
    try:
        name = subprocess.check_output(
            ["gh", "api", "user", "-q", ".login"], text=True, timeout=10
        ).strip()
        login = name
        if login:
            email = f"{login}@users.noreply.github.com"
    except (OSError, subprocess.SubprocessError):
        pass
    return name or "Personal Site", email or "personal-site@users.noreply.github.com"


def init_git(target, repo_url):
    """站点首次部署：初始化 main 分支、配置远程仓库并提交首版。"""
    if not repo_url:
        return []
    logs = []
    code, _, err = git("rev-parse", "--is-inside-work-tree")
    if code != 0:
        code, out, err = git("init", "-b", "main")
        if code != 0:
            # 老版本 git 不支持 -b
            git("init")
            git("checkout", "-b", "main")
    code, _, _ = git("config", "user.name")
    if code != 0:
        name, email = _git_identity()
        git("config", "user.name", name)
        git("config", "user.email", email)
    if repo_url:
        code, _, _ = git("remote", "get-url", "origin")
        if code == 0:
            git("remote", "set-url", "origin", repo_url)
        else:
            git("remote", "add", "origin", repo_url)
        logs.append(f"已设置远程仓库：{repo_url}")
    git("add", "-A")
    code, out, err = git("commit", "-m", "初始化个人站点")
    if code == 0:
        logs.append("已创建首个提交")
    return logs


def scaffold_site(payload):
    """按向导参数把内置模板渲染到目标目录。"""
    raw_path = str(payload.get("path") or "").strip()
    target = Path(raw_path).expanduser().resolve() if raw_path else SITE
    if not TEMPLATE_DIR.is_dir():
        raise ValueError("找不到内置模板 template/，请确认建站台文件完整")
    if target.exists():
        if not target.is_dir():
            raise ValueError("目标路径不是文件夹")
        if any(target.iterdir()):
            raise ValueError("目标目录不是空的，请换一个空目录")

    name = str(payload.get("name") or "").strip()[:40]
    if not name:
        raise ValueError("站点名称不能为空")
    subtitle = str(payload.get("subtitle") or "").strip()[:80] or "PERSONAL SITE"
    author = str(payload.get("author") or "").strip()[:40] or name
    intro = str(payload.get("intro") or "").strip()[:500] or "记录技术、音乐与生活的地方。"
    welcome = str(payload.get("welcome") or "").strip()[:60] or "欢迎来到我的个人站。"
    github = _clean_url(payload.get("githubUrl"), "http", "https://github.com/")
    contact = str(payload.get("contact") or "").strip()[:200]
    if contact and not contact.startswith("mailto:"):
        contact = "mailto:" + contact
    contact = contact or "mailto:"
    repo = str(payload.get("repoUrl") or "").strip()[:300]
    if repo and not re.match(r"^(https://|git@)", repo):
        raise ValueError("仓库地址需要是 https:// 或 git@ 开头")

    values = {
        "SITE_NAME": name,
        "SITE_BRAND_SUB": subtitle,
        "SITE_INTRO": intro,
        "AUTHOR": author,
        "WELCOME_SUBTITLE": welcome,
        "GITHUB_URL": github,
        "CONTACT_URL": contact,
        "YEAR": time.strftime("%Y"),
    }

    target.mkdir(parents=True, exist_ok=True)
    for src in TEMPLATE_DIR.rglob("*"):
        if not src.is_file():
            continue
        dest = target / src.relative_to(TEMPLATE_DIR)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix.lower() in TEMPLATE_TEXT_EXTS:
            text = src.read_text(encoding="utf-8")
            for key, value in values.items():
                text = text.replace("{{" + key + "}}", value)
            dest.write_text(text, encoding="utf-8")
        else:
            shutil.copy2(src, dest)

    gitignore = target / ".gitignore"
    if not gitignore.exists():
        gitignore.write_text(".DS_Store\n*.log\n", encoding="utf-8")

    configure_site(target)
    POSTS_DIR.mkdir(parents=True, exist_ok=True)
    remember_site(target)
    logs = [f"站点已创建：{target}"]
    logs += init_git(target, repo)
    return {"site": site_status(), "logs": logs}


def set_remote(url):
    url = str(url or "").strip()[:300]
    if not url:
        raise ValueError("仓库地址不能为空")
    if not re.match(r"^(https://|git@)", url):
        raise ValueError("仓库地址需要是 https:// 或 git@ 开头")
    init_git(SITE, url)
    code, remote, _ = git("remote", "get-url", "origin")
    if code != 0 or remote.strip() != url:
        raise ValueError("远程仓库设置失败，请检查目录权限")
    return site_status()


# ---------------------------------------------------------------- git

def git(*args, timeout=60, strip=True):
    # 禁止 git 向上查找父仓库，避免把站点所在的上层仓库误当成站点仓库
    env = os.environ.copy()
    env["GIT_CEILING_DIRECTORIES"] = str(SITE.parent)
    try:
        proc = subprocess.run(
            ["git", "-c", "core.quotepath=false", *args],
            cwd=str(SITE), capture_output=True, text=True, timeout=timeout,
            env=env,
        )
        out = proc.stdout or ""
        err = proc.stderr or ""
        return proc.returncode, (out.strip() if strip else out), err.strip()
    except FileNotFoundError:
        return 1, "", "未安装 git"
    except OSError as exc:
        return 1, "", f"无法进入站点目录：{exc}"
    except subprocess.TimeoutExpired:
        return 1, "", "git 命令执行超时"


def parse_status(raw):
    changes = []
    for line in raw.splitlines():
        if len(line) > 3:
            changes.append({"status": line[:2].strip(), "path": line[3:]})
    return changes


def git_status():
    code, _, _ = git("rev-parse", "--is-inside-work-tree")
    if code != 0:
        return {
            "ok": False, "error": "站点还不是 git 仓库",
            "changes": [], "blogChanges": [], "otherCount": 0,
            **site_status(),
        }
    _, branch, _ = git("rev-parse", "--abbrev-ref", "HEAD")
    _, last, _ = git("log", "-1", "--pretty=%h %s")
    _, raw, _ = git("status", "--porcelain=v1", strip=False)
    changes = parse_status(raw)
    _, blog_raw, _ = git(
        "status", "--porcelain=v1", "--", *PUBLISH_PATHS, strip=False
    )
    blog_changes = parse_status(blog_raw)
    return {
        "ok": True,
        "branch": branch,
        "lastCommit": last,
        "changes": changes,
        "blogChanges": blog_changes,
        "otherCount": max(0, len(changes) - len(blog_changes)),
        **site_status(),
    }


def publish(message, scope="blog"):
    """scope=blog 只提交 blog/；songs 提交 album/ 与 music.html；all 提交整个站点。"""
    message = (message or "").strip() or f"更新博客 {time.strftime('%Y-%m-%d %H:%M')}"
    scope = scope if scope in PUBLISH_SCOPES else "blog"
    paths = PUBLISH_SCOPES[scope]
    label = {"blog": "博客", "songs": "歌曲", "layout": "首页", "site": "站点", "all": "全站"}[scope]
    logs = []

    code, _, _ = git("rev-parse", "--is-inside-work-tree")
    if code != 0:
        return {
            "ok": False, "logs": logs,
            "error": "站点还不是 git 仓库。请先在「站点」页填写 GitHub 仓库地址并保存，再重新发布。",
        }

    if scope in ("blog", "all"):
        count = rebuild()
        logs.append(f"已重新生成 posts-data.js（{count} 篇文章）")

    add_args = ["add", "-A"] + (["--"] + paths if paths else [])
    code, out, err = git(*add_args)
    if code != 0:
        return {"ok": False, "logs": logs, "error": err or out}
    logs.append(f"已暂存{label}改动")

    check_args = ["diff", "--cached", "--quiet"] + (["--"] + paths if paths else [])
    code, _, _ = git(*check_args)
    if code == 1:
        commit_args = ["commit", "-m", message] + (["--"] + paths if paths else [])
        code, out, err = git(*commit_args)
        text = (out + "\n" + err).strip()
        if code == 0:
            logs.append(out.splitlines()[0] if out else "已提交")
        elif "nothing to commit" in text or "无文件要提交" in text:
            logs.append("没有新的改动需要提交")
        else:
            return {"ok": False, "logs": logs, "error": text}
    elif code == 0:
        logs.append(f"{label}没有新的改动需要提交")
    else:
        return {"ok": False, "logs": logs, "error": "无法读取 git 暂存区"}

    code, remote, _ = git("remote", "get-url", "origin")
    if code != 0 or not remote:
        logs.append("尚未配置远程仓库")
        return {
            "ok": False, "logs": logs,
            "error": "尚未配置远程仓库。请先在「站点」页填写 GitHub 仓库地址并保存，再发布。",
        }

    code, ahead, _ = git("rev-list", "--count", "@{u}..HEAD")
    first_push = code != 0
    if not first_push and ahead.isdigit() and int(ahead) == 0:
        logs.append("远程已是最新，无需推送")
        return {"ok": True, "logs": logs}
    if not first_push and ahead.isdigit():
        logs.append(f"待推送本地提交 {ahead} 个")

    if first_push:
        logs.append("首次推送，正在建立 main 分支跟踪…")
        code, out, err = git("push", "-u", "origin", "HEAD", timeout=180)
    else:
        code, out, err = git("push", timeout=180)
    text = (out + "\n" + err).strip()
    if code != 0:
        logs.append(text)
        if "403" in text or "Write access to repository not granted" in text:
            return {
                "ok": False, "logs": logs,
                "error": (
                    "GitHub 拒绝推送（403）。请先在终端执行 gh auth status "
                    "确认 gh 已登录，再重启建站台后重试。"
                ),
            }
        return {"ok": False, "logs": logs, "error": text or "git push 失败"}
    logs.append(text or "已推送到远程仓库")
    return {"ok": True, "logs": logs}


# ---------------------------------------------------------------- HTTP

class Handler(SimpleHTTPRequestHandler):
    server_version = "SiteStudio/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def log_message(self, fmt, *args):
        sys.stdout.write("[studio] " + (fmt % args) + "\n")

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # -- 工具 ------------------------------------------------------------

    def send_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def fail(self, message, status=400):
        self.send_json({"ok": False, "error": message}, status)

    def read_json(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b""
        try:
            return json.loads(raw.decode("utf-8")) if raw else {}
        except (ValueError, UnicodeDecodeError):
            return {}

    def translate_path(self, path):
        clean = urllib.parse.urlsplit(path).path
        parts = [p for p in clean.split("/") if p]
        if any(part.startswith(".") or part == ".." for part in parts):
            return str(SITE / "__blocked__")
        if parts and parts[0] == "studio":
            if len(parts) == 1:
                return str(STUDIO_DIR / "index.html")
            # 建站台界面留在 studio/，其余静态文件一律取站点目录
            return str(STUDIO_DIR.joinpath(*parts[1:]))
        if not parts:
            return str(SITE / "index.html")
        return str(SITE.joinpath(*parts))

    # -- 路由 ------------------------------------------------------------

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        route = parsed.path
        if route.startswith("/api/"):
            return self.api_get(route, urllib.parse.parse_qs(parsed.query))
        if route in ("", "/", "/studio"):
            self.send_response(302)
            self.send_header("Location", "/studio/")
            self.end_headers()
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlsplit(self.path)
        if not parsed.path.startswith("/api/"):
            return self.fail("接口不存在", 404)
        return self.api_post(parsed.path, urllib.parse.parse_qs(parsed.query))

    def api_get(self, route, query):
        if route == "/api/site":
            return self.send_json({"ok": True, **site_status()})

        if route == "/api/posts":
            posts = collect_posts()
            return self.send_json({
                "ok": True,
                "posts": posts,
                "stale": data_stale(posts),
                "built": time.strftime(
                    "%Y-%m-%d %H:%M", time.localtime(DATA_FILE.stat().st_mtime)
                ) if DATA_FILE.is_file() else "",
            })

        if route == "/api/post":
            slug = (query.get("slug") or [""])[0]
            source = post_source(slug)
            if not source:
                return self.fail("文章不存在", 404)
            info = post_info(source)
            meta, content = parse_md(source.read_text(encoding="utf-8"))
            images = [
                {
                    "name": name,
                    "url": f"/blog/posts/{slug}/images/{urllib.parse.quote(name)}",
                }
                for name in info["images"]
            ]
            return self.send_json({
                "ok": True, "post": info, "meta": meta, "content": content, "images": images
            })

        if route == "/api/status":
            return self.send_json({"ok": True, **git_status()})

        if route == "/api/songs":
            audio, covers = song_assets()
            return self.send_json({
                "ok": True, "songs": read_songs(),
                "audioFiles": audio, "coverFiles": covers,
            })

        if route == "/api/layout":
            return self.send_json({
                "ok": True, "modules": read_layout(),
                "file": str(LAYOUT_FILE.relative_to(SITE)),
            })

        if route == "/api/site-config":
            return self.send_json({
                "ok": True, "config": read_site_config(),
                "file": str(SITE_CONFIG_FILE.relative_to(SITE)),
            })

        if route == "/api/qa/config":
            config = load_config()
            return self.send_json({
                "ok": True, "url": config["qaUrl"],
                "hasToken": bool(config["qaToken"]),
            })

        if route == "/api/qa":
            data, error = qa_request("GET", "/api/qa?admin=1")
            if error:
                return self.send_json({"ok": False, "error": error}, 502)
            return self.send_json(data)

        return self.fail("接口不存在", 404)

    def api_post(self, route, query):
        if route == "/api/site/init":
            try:
                result = scaffold_site(self.read_json())
            except (ValueError, OSError, shutil.Error) as exc:
                return self.fail(str(exc), 400)
            return self.send_json({"ok": True, **result})
        if route == "/api/site/remote":
            try:
                status = set_remote((self.read_json() or {}).get("url"))
            except (ValueError, OSError) as exc:
                return self.fail(str(exc), 400)
            return self.send_json({"ok": True, **status})
        if route == "/api/post/create":
            return self.create_post(self.read_json())
        if route == "/api/post/save":
            slug = (query.get("slug") or [""])[0]
            return self.save_post(slug, self.read_json())
        if route == "/api/post/delete":
            slug = (query.get("slug") or [""])[0]
            return self.delete_post(slug)
        if route == "/api/upload":
            slug = (query.get("slug") or [""])[0]
            name = (query.get("name") or ["image"])[0]
            return self.upload(slug, name)
        if route == "/api/build":
            try:
                count = rebuild()
            except Exception as exc:  # noqa: BLE001
                return self.fail(f"生成失败：{exc}", 500)
            return self.send_json({"ok": True, "count": count})
        if route == "/api/publish":
            payload = self.read_json()
            if payload.get("confirm") is not True:
                return self.fail("发布需要手动确认", 403)
            result = publish(payload.get("message", ""), payload.get("scope", "blog"))
            return self.send_json(result, 200 if result.get("ok") else 500)
        if route == "/api/reveal":
            slug = (query.get("slug") or [""])[0]
            source = post_source(slug)
            if not source:
                return self.fail("文章不存在", 404)
            if sys.platform != "darwin":
                return self.fail("仅支持 macOS 上打开 Finder")
            subprocess.run(["open", str(source.parent)], check=False)
            return self.send_json({"ok": True})
        if route == "/api/songs/add":
            return self.add_song(self.read_json())
        if route == "/api/layout":
            try:
                modules = write_layout(self.read_json())
            except (ValueError, OSError) as exc:
                return self.fail(str(exc), 400)
            return self.send_json({"ok": True, "modules": modules})
        if route == "/api/site-config":
            try:
                config = write_site_config(self.read_json())
            except (ValueError, OSError) as exc:
                return self.fail(str(exc), 400)
            return self.send_json({"ok": True, "config": config})
        if route == "/api/songs/reorder":
            return self.reorder_songs(self.read_json())
        if route == "/api/song/upload":
            kind = (query.get("kind") or [""])[0]
            name = (query.get("name") or ["upload"])[0]
            return self.upload_song(kind, name)
        if route == "/api/qa/config":
            try:
                config = save_config(self.read_json())
            except (ValueError, OSError) as exc:
                return self.fail(str(exc))
            return self.send_json({
                "ok": True, "url": config["qaUrl"],
                "hasToken": bool(config["qaToken"]),
            })
        if route == "/api/qa/answer":
            payload = self.read_json()
            data, error = qa_request("POST", "/api/qa", {
                "action": "answer",
                "id": payload.get("id", ""),
                "answer": payload.get("answer", ""),
            })
            if error:
                return self.send_json({"ok": False, "error": error}, 502)
            return self.send_json(data)
        if route == "/api/qa/delete":
            payload = self.read_json()
            data, error = qa_request("POST", "/api/qa", {
                "action": "delete",
                "id": payload.get("id", ""),
            })
            if error:
                return self.send_json({"ok": False, "error": error}, 502)
            return self.send_json(data)
        return self.fail("接口不存在", 404)

    # -- 业务 ------------------------------------------------------------

    def create_post(self, payload):
        title = (payload.get("title") or "").strip()
        if not title:
            return self.fail("标题不能为空")
        date = (payload.get("date") or "").strip() or time.strftime("%Y-%m-%d")
        if not DATE_RE.match(date):
            return self.fail("日期格式应为 YYYY-MM-DD")
        slug = (payload.get("slug") or "").strip()
        if slug:
            if not SLUG_RE.match(slug):
                return self.fail("目录名只能包含字母、数字、- 和 _")
            if post_source(slug) or (POSTS_DIR / slug).exists():
                return self.fail("该目录名已存在", 409)
        else:
            slug = unique_slug(title, date)

        folder = POSTS_DIR / slug
        folder.mkdir(parents=True, exist_ok=True)
        meta = {
            "title": title,
            "date": date,
            "created": time.strftime("%Y-%m-%d %H:%M"),
            "category": (payload.get("category") or "").strip(),
            "summary": (payload.get("summary") or "").strip(),
        }
        (folder / "index.md").write_text(dump_md(meta, ""), encoding="utf-8")
        count = rebuild()
        return self.send_json({"ok": True, "slug": slug, "built": count})

    def save_post(self, slug, payload):
        source = post_source(slug)
        if not source:
            return self.fail("文章不存在", 404)
        title = (payload.get("title") or "").strip()
        if not title:
            return self.fail("标题不能为空")
        date = (payload.get("date") or "").strip() or time.strftime("%Y-%m-%d")
        if not DATE_RE.match(date):
            return self.fail("日期格式应为 YYYY-MM-DD")

        meta, _ = parse_md(source.read_text(encoding="utf-8"))
        meta.update({
            "title": title,
            "date": date,
            "created": meta.get("created") or time.strftime("%Y-%m-%d %H:%M"),
            "category": (payload.get("category") or "").strip(),
            "summary": (payload.get("summary") or "").strip(),
        })
        source.write_text(dump_md(meta, payload.get("content") or ""), encoding="utf-8")
        count = rebuild()
        return self.send_json({
            "ok": True, "built": count, "post": post_info(source),
            "stale": data_stale(collect_posts()),
        })

    def delete_post(self, slug):
        source = post_source(slug)
        if not source:
            return self.fail("文章不存在", 404)
        if source.name == "index.md":
            shutil.rmtree(source.parent)
        else:
            source.unlink()
        count = rebuild()
        return self.send_json({"ok": True, "built": count})

    def upload(self, slug, raw_name):
        source = post_source(slug)
        if not source or source.name != "index.md":
            return self.fail("请先保存文章，再上传图片", 409)

        name = urllib.parse.unquote(raw_name or "image").strip()
        suffix = Path(name).suffix.lower()
        if suffix not in IMAGE_EXTS:
            return self.fail("只支持 png / jpg / gif / webp / svg / avif 图片")
        stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(name).stem).strip("-._") or "image"
        filename = f"{stem}{suffix}"

        img_dir = source.parent / "images"
        img_dir.mkdir(parents=True, exist_ok=True)
        target = img_dir / filename
        index = 2
        while target.exists():
            target = img_dir / f"{stem}-{index}{suffix}"
            index += 1

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return self.fail("文件内容为空")
        if length > MAX_UPLOAD:
            return self.fail("图片超过 20MB，请压缩后再上传", 413)
        data = self.rfile.read(length)
        target.write_bytes(data)

        relative = f"images/{target.name}"
        return self.send_json({
            "ok": True,
            "name": target.name,
            "markdown": f"![{Path(target.name).stem}]({relative})",
            "url": f"/blog/posts/{slug}/{relative}",
            "size": len(data),
        })

    def add_song(self, payload):
        songs = read_songs()
        try:
            song = normalize_song(payload, {item.get("id") for item in songs})
        except ValueError as exc:
            return self.fail(str(exc))
        songs.append(song)
        write_songs(songs)
        audio, covers = song_assets()
        return self.send_json({
            "ok": True, "song": song, "songs": songs,
            "audioFiles": audio, "coverFiles": covers,
        })

    def reorder_songs(self, payload):
        ids = payload.get("ids")
        if not isinstance(ids, list) or not all(isinstance(item, str) for item in ids):
            return self.fail("排序数据格式错误")
        songs = read_songs()
        mapping = {item.get("id"): item for item in songs}
        if len(ids) != len(mapping) or set(ids) != set(mapping):
            return self.fail("排序列表与现有歌曲不一致", 409)
        ordered = [mapping[item] for item in ids]
        write_songs(ordered)
        return self.send_json({"ok": True, "songs": ordered})

    def upload_song(self, kind, raw_name):
        name = urllib.parse.unquote(raw_name or "upload").strip()
        suffix = Path(name).suffix.lower()
        if kind == "audio":
            if suffix != ".mp3":
                return self.fail("请选择 mp3 文件")
            target_dir = SITE / "album"
            max_size = MAX_AUDIO_UPLOAD
            fallback = "audio"
        elif kind == "cover":
            if suffix not in IMAGE_EXTS:
                return self.fail("只支持 png / jpg / gif / webp / svg / avif 图片")
            target_dir = SITE / "album" / "cover"
            max_size = MAX_UPLOAD
            fallback = "cover"
        else:
            return self.fail("上传类型不正确")

        stem = re.sub(r"[^\w.-]+", "-", Path(name).stem).strip("-._") or fallback
        target_dir.mkdir(parents=True, exist_ok=True)
        target = target_dir / f"{stem}{suffix}"
        index = 2
        while target.exists():
            target = target_dir / f"{stem}-{index}{suffix}"
            index += 1

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return self.fail("文件内容为空")
        if length > max_size:
            limit = "100MB" if kind == "audio" else "20MB"
            return self.fail(f"文件超过 {limit}，请压缩后再上传", 413)
        data = self.rfile.read(length)
        target.write_bytes(data)

        if kind == "audio":
            title, artist, picture = read_id3(data)
            cover_name = ""
            if picture:
                image, ext = picture
                cover_dir = SITE / "album" / "cover"
                cover_dir.mkdir(parents=True, exist_ok=True)
                target_cover = cover_dir / f"{stem}-cover{ext}"
                index = 2
                while target_cover.exists():
                    target_cover = cover_dir / f"{stem}-cover-{index}{ext}"
                    index += 1
                target_cover.write_bytes(image)
                cover_name = target_cover.name
            return self.send_json({
                "ok": True, "kind": "audio", "name": target.name,
                "file": target.name,
                "url": f"/album/{urllib.parse.quote(target.name)}",
                "title": title or Path(name).stem,
                "artist": artist,
                "cover": cover_name,
                "coverUrl": f"/album/cover/{urllib.parse.quote(cover_name)}" if cover_name else "",
                "size": len(data),
            })
        return self.send_json({
            "ok": True, "kind": "cover", "name": target.name,
            "cover": f"album/cover/{target.name}",
            "url": f"/album/cover/{urllib.parse.quote(target.name)}",
            "size": len(data),
        })

    # 兼容 PUT（前端统一用 POST，这里不放开）


def main():
    parser = argparse.ArgumentParser(description="个人站建站台")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--no-open", action="store_true", help="不自动打开浏览器")
    parser.add_argument(
        "--site",
        default=None,
        help="站点目录（文章、构建与 git 推送都发生在这里）",
    )
    args = parser.parse_args()

    site = args.site or os.environ.get("STUDIO_SITE") or last_site() or str(DEFAULT_SITE)
    site = configure_site(site)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = f"http://{args.host}:{args.port}/studio/"
    print(f"建站台已启动：{url}")
    print(f"站点目录：{site}")
    if not (site / "index.html").is_file():
        print("站点尚未创建，打开页面后按向导填写信息即可生成。")
    print("按 Ctrl+C 停止")
    if not args.no_open:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
