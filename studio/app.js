(() => {
  const $ = (id) => document.getElementById(id);

  const state = {
    posts: [],
    current: null,
    dirty: false,
    view: 'split',
    studioView: 'articles',
    songs: [],
    layout: [],
    site: null,
    siteReady: false,
    qa: [],
    qaFilter: 'all',
    toastTimer: 0,
    status: null,
  };

  const el = {
    postList: $('postList'),
    postTotal: $('postTotal'),
    sideEmpty: $('sideEmpty'),
    search: $('searchInput'),
    syncPill: $('syncPill'),
    placeholder: $('placeholder'),
    editor: $('editor'),
    title: $('fieldTitle'),
    date: $('fieldDate'),
    category: $('fieldCategory'),
    summary: $('fieldSummary'),
    path: $('postPath'),
    dirtyFlag: $('dirtyFlag'),
    panes: $('panes'),
    content: $('contentInput'),
    preview: $('preview'),
    previewPane: $('previewPane'),
    charCount: $('charCount'),
    imagesBar: $('imagesBar'),
    imageList: $('imageList'),
    imageCount: $('imageCount'),
    fileInput: $('fileInput'),
    gitDot: $('gitDot'),
    gitText: $('gitText'),
    toast: $('toast'),
    createModal: $('createModal'),
    publishModal: $('publishModal'),
    changeList: $('changeList'),
    changeHint: $('changeHint'),
    commitMessage: $('commitMessage'),
    publishAll: $('publishAll'),
    confirmPush: $('confirmPush'),
    confirmPublish: $('confirmPublish'),
    publishLog: $('publishLog'),
    articlesView: $('articlesView'),
    songsView: $('songsView'),
    layoutView: $('layoutView'),
    siteView: $('siteView'),
    qaView: $('qaView'),
    songTitle: $('songTitle'),
    songArtist: $('songArtist'),
    songId: $('songId'),
    songAudioFile: $('songAudioFile'),
    songAudio: $('songAudio'),
    songCoverFile: $('songCoverFile'),
    songCover: $('songCover'),
    songCoverPreview: $('songCoverPreview'),
    songAddBtn: $('songAddBtn'),
    songFormHint: $('songFormHint'),
    songList: $('songList'),
    songCount: $('songCount'),
    songEmpty: $('songEmpty'),
    songsLog: $('songsLog'),
    songsRefreshBtn: $('songsRefreshBtn'),
    songsPublishBtn: $('songsPublishBtn'),
    layoutList: $('layoutList'),
    layoutCount: $('layoutCount'),
    layoutFields: $('layoutFields'),
    layoutSaveBtn: $('layoutSaveBtn'),
    layoutRefreshBtn: $('layoutRefreshBtn'),
    layoutPublishBtn: $('layoutPublishBtn'),
    layoutLog: $('layoutLog'),
    layoutHint: $('layoutHint'),
    siteBrand: $('siteBrand'),
    siteBrandSub: $('siteBrandSub'),
    siteNav: $('siteNav'),
    siteCopyright: $('siteCopyright'),
    siteAbout: $('siteAbout'),
    siteAboutUrl: $('siteAboutUrl'),
    siteGithub: $('siteGithub'),
    siteGithubUrl: $('siteGithubUrl'),
    siteContact: $('siteContact'),
    siteContactUrl: $('siteContactUrl'),
    siteWelcomeTitle: $('siteWelcomeTitle'),
    siteWelcomeSubtitle: $('siteWelcomeSubtitle'),
    siteMusicTitle: $('siteMusicTitle'),
    siteMusicDescription: $('siteMusicDescription'),
    siteSaveBtn: $('siteSaveBtn'),
    siteRefreshBtn: $('siteRefreshBtn'),
    sitePublishBtn: $('sitePublishBtn'),
    siteHint: $('siteHint'),
    siteLog: $('siteLog'),
    sitePath: $('sitePath'),
    siteBranch: $('siteBranch'),
    siteRemote: $('siteRemote'),
    siteRemoteSaveBtn: $('siteRemoteSaveBtn'),
    siteOpenBtn: $('siteOpenBtn'),
    siteDeployHint: $('siteDeployHint'),
    setupModal: $('setupModal'),
    setupForm: $('setupForm'),
    setupPath: $('setupPath'),
    setupName: $('setupName'),
    setupSubtitle: $('setupSubtitle'),
    setupAuthor: $('setupAuthor'),
    setupWelcome: $('setupWelcome'),
    setupIntro: $('setupIntro'),
    setupGithub: $('setupGithub'),
    setupContact: $('setupContact'),
    setupRepo: $('setupRepo'),
    setupSubmit: $('setupSubmit'),
    setupLog: $('setupLog'),
    qaUrl: $('qaUrl'),
    qaToken: $('qaToken'),
    qaConnState: $('qaConnState'),
    qaConfigHint: $('qaConfigHint'),
    qaAdminList: $('qaAdminList'),
    qaEmpty: $('qaEmpty'),
    qaLog: $('qaLog'),
    qaRefreshBtn: $('qaRefreshBtn'),
    qaSaveConfigBtn: $('qaSaveConfigBtn'),
    qaFilters: $('qaFilters'),
  };

  /* ------------------------------------------------------------ 基础工具 */

  async function api(path, options = {}) {
    const res = await fetch(path, options);
    let data = null;
    try { data = await res.json(); } catch (err) { /* 忽略非 JSON */ }
    if (!res.ok || (data && data.ok === false)) {
      throw new Error((data && data.error) || `请求失败（${res.status}）`);
    }
    return data || {};
  }

  function toast(text, isError = false) {
    el.toast.textContent = text;
    el.toast.classList.toggle('error', isError);
    el.toast.hidden = false;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => { el.toast.hidden = true; }, 2600);
  }

  function today() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
  }

  function setDirty(value) {
    state.dirty = value;
    el.dirtyFlag.hidden = !value;
  }

  /* ------------------------------------------------------------ 文章列表 */

  async function loadPosts() {
    const data = await api('/api/posts');
    state.posts = data.posts || [];
    el.postTotal.textContent = state.posts.length;
    el.syncPill.classList.toggle('stale', Boolean(data.stale));
    el.syncPill.textContent = data.stale ? '有新文章未生成数据' : '数据已同步';
    renderList();
  }

  function renderList() {
    const query = el.search.value.trim().toLowerCase();
    const list = state.posts.filter((post) => {
      if (!query) return true;
      return [post.title, post.category, post.summary, post.slug]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });

    el.postList.innerHTML = '';
    el.sideEmpty.hidden = state.posts.length > 0;
    if (!list.length && query) {
      const tip = document.createElement('li');
      tip.className = 'side-empty';
      tip.textContent = '没有匹配的文章。';
      el.postList.appendChild(tip);
      return;
    }

    list.forEach((post) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'post-item' + (state.current && state.current.slug === post.slug ? ' active' : '');
      btn.innerHTML = `
        <span class="pi-title">${escapeHtml(post.title)}</span>
        <span class="pi-meta">
          <span>${escapeHtml(post.date || '未设日期')}</span>
          ${post.category ? `<span class="pi-cat">${escapeHtml(post.category)}</span>` : ''}
        </span>`;
      btn.addEventListener('click', () => openPost(post.slug));
      li.appendChild(btn);
      el.postList.appendChild(li);
    });
  }

  /* ------------------------------------------------------------ 打开 / 渲染 */

  async function openPost(slug) {
    if (state.dirty && !window.confirm('当前文章有未保存的修改，确定放弃并切换？')) return;
    try {
      const data = await api(`/api/post?slug=${encodeURIComponent(slug)}`);
      const post = data.post;
      state.current = post;
      state.dirty = false;

      el.title.value = post.title || '';
      el.date.value = post.date || '';
      el.category.value = post.category || '';
      el.summary.value = post.summary || '';
      el.content.value = data.content || '';
      el.path.textContent = post.path;

      el.placeholder.hidden = true;
      el.editor.hidden = false;
      setDirty(false);
      renderImages(data.images || []);
      updateMetaCount();
      renderPreview();
      renderList();
    } catch (err) {
      toast(err.message, true);
    }
  }

  function resetEditor() {
    state.current = null;
    state.dirty = false;
    el.editor.hidden = true;
    el.placeholder.hidden = false;
    renderList();
  }

  function renderImages(images) {
    el.imageList.innerHTML = '';
    el.imagesBar.hidden = images.length === 0;
    el.imageCount.textContent = images.length;
    images.forEach((image) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = image.name;
      const img = document.createElement('img');
      img.src = image.url;
      img.alt = image.name;
      btn.appendChild(img);
      btn.addEventListener('click', () => {
        insertText(`![${image.name.replace(/\.[^.]+$/, '')}](images/${image.name})`);
      });
      el.imageList.appendChild(btn);
    });
  }

  function updateMetaCount() {
    const count = el.content.value.replace(/\s+/g, '').length;
    el.charCount.textContent = `${count} 字`;
  }

  let previewTimer = 0;
  function schedulePreview() {
    window.clearTimeout(previewTimer);
    previewTimer = window.setTimeout(renderPreview, 180);
  }

  function renderPreview() {
    const slug = state.current ? state.current.slug : '';
    const text = el.content.value.trim();
    if (!text) {
      el.preview.innerHTML = '<p class="empty-tip">正文还是空的，左侧写点什么吧。</p>';
      return;
    }
    if (!window.marked) {
      const pre = document.createElement('pre');
      pre.textContent = text;
      el.preview.innerHTML = '';
      el.preview.appendChild(pre);
      return;
    }
    el.preview.innerHTML = window.marked.parse(el.content.value);
    el.preview.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (!src || /^(https?:)?\/\//i.test(src) || src.startsWith('/') || src.startsWith('data:')) return;
      img.setAttribute('src', `/blog/posts/${slug}/${src.replace(/^\.\//, '')}`);
    });
    el.preview.querySelectorAll('a').forEach((a) => {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  }

  /* ------------------------------------------------------------ 编辑辅助 */

  function insertText(text) {
    const ta = el.content;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = ta.value.slice(0, start);
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    ta.value = before + prefix + text + ta.value.slice(end);
    ta.selectionStart = ta.selectionEnd = start + prefix.length + text.length;
    ta.focus();
    setDirty(true);
    updateMetaCount();
    schedulePreview();
  }

  function wrapSelection(before, after = before, placeholder = '文字') {
    const ta = el.content;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = ta.value.slice(start, end) || placeholder;
    ta.value = ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
    ta.selectionStart = start + before.length;
    ta.selectionEnd = start + before.length + selected.length;
    ta.focus();
    setDirty(true);
    updateMetaCount();
    schedulePreview();
  }

  const inserters = {
    heading() {
      const ta = el.content;
      const lineStart = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
      ta.selectionStart = ta.selectionEnd = lineStart;
      insertText('## ');
    },
    bold() { wrapSelection('**', '**', '加粗文字'); },
    link() { wrapSelection('[', '](https://)', '链接文字'); },
    code() { wrapSelection('\n```\n', '\n```\n', '代码'); },
    quote() { wrapSelection('> ', '', '引用内容'); },
    table() {
      insertText('| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n');
    },
  };

  /* ------------------------------------------------------------ 保存 / 新建 / 删除 */

  async function save() {
    if (!state.current) return;
    const payload = {
      title: el.title.value.trim(),
      date: el.date.value,
      category: el.category.value.trim(),
      summary: el.summary.value.trim(),
      content: el.content.value,
    };
    if (!payload.title) {
      toast('标题不能为空', true);
      el.title.focus();
      return;
    }
    try {
      const data = await api(`/api/post/save?slug=${encodeURIComponent(state.current.slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      state.current = { ...state.current, ...(data.post || {}) };
      el.path.textContent = state.current.path || el.path.textContent;
      setDirty(false);
      updateMetaCount();
      toast(`已保存，文章数据已更新（共 ${data.built} 篇）`);
      await loadPosts();
      refreshStatus();
    } catch (err) {
      toast(err.message, true);
    }
  }

  function openCreate() {
    $('newTitle').value = '';
    $('newSlug').value = '';
    $('newCategory').value = '';
    $('newSummary').value = '';
    $('newDate').value = today();
    el.createModal.hidden = false;
    $('newTitle').focus();
  }

  async function createPost(event) {
    event.preventDefault();
    const payload = {
      title: $('newTitle').value.trim(),
      date: $('newDate').value,
      slug: $('newSlug').value.trim(),
      category: $('newCategory').value.trim(),
      summary: $('newSummary').value.trim(),
    };
    if (!payload.title) return;
    try {
      const data = await api('/api/post/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      el.createModal.hidden = true;
      await loadPosts();
      if (state.dirty && !window.confirm('已创建新文章。当前文章有未保存的修改，确定放弃并打开新文章？')) {
        toast('已创建，可从左侧列表打开');
        refreshStatus();
        return;
      }
      setDirty(false);
      await openPost(data.slug);
      toast(`已创建 ${data.slug}`);
      refreshStatus();
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function deletePost() {
    if (!state.current) return;
    const title = state.current.title || state.current.slug;
    if (!window.confirm(`确定删除《${title}》？会连同目录和图片一起删除，无法撤销。`)) return;
    try {
      await api(`/api/post/delete?slug=${encodeURIComponent(state.current.slug)}`, { method: 'POST' });
      toast('已删除');
      resetEditor();
      await loadPosts();
      refreshStatus();
    } catch (err) {
      toast(err.message, true);
    }
  }

  /* ------------------------------------------------------------ 图片上传 */

  async function uploadFiles(files) {
    if (!state.current) {
      toast('先打开或新建一篇文章', true);
      return;
    }
    if (!state.current.isFolder) {
      toast('单文件文章不支持图片，请改用文件夹结构', true);
      return;
    }
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast(`${file.name} 不是图片`, true);
        continue;
      }
      try {
        const res = await fetch(
          `/api/upload?slug=${encodeURIComponent(state.current.slug)}&name=${encodeURIComponent(file.name)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file },
        );
        const data = await res.json();
        if (!res.ok || data.ok === false) throw new Error(data.error || '上传失败');
        insertText(data.markdown);
        toast(`已插入 ${data.name}`);
      } catch (err) {
        toast(err.message, true);
      }
    }
    if (state.current) {
      try {
        const fresh = await api(`/api/post?slug=${encodeURIComponent(state.current.slug)}`);
        renderImages(fresh.images || []);
        state.current.images = fresh.post.images;
      } catch (err) { /* 忽略刷新失败 */ }
    }
  }

  /* ------------------------------------------------------------ git */

  async function refreshStatus() {
    try {
      const data = await api('/api/status');
      if (data.ok === false) {
        state.status = null;
        el.gitDot.className = 'dot';
        el.gitText.textContent = data.error || '无法读取 git 状态';
        return;
      }
      state.status = data;
      const blog = data.blogChanges || [];
      const others = data.otherCount || 0;
      el.gitDot.className = 'dot ' + (blog.length ? 'dirty' : 'clean');
      const last = data.lastCommit ? ` · 最近提交 ${data.lastCommit}` : '';
      let text = blog.length
        ? `${data.branch} · 博客 ${blog.length} 项待发布`
        : `${data.branch} · 博客没有待发布的改动`;
      if (others) text += ` · blog/ 外 ${others} 项不自动推送`;
      el.gitText.textContent = text + last;
      return data;
    } catch (err) {
      el.gitText.textContent = err.message;
    }
  }

  function renderPublishChanges() {
    const data = state.status || {};
    const useAll = el.publishAll.checked;
    const changes = useAll ? (data.changes || []) : (data.blogChanges || []);
    const excluded = useAll ? 0 : (data.otherCount || 0);
    el.changeList.innerHTML = changes.length
      ? changes.map((c) => `<li><b>${escapeHtml(c.status)}</b><span>${escapeHtml(c.path)}</span></li>`).join('')
      : '<li><span>没有待发布的改动</span></li>';
    el.changeHint.hidden = excluded === 0;
    el.changeHint.textContent = excluded
      ? `另有 ${excluded} 项 blog/ 以外的改动不会推送；需要发布时勾选上方「全站推送」。`
      : '';
  }

  async function openPublish() {
    const data = await refreshStatus();
    state.status = data || null;
    el.publishAll.checked = false;
    el.commitMessage.value = `更新博客 ${today()}`;
    el.confirmPush.checked = false;
    el.confirmPublish.disabled = true;
    el.confirmPublish.textContent = '确认发布';
    el.publishLog.hidden = true;
    el.publishLog.textContent = '';
    renderPublishChanges();
    el.publishModal.hidden = false;
  }

  async function doPublish() {
    if (!el.confirmPush.checked) return;
    el.confirmPublish.disabled = true;
    el.confirmPublish.textContent = '发布中…';
    el.publishLog.hidden = false;
    el.publishLog.textContent = '开始发布…';
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          message: el.commitMessage.value.trim(),
          scope: el.publishAll.checked ? 'all' : 'blog',
        }),
      });
      const data = await res.json();
      const logs = (data.logs || []).join('\n');
      el.publishLog.textContent = logs + (data.error ? `\n\n错误：${data.error}` : '');
      if (!res.ok || data.ok === false) {
        toast('发布失败，请看日志', true);
        el.confirmPublish.disabled = false;
      } else {
        toast('已推送到仓库');
        el.confirmPush.checked = false;
        await loadPosts();
        await refreshStatus();
        renderPublishChanges();
      }
    } catch (err) {
      el.publishLog.textContent = String(err.message);
      toast('发布失败', true);
      el.confirmPublish.disabled = false;
    } finally {
      el.confirmPublish.textContent = '确认发布';
    }
  }

  /* ------------------------------------------------------------ 歌曲管理 */

  function fillOptions(select, files, placeholder) {
    const current = select.value;
    select.innerHTML = '';
    if (!files.length) {
      select.appendChild(new Option(placeholder, ''));
      return;
    }
    files.forEach((name) => select.appendChild(new Option(name, name)));
    if (files.includes(current)) select.value = current;
  }

  function songCoverUrl(song) {
    const path = String(song.cover || '').replace(/^\/+/, '');
    return '/' + path.split('/').map(encodeURIComponent).join('/');
  }

  async function loadSongs() {
    const data = await api('/api/songs');
    state.songs = data.songs || [];
    fillOptions(el.songAudio, data.audioFiles || [], 'album 里还没有音频');
    fillOptions(el.songCover, data.coverFiles || [], 'album/cover 里还没有封面');
    renderSongs();
  }

  function renderSongs() {
    const songs = state.songs;
    el.songCount.textContent = `${songs.length} 首`;
    el.songEmpty.hidden = songs.length > 0;
    el.songList.innerHTML = '';

    songs.forEach((song, index) => {
      const li = document.createElement('li');
      li.className = 'song-row';

      const order = document.createElement('span');
      order.className = 'song-index';
      order.textContent = String(index + 1).padStart(2, '0');

      const cover = document.createElement('img');
      cover.className = 'song-cover';
      cover.alt = '';
      cover.src = songCoverUrl(song);

      const main = document.createElement('div');
      main.className = 'song-main';
      const title = document.createElement('div');
      title.className = 'song-title';
      title.textContent = `${song.title} — ${song.artist}`;
      const meta = document.createElement('div');
      meta.className = 'song-meta';
      meta.textContent = `${song.id} · ${song.file}`;
      main.append(title, meta);

      const move = document.createElement('div');
      move.className = 'song-move';
      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '↑';
      up.title = '上移';
      up.disabled = index === 0;
      up.addEventListener('click', () => moveSong(index, -1));
      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '↓';
      down.title = '下移';
      down.disabled = index === songs.length - 1;
      down.addEventListener('click', () => moveSong(index, 1));
      move.append(up, down);

      li.append(order, cover, main, move);
      el.songList.appendChild(li);
    });
  }

  async function moveSong(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= state.songs.length) return;
    const songs = state.songs.slice();
    [songs[index], songs[target]] = [songs[target], songs[index]];
    state.songs = songs;
    renderSongs();
    try {
      await api('/api/songs/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: songs.map((song) => song.id) }),
      });
    } catch (err) {
      toast(err.message, true);
      await loadSongs().catch(() => {});
    }
  }

  async function uploadSongAsset(kind, file) {
    const res = await fetch(
      `/api/song/upload?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(file.name)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || '上传失败');
    return data;
  }

  function showCoverPreview(name) {
    if (name) {
      el.songCoverPreview.src = '/album/cover/' + encodeURIComponent(name);
      el.songCoverPreview.hidden = false;
    } else {
      el.songCoverPreview.hidden = true;
      el.songCoverPreview.removeAttribute('src');
    }
  }

  async function uploadCoverFile() {
    const file = el.songCoverFile.files && el.songCoverFile.files[0];
    el.songCoverFile.value = '';
    if (!file) return;
    el.songFormHint.textContent = `正在上传 ${file.name}…`;
    try {
      const data = await uploadSongAsset('cover', file);
      await loadSongs();
      el.songCover.value = data.name;
      showCoverPreview(data.name);
      el.songFormHint.textContent = `已上传封面 ${data.name}`;
    } catch (err) {
      el.songFormHint.textContent = err.message;
      toast(err.message, true);
    }
  }

  async function uploadAudioFile() {
    const file = el.songAudioFile.files && el.songAudioFile.files[0];
    el.songAudioFile.value = '';
    if (!file) return;
    if (!/\.mp3$/i.test(file.name)) {
      el.songFormHint.textContent = '请选择 mp3 文件。';
      toast('请选择 mp3 文件', true);
      return;
    }
    el.songFormHint.textContent = `正在上传并读取 ${file.name}…`;
    try {
      const data = await uploadSongAsset('audio', file);
      await loadSongs();
      el.songAudio.value = data.name;
      if (data.title) el.songTitle.value = data.title;
      if (data.artist) el.songArtist.value = data.artist;
      if (!el.songId.value.trim()) {
        el.songId.value = String(file.name).replace(/\.mp3$/i, '')
          .replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase().slice(0, 40);
      }
      if (data.cover) {
        el.songCover.value = data.cover;
        showCoverPreview(data.cover);
        el.songFormHint.textContent = `已读取 ${data.name} 的标签与封面，确认信息后加入播放列表。`;
      } else {
        showCoverPreview('');
        el.songFormHint.textContent = `已上传 ${data.name}，但没有内嵌封面，请手动上传一张。`;
      }
    } catch (err) {
      el.songFormHint.textContent = err.message;
      toast(err.message, true);
    }
  }

  async function addSong() {
    const payload = {
      title: el.songTitle.value.trim(),
      artist: el.songArtist.value.trim(),
      id: el.songId.value.trim(),
      file: el.songAudio.value,
      cover: el.songCover.value,
    };
    if (!payload.title) { toast('歌名不能为空', true); el.songTitle.focus(); return; }
    if (!payload.artist) { toast('歌手不能为空', true); el.songArtist.focus(); return; }
    if (!payload.file) { toast('请先上传或选择音频文件', true); return; }
    if (!payload.cover) { toast('请先上传或选择封面', true); return; }

    el.songAddBtn.disabled = true;
    try {
      const data = await api('/api/songs/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      state.songs = data.songs || [];
      fillOptions(el.songAudio, data.audioFiles || [], 'album 里还没有音频');
      fillOptions(el.songCover, data.coverFiles || [], 'album/cover 里还没有封面');
      el.songTitle.value = '';
      el.songArtist.value = '';
      el.songId.value = '';
      showCoverPreview('');
      renderSongs();
      el.songFormHint.textContent = `已加入《${data.song.title}》，记得点「发布歌曲」。`;
      toast('已加入播放列表');
      refreshStatus();
    } catch (err) {
      toast(err.message, true);
    } finally {
      el.songAddBtn.disabled = false;
    }
  }

  async function publishSongs() {
    if (!window.confirm('确定把 album/ 与 music.html 的改动提交并推送到仓库？')) return;
    el.songsPublishBtn.disabled = true;
    el.songsPublishBtn.textContent = '发布中…';
    el.songsLog.hidden = false;
    el.songsLog.textContent = '开始发布…';
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          message: `更新歌曲 ${today()}`,
          scope: 'songs',
        }),
      });
      const data = await res.json().catch(() => ({}));
      const logs = (data.logs || []).join('\n');
      el.songsLog.textContent = logs + (data.error ? `\n\n错误：${data.error}` : '');
      if (!res.ok || data.ok === false) {
        toast('发布失败，请看日志', true);
      } else {
        toast('歌曲已发布');
        refreshStatus();
      }
    } catch (err) {
      el.songsLog.textContent = String(err.message);
      toast('发布失败', true);
    } finally {
      el.songsPublishBtn.disabled = false;
      el.songsPublishBtn.textContent = '发布歌曲';
    }
  }

  /* ------------------------------------------------------------ 首页板块 */

  async function loadLayout() {
    const data = await api('/api/layout');
    state.layout = data.modules || [];
    renderLayout();
  }

  function renderLayout() {
    const modules = state.layout;
    const enabled = modules.filter((item) => item.enabled !== false).length;
    el.layoutCount.textContent = `${enabled} / ${modules.length} 已启用`;
    el.layoutList.innerHTML = '';
    el.layoutFields.innerHTML = '';

    modules.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'song-row layout-row';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.className = 'layout-toggle';
      toggle.checked = item.enabled !== false;
      toggle.title = '是否在首页显示';
      toggle.addEventListener('change', () => {
        item.enabled = toggle.checked;
        renderLayout();
      });

      const main = document.createElement('div');
      main.className = 'song-main';
      const title = document.createElement('div');
      title.className = 'song-title';
      title.textContent = item.label || item.id;
      const meta = document.createElement('div');
      meta.className = 'song-meta';
      meta.textContent = item.id + (item.enabled === false ? ' · 已隐藏' : '');
      main.append(title, meta);

      const move = document.createElement('div');
      move.className = 'song-move';
      const up = document.createElement('button');
      up.type = 'button';
      up.textContent = '↑';
      up.title = '上移';
      up.disabled = index === 0;
      up.addEventListener('click', () => moveLayout(index, -1));
      const down = document.createElement('button');
      down.type = 'button';
      down.textContent = '↓';
      down.title = '下移';
      down.disabled = index === modules.length - 1;
      down.addEventListener('click', () => moveLayout(index, 1));
      move.append(up, down);

      li.append(toggle, main, move);
      el.layoutList.appendChild(li);
    });

    renderLayoutFields();
  }

  function renderLayoutFields() {
    const fieldsBox = el.layoutFields;
    fieldsBox.innerHTML = '';
    state.layout.forEach((item) => {
      if (!Array.isArray(item.fields) || !item.fields.length) return;
      const group = document.createElement('div');
      group.className = 'layout-field-group';

      const head = document.createElement('div');
      head.className = 'layout-field-head';
      const name = document.createElement('span');
      name.textContent = item.label || item.id;
      const badge = document.createElement('em');
      badge.textContent = item.enabled === false ? '已隐藏' : '显示中';
      badge.className = item.enabled === false ? 'is-off' : '';
      head.append(name, badge);
      group.appendChild(head);

      item.fields.forEach((field) => {
        const label = document.createElement('label');
        label.className = 'layout-field';
        const caption = document.createElement('span');
        caption.textContent = field.label || field.key;
        label.appendChild(caption);

        let input;
        if (field.type === 'number') {
          input = document.createElement('input');
          input.type = 'number';
          input.min = field.min != null ? field.min : 0;
          input.max = field.max != null ? field.max : 1000;
        } else if (field.type === 'textarea') {
          input = document.createElement('textarea');
          input.rows = 3;
        } else {
          input = document.createElement('input');
          input.type = 'text';
          input.maxLength = field.max || 500;
        }
        input.value = item[field.key] != null ? item[field.key] : '';
        input.dataset.module = item.id;
        input.dataset.key = field.key;
        input.addEventListener('input', () => {
          item[field.key] = field.type === 'number'
            ? Number(input.value)
            : input.value.trim();
        });
        label.appendChild(input);
        group.appendChild(label);
      });

      fieldsBox.appendChild(group);
    });
  }

  function moveLayout(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= state.layout.length) return;
    const modules = state.layout.slice();
    [modules[index], modules[target]] = [modules[target], modules[index]];
    state.layout = modules;
    renderLayout();
  }

  async function saveLayout() {
    el.layoutSaveBtn.disabled = true;
    try {
      const data = await api('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules: state.layout }),
      });
      state.layout = data.modules || state.layout;
      renderLayout();
      toast('首页编排已保存，记得点「发布首页」');
    } catch (err) {
      toast(err.message, true);
    } finally {
      el.layoutSaveBtn.disabled = false;
    }
  }

  async function publishLayout() {
    if (!window.confirm('确定把 site-layout.js 与 index.html 的改动提交并推送到仓库？')) return;
    el.layoutPublishBtn.disabled = true;
    el.layoutPublishBtn.textContent = '发布中…';
    el.layoutLog.hidden = false;
    el.layoutLog.textContent = '开始发布…';
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          message: `更新首页板块编排 ${today()}`,
          scope: 'layout',
        }),
      });
      const data = await res.json().catch(() => ({}));
      const logs = (data.logs || []).join('\n');
      el.layoutLog.textContent = logs + (data.error ? `\n\n错误：${data.error}` : '');
      if (!res.ok || data.ok === false) {
        toast('发布失败，请看日志', true);
      } else {
        toast('首页已发布');
        refreshStatus();
      }
    } catch (err) {
      el.layoutLog.textContent = String(err.message);
      toast('发布失败', true);
    } finally {
      el.layoutPublishBtn.disabled = false;
      el.layoutPublishBtn.textContent = '发布首页';
    }
  }

  /* ------------------------------------------------------------ 站点设置 */

  async function loadSiteConfig() {
    const data = await api('/api/site-config');
    state.site = data.config || {};
    renderSiteConfig();
  }

  function renderSiteConfig() {
    const cfg = state.site || {};
    const footer = cfg.footer || {};
    const welcome = cfg.welcome || {};
    const music = cfg.music || {};

    el.siteBrand.value = cfg.brand || '';
    el.siteBrandSub.value = cfg.brandSub || '';
    el.siteCopyright.value = footer.copyright || '';
    el.siteAbout.value = footer.about || '';
    el.siteAboutUrl.value = footer.aboutUrl || '';
    el.siteGithub.value = footer.github || '';
    el.siteGithubUrl.value = footer.githubUrl || '';
    el.siteContact.value = footer.contact || '';
    el.siteContactUrl.value = footer.contactUrl || '';
    el.siteWelcomeTitle.value = welcome.title || '';
    el.siteWelcomeSubtitle.value = welcome.subtitle || '';
    el.siteMusicTitle.value = music.title || '';
    el.siteMusicDescription.value = music.description || '';

    el.siteNav.innerHTML = '';
    (cfg.nav || []).forEach((item, index) => {
      const label = document.createElement('label');
      label.className = 'layout-field';
      const caption = document.createElement('span');
      caption.textContent = `导航 ${index + 1} · ${item.id}`;
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 30;
      input.value = item.label || '';
      input.addEventListener('input', () => { item.label = input.value; });
      label.append(caption, input);
      el.siteNav.appendChild(label);
    });
  }

  async function saveSiteConfig() {
    if (!state.site) return;
    const payload = {
      brand: el.siteBrand.value.trim(),
      brandSub: el.siteBrandSub.value.trim(),
      nav: (state.site.nav || []).map((item) => ({ id: item.id, label: item.label || '' })),
      footer: {
        copyright: el.siteCopyright.value.trim(),
        about: el.siteAbout.value.trim(),
        aboutUrl: el.siteAboutUrl.value.trim(),
        github: el.siteGithub.value.trim(),
        githubUrl: el.siteGithubUrl.value.trim(),
        contact: el.siteContact.value.trim(),
        contactUrl: el.siteContactUrl.value.trim(),
      },
      welcome: {
        title: el.siteWelcomeTitle.value.trim(),
        subtitle: el.siteWelcomeSubtitle.value.trim(),
      },
      music: {
        title: el.siteMusicTitle.value.trim(),
        description: el.siteMusicDescription.value.trim(),
      },
    };
    el.siteSaveBtn.disabled = true;
    try {
      const data = await api('/api/site-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      state.site = data.config || state.site;
      renderSiteConfig();
      el.siteHint.textContent = '已保存到 site-config.js，点「发布站点」后上线。';
      toast('站点设置已保存');
      refreshStatus();
    } catch (err) {
      toast(err.message, true);
    } finally {
      el.siteSaveBtn.disabled = false;
    }
  }

  async function publishSite() {
    if (!window.confirm('确定把 site-config.js、welcome.html、music.html 与 index.html 的改动提交并推送？')) return;
    el.sitePublishBtn.disabled = true;
    el.sitePublishBtn.textContent = '发布中…';
    el.siteLog.hidden = false;
    el.siteLog.textContent = '开始发布…';
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          message: `更新站点设置 ${today()}`,
          scope: 'site',
        }),
      });
      const data = await res.json().catch(() => ({}));
      const logs = (data.logs || []).join('\n');
      el.siteLog.textContent = logs + (data.error ? `\n\n错误：${data.error}` : '');
      if (!res.ok || data.ok === false) {
        toast('发布失败，请看日志', true);
      } else {
        toast('站点设置已发布');
        refreshStatus();
      }
    } catch (err) {
      el.siteLog.textContent = String(err.message);
      toast('发布失败', true);
    } finally {
      el.sitePublishBtn.disabled = false;
      el.sitePublishBtn.textContent = '发布站点';
    }
  }

  /* ------------------------------------------------------------ 问答管理 */

  function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
      `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  async function loadQAConfig() {
    const data = await api('/api/qa/config');
    el.qaUrl.value = data.url || '';
    el.qaToken.value = '';
    el.qaToken.placeholder = data.hasToken
      ? '已保存令牌，留空则保持不变'
      : '与 Cloudflare 的 QA_ADMIN_TOKEN 一致';
    el.qaConnState.textContent = data.hasToken ? '已配置令牌' : '未配置令牌';
    el.qaConnState.style.color = data.hasToken ? 'var(--ok)' : 'var(--accent)';
  }

  async function saveQAConfig() {
    const payload = {
      qaUrl: el.qaUrl.value.trim(),
      qaToken: el.qaToken.value.trim(),
    };
    try {
      const data = await api('/api/qa/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      el.qaToken.value = '';
      el.qaConfigHint.textContent = data.hasToken
        ? '设置已保存，正在读取问答。'
        : '已保存站点地址，但还没有管理令牌。';
      toast('问答设置已保存');
      await loadQAConfig();
      if (data.hasToken) await loadQA();
    } catch (err) {
      toast(err.message, true);
    }
  }

  async function loadQA() {
    el.qaAdminList.innerHTML = '';
    el.qaEmpty.hidden = false;
    el.qaEmpty.textContent = '正在读取…';
    try {
      const data = await api('/api/qa');
      state.qa = data.questions || [];
      renderQA();
    } catch (err) {
      el.qaEmpty.textContent = err.message;
      toast(err.message, true);
    }
  }

  function renderQA() {
    const all = state.qa;
    const waiting = all.filter((item) => item.pending).length;
    const list = all.filter((item) => {
      if (state.qaFilter === 'pending') return item.pending;
      if (state.qaFilter === 'answered') return !item.pending;
      return true;
    });

    el.qaAdminList.innerHTML = '';
    el.qaEmpty.hidden = list.length > 0;
    el.qaEmpty.textContent = all.length ? '当前筛选下没有问题。' : '还没有访客提问。';

    el.qaConnState.textContent = waiting ? `待回答 ${waiting}` : '全部已回答';
    el.qaConnState.style.color = waiting ? 'var(--accent)' : 'var(--ok)';

    list.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'qa-admin-card' + (item.pending ? ' pending' : '');

      const meta = document.createElement('div');
      meta.className = 'qa-admin-meta';
      const name = document.createElement('strong');
      name.textContent = item.name || '匿名';
      const time = document.createElement('span');
      time.textContent = formatTime(item.createdAt);
      meta.append(name, time);
      if (item.pending) {
        const badge = document.createElement('span');
        badge.className = 'qa-admin-badge';
        badge.textContent = '待回答';
        meta.appendChild(badge);
      } else {
        const likes = document.createElement('span');
        likes.textContent = `♥ ${Number(item.likes) || 0}`;
        meta.appendChild(likes);
      }

      const question = document.createElement('p');
      question.className = 'qa-admin-question';
      question.textContent = item.question;

      const answer = document.createElement('textarea');
      answer.className = 'qa-admin-answer';
      answer.placeholder = '写下你的回答…';
      answer.value = item.answer || '';

      const actions = document.createElement('div');
      actions.className = 'qa-admin-actions';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'btn danger';
      remove.textContent = '删除';
      remove.addEventListener('click', () => deleteQuestion(item, remove));
      const submit = document.createElement('button');
      submit.type = 'button';
      submit.className = 'btn primary';
      submit.textContent = item.pending ? '发布回答' : '更新回答';
      submit.addEventListener('click', () => submitAnswer(item, answer, submit));
      actions.append(remove, submit);

      card.append(meta, question, answer, actions);
      el.qaAdminList.appendChild(card);
    });
  }

  async function deleteQuestion(item, button) {
    if (!window.confirm(`确定删除这条提问？删除后站点上不再显示。\n\n${item.question}`)) return;
    button.disabled = true;
    try {
      await api('/api/qa/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      state.qa = state.qa.filter((entry) => entry.id !== item.id);
      renderQA();
      toast('提问已删除');
    } catch (err) {
      toast(err.message, true);
      button.disabled = false;
    }
  }

  async function submitAnswer(item, textarea, button) {
    const answer = textarea.value.trim();
    if (!answer) {
      toast('回答不能为空', true);
      textarea.focus();
      return;
    }
    button.disabled = true;
    button.textContent = '发布中…';
    try {
      const data = await api('/api/qa/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, answer }),
      });
      item.answer = (data.question && data.question.answer) || answer;
      item.answeredAt = (data.question && data.question.answeredAt) || '';
      item.pending = false;
      toast(item.answeredAt ? '回答已发布' : '已发布');
      renderQA();
    } catch (err) {
      toast(err.message, true);
      button.disabled = false;
      button.textContent = item.pending ? '发布回答' : '更新回答';
    }
  }

  /* ------------------------------------------------------------ 视图切换 */

  function setStudioView(name) {
    state.studioView = name;
    el.articlesView.hidden = name !== 'articles';
    el.songsView.hidden = name !== 'songs';
    el.layoutView.hidden = name !== 'layout';
    el.siteView.hidden = name !== 'site';
    el.qaView.hidden = name !== 'qa';
    document.querySelectorAll('#viewTabs .view-tab').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.studioView === name);
    });
    if (name === 'songs') {
      loadSongs().catch((err) => toast(err.message, true));
    } else if (name === 'layout') {
      loadLayout().catch((err) => toast(err.message, true));
    } else if (name === 'site') {
      if (state.siteReady) {
        loadSiteConfig().catch((err) => toast(err.message, true));
      }
      loadSiteStatus().catch(() => {});
    } else if (name === 'qa') {
      loadQAConfig().catch((err) => toast(err.message, true));
      loadQA();
    }
  }

  /* ------------------------------------------------------------ 建站与部署 */

  function applySiteStatus(data) {
    state.siteReady = Boolean(data && data.exists);
    el.sitePath.textContent = (data && data.path) || '—';
    el.siteBranch.value = (data && data.branch) || '';
    el.siteRemote.value = (data && data.remote) || '';
    if (!data) return;
    if (data.exists) {
      el.siteDeployHint.textContent = data.remote
        ? `已连接 ${data.remote}${data.branch ? `（${data.branch} 分支）` : ''}。发布后托管平台会自动重新部署。`
        : '还没有配置远程仓库。填写地址并保存后，即可在下方「发布到仓库」推送。';
    } else {
      el.siteDeployHint.textContent = '站点尚未创建，请填写信息完成建站。';
    }
  }

  async function loadSiteStatus() {
    const data = await api('/api/site');
    applySiteStatus(data);
    return data;
  }

  function openSetup(data) {
    el.setupPath.value = (data && data.path) || '';
    el.setupLog.hidden = true;
    el.setupLog.textContent = '';
    el.setupModal.hidden = false;
    window.setTimeout(() => el.setupName.focus(), 50);
  }

  async function submitSetup(event) {
    event.preventDefault();
    el.setupSubmit.disabled = true;
    el.setupSubmit.textContent = '创建中…';
    el.setupLog.hidden = false;
    el.setupLog.textContent = '正在生成站点文件…';
    try {
      const data = await api('/api/site/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: el.setupPath.value.trim(),
          name: el.setupName.value.trim(),
          subtitle: el.setupSubtitle.value.trim(),
          author: el.setupAuthor.value.trim(),
          welcome: el.setupWelcome.value.trim(),
          intro: el.setupIntro.value.trim(),
          githubUrl: el.setupGithub.value.trim(),
          contact: el.setupContact.value.trim(),
          repoUrl: el.setupRepo.value.trim(),
        }),
      });
      el.setupLog.textContent = (data.logs || []).join('\n') || '站点已创建';
      applySiteStatus(data.site);
      el.setupModal.hidden = true;
      toast('站点已创建，可以开始写作了');
      await loadPosts();
      await refreshStatus();
    } catch (err) {
      el.setupLog.textContent = String(err.message);
      toast('建站失败，请看日志', true);
    } finally {
      el.setupSubmit.disabled = false;
      el.setupSubmit.textContent = '创建站点';
    }
  }

  async function saveRemote() {
    const url = el.siteRemote.value.trim();
    if (!url) {
      toast('请填写仓库地址', true);
      return;
    }
    el.siteRemoteSaveBtn.disabled = true;
    try {
      const data = await api('/api/site/remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      applySiteStatus(data);
      toast('仓库地址已保存');
    } catch (err) {
      toast(err.message, true);
    } finally {
      el.siteRemoteSaveBtn.disabled = false;
    }
  }

  /* ------------------------------------------------------------ 事件绑定 */

  function setView(view) {
    state.view = view;
    el.panes.className = 'panes ' + ({ edit: 'edit-only', preview: 'preview-only' }[view] || 'split');
    document.querySelectorAll('.view-switch button').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.view === view);
    });
  }

  el.content.addEventListener('input', () => {
    setDirty(true);
    updateMetaCount();
    schedulePreview();
  });
  [el.title, el.date, el.category, el.summary].forEach((input) => {
    input.addEventListener('input', () => setDirty(true));
  });

  el.search.addEventListener('input', renderList);

  document.querySelectorAll('.view-switch button').forEach((btn) => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  document.querySelectorAll('[data-insert]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const fn = inserters[btn.dataset.insert];
      if (fn) fn();
    });
  });

  document.querySelectorAll('#viewTabs .view-tab').forEach((btn) => {
    btn.addEventListener('click', () => setStudioView(btn.dataset.studioView));
  });

  el.qaFilters.querySelectorAll('[data-qa-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.qaFilter = btn.dataset.qaFilter;
      el.qaFilters.querySelectorAll('.view-tab').forEach((item) => {
        item.classList.toggle('active', item === btn);
      });
      renderQA();
    });
  });

  el.songsRefreshBtn.addEventListener('click', () => {
    loadSongs().then(() => toast('歌曲列表已刷新')).catch((err) => toast(err.message, true));
  });
  el.songsPublishBtn.addEventListener('click', publishSongs);
  el.songAddBtn.addEventListener('click', addSong);
  el.songAudioFile.addEventListener('change', uploadAudioFile);
  el.songCoverFile.addEventListener('change', uploadCoverFile);

  el.layoutRefreshBtn.addEventListener('click', () => {
    loadLayout().then(() => toast('首页编排已刷新')).catch((err) => toast(err.message, true));
  });
  el.layoutSaveBtn.addEventListener('click', saveLayout);
  el.layoutPublishBtn.addEventListener('click', publishLayout);

  el.siteRefreshBtn.addEventListener('click', () => {
    loadSiteConfig().then(() => toast('站点设置已刷新')).catch((err) => toast(err.message, true));
  });
  el.siteSaveBtn.addEventListener('click', saveSiteConfig);
  el.sitePublishBtn.addEventListener('click', publishSite);
  el.setupForm.addEventListener('submit', submitSetup);
  el.siteRemoteSaveBtn.addEventListener('click', saveRemote);
  el.siteOpenBtn.addEventListener('click', () => window.open('/index.html', '_blank'));

  el.qaRefreshBtn.addEventListener('click', () => {
    loadQAConfig().catch((err) => toast(err.message, true));
    loadQA();
  });
  el.qaSaveConfigBtn.addEventListener('click', saveQAConfig);

  $('newBtn').addEventListener('click', openCreate);
  $('createForm').addEventListener('submit', createPost);
  $('saveBtn').addEventListener('click', save);
  $('deleteBtn').addEventListener('click', deletePost);
  $('statusBtn').addEventListener('click', refreshStatus);
  $('publishBtn').addEventListener('click', openPublish);
  el.confirmPush.addEventListener('change', () => {
    el.confirmPublish.disabled = !el.confirmPush.checked;
  });
  el.publishAll.addEventListener('change', renderPublishChanges);
  el.confirmPublish.addEventListener('click', doPublish);

  $('revealBtn').addEventListener('click', async () => {
    if (!state.current) return;
    try {
      await api(`/api/reveal?slug=${encodeURIComponent(state.current.slug)}`, { method: 'POST' });
    } catch (err) {
      toast(err.message, true);
    }
  });

  $('buildBtn').addEventListener('click', async () => {
    try {
      const data = await api('/api/build', { method: 'POST' });
      toast(`已生成文章数据（共 ${data.count} 篇）`);
      await loadPosts();
      refreshStatus();
    } catch (err) {
      toast(err.message, true);
    }
  });

  $('imageBtn').addEventListener('click', () => el.fileInput.click());
  el.fileInput.addEventListener('change', async () => {
    const files = Array.from(el.fileInput.files || []);
    el.fileInput.value = '';
    if (files.length) await uploadFiles(files);
  });

  el.content.addEventListener('dragover', (event) => {
    if (event.dataTransfer && Array.from(event.dataTransfer.types).includes('Files')) {
      event.preventDefault();
    }
  });
  el.content.addEventListener('drop', async (event) => {
    const files = Array.from(event.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    event.preventDefault();
    await uploadFiles(files);
  });
  el.content.addEventListener('paste', async (event) => {
    const files = Array.from(event.clipboardData?.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (!files.length) return;
    event.preventDefault();
    await uploadFiles(files);
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => { btn.closest('.modal').hidden = true; });
  });
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal && modal.id !== 'setupModal') modal.hidden = true;
    });
  });

  document.addEventListener('keydown', (event) => {
    const meta = event.metaKey || event.ctrlKey;
    if (meta && event.key.toLowerCase() === 's') {
      event.preventDefault();
      save();
    }
    if (meta && event.key.toLowerCase() === 'b' && document.activeElement === el.content) {
      event.preventDefault();
      inserters.bold();
    }
    if (event.key === 'Escape') {
      document.querySelectorAll('.modal').forEach((modal) => {
        if (modal.id !== 'setupModal') modal.hidden = true;
      });
    }
  });

  window.addEventListener('beforeunload', (event) => {
    if (state.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  /* ------------------------------------------------------------ 启动 */

  setView('split');
  (async () => {
    try {
      const site = await loadSiteStatus();
      if (!site.exists) {
        openSetup(site);
        return;
      }
      await loadPosts();
      await refreshStatus();
    } catch (err) {
      toast(err.message, true);
    }
  })();
})();
