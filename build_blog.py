#!/usr/bin/env python3
"""把 blog/posts/ 下的文章打包成 blog/posts-data.js，供页面直接读取。

文章结构（推荐）：
    blog/posts/2026-12-01-hello/
        index.md        # 文章本体，顶部写 front matter
        images/a.png    # 该文章自己的图片，正文用 ![说明](images/a.png)

也兼容直接放在 blog/posts/ 下的单个 .md 文件。

新增或修改文章后，在项目根目录运行：python3 build_blog.py

排序规则：date 新的在前；同一天按文章文件夹创建时间新的在前。
如需固定顺序，可在 front matter 里写 created: 2026-11-15 19:22。
"""

import json
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
POSTS_DIR = ROOT / "blog" / "posts"
OUTPUT = ROOT / "blog" / "posts-data.js"

FRONT_MATTER = re.compile(r"^---\r?\n(.*?)\r?\n---\r?\n?", re.S)


def folder_created_at(path: Path) -> str:
    """文章文件夹（或单文件）的创建时间，转成可直接排序的 ISO 字符串。"""
    stat = path.stat()
    stamp = getattr(stat, "st_birthtime", stat.st_ctime)
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(stamp))


def parse_front_matter(text: str) -> tuple[dict, str]:
    match = FRONT_MATTER.match(text)
    if not match:
        return {}, text
    meta = {}
    for line in match.group(1).splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip().strip("\"'")
    return meta, text[match.end():]


def build_post(md_path: Path, slug: str, base: str, source: Path) -> dict:
    meta, body = parse_front_matter(md_path.read_text(encoding="utf-8"))
    created = meta.get("created") or folder_created_at(source)
    created = created.replace(" ", "T")[:19]
    return {
        "slug": slug,
        "base": base,
        "file": md_path.stem,
        "title": meta.get("title") or slug,
        "date": meta.get("date", ""),
        "created": created,
        "category": meta.get("category", ""),
        "summary": meta.get("summary", ""),
        "content": body.lstrip("\r\n"),
    }


def collect_posts(posts_dir: Path = None) -> list[dict]:
    posts_dir = Path(posts_dir or POSTS_DIR)
    posts_dir.mkdir(parents=True, exist_ok=True)
    posts = []
    for path in sorted(posts_dir.iterdir()):
        if path.is_dir() and (path / "index.md").is_file():
            posts.append(build_post(path / "index.md", path.name, f"posts/{path.name}/", path))
        elif path.is_file() and path.suffix == ".md":
            posts.append(build_post(path, path.stem, "posts/", path))
    # 日期新的在前；同一天则按文件夹创建时间新的在前
    return sorted(posts, key=lambda post: (post["date"], post["created"]), reverse=True)


def write_data(posts_dir: Path = None, output: Path = None) -> int:
    """生成 posts-data.js，返回文章数量（供写作台 studio.py 复用）。"""
    output = Path(output or OUTPUT)
    posts = collect_posts(posts_dir)
    payload = "window.BLOG_POSTS = " + json.dumps(posts, ensure_ascii=False, indent=2) + ";\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(payload, encoding="utf-8")
    return len(posts)


def main() -> None:
    import argparse
    import os

    parser = argparse.ArgumentParser(description="生成站点文章数据 posts-data.js")
    parser.add_argument(
        "--site",
        default=os.environ.get("STUDIO_SITE") or str(ROOT),
        help="站点目录，默认是当前项目目录",
    )
    args = parser.parse_args()
    site = Path(args.site).expanduser().resolve()
    output = site / "blog" / "posts-data.js"
    count = write_data(site / "blog" / "posts", output)
    print(f"已生成 {output}：{count} 篇文章")


if __name__ == "__main__":
    main()
