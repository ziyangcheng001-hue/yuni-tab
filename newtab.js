var form = document.getElementById('s');
var input = form.q;
var suggest = document.getElementById('suggest');
var engineOptions = document.querySelectorAll('[data-search-engine]');
var activeEngine = SearchEngines.normalizeEngine(localStorage.getItem('searchEngine'));
var suggestRequestId = 0;

function setSearchEngine(engine, persist) {
  activeEngine = SearchEngines.normalizeEngine(engine);
  input.placeholder = SearchEngines.getProvider(activeEngine).placeholder;
  suggestRequestId += 1;
  suggest.classList.remove('show');

  engineOptions.forEach(function (option) {
    var selected = option.dataset.searchEngine === activeEngine;
    option.classList.toggle('active', selected);
    option.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });

  if (persist) localStorage.setItem('searchEngine', activeEngine);
}

engineOptions.forEach(function (option) {
  option.addEventListener('click', function () {
    setSearchEngine(option.dataset.searchEngine, true);
  });
});

setSearchEngine(activeEngine, false);

// ---- 搜索建议 ----
var timer;
input.addEventListener('input', function () {
  suggestRequestId += 1;
  clearTimeout(timer);
  var val = input.value.trim();
  if (!val) { suggest.classList.remove('show'); return; }
  timer = setTimeout(function () { fetchSuggest(val); }, 200);
});

input.addEventListener('focus', function () {
  var val = input.value.trim();
  if (val) fetchSuggest(val);
});

function fetchSuggest(q) {
  var requestEngine = activeEngine;
  var requestId = ++suggestRequestId;

  function accept(data) {
    if (requestId !== suggestRequestId) return;
    if (requestEngine !== activeEngine || input.value.trim() !== q) return;
    if (!data.length) {
      suggest.classList.remove('show');
      return;
    }
    render(data, requestId);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage(
      { type: 'suggest', engine: requestEngine, q: q },
      function (res) {
        if (!res || !res.ok || !Array.isArray(res.data)) {
          accept([]);
          return;
        }
        accept(res.data);
      }
    );
    return;
  }

  fetch(SearchEngines.buildSuggestUrl(requestEngine, q))
    .then(function (response) {
      if (!response.ok) throw new Error('Autocomplete request failed');
      return response.json();
    })
    .then(function (payload) { accept(SearchEngines.parseSuggestions(payload)); })
    .catch(function () { accept([]); });
}

function render(list, requestId) {
  var items = list.slice(0, 7);

  function build() {
    if (requestId !== suggestRequestId) return;
    suggest.innerHTML = '';
    items.forEach(function (text, i) {
      var li = document.createElement('li');
      li.textContent = text;
      li.addEventListener('mousedown', function (e) {
        e.preventDefault();
        location.href = SearchEngines.buildSearchUrl(activeEngine, text);
      });
      suggest.appendChild(li);
    });
  }

  var old = suggest.querySelectorAll('li');

  if (suggest.classList.contains('show') && old.length) {
    // 卡片已开着：旧内容下滑出去，再把新内容下滑进来（卡片不动）
    old.forEach(function (li) { li.classList.add('leaving'); });
    setTimeout(build, 160);
  } else {
    // 首次：卡片展开 + 内容浮现
    build();
    suggest.classList.add('show');
  }
}

// 点空白处隐藏下拉
document.addEventListener('click', function (e) {
  if (!form.contains(e.target)) suggest.classList.remove('show');
});

// ---- 搜索提交 ----
form.addEventListener('submit', function (e) {
  e.preventDefault();
  suggest.classList.remove('show');
  var val = input.value.trim();
  if (!val) {
    // 确保输入框可见（不被空闲隐藏遮住），并重置空闲计时避免提示被吞掉
    document.body.classList.remove('searchbox-hidden');
    if (typeof resetIdle === 'function') resetIdle();
    var h = document.getElementById('hint');
    h.classList.add('show');
    clearTimeout(h._t);
    h._t = setTimeout(function () { h.classList.remove('show'); }, 1800);
    input.focus();
    return;
  }
  location.href = SearchEngines.buildSearchUrl(activeEngine, val);
});

// ==================== 设置面板 ====================
var settingsBtn = document.getElementById('settings');
var overlay = document.getElementById('overlay');
var panel = document.getElementById('panel');
var panelClose = document.getElementById('panel-close');

function openPanel() { overlay.classList.add('open'); panel.classList.add('open'); }
function closePanel() { overlay.classList.remove('open'); panel.classList.remove('open'); }

settingsBtn.addEventListener('click', openPanel);
panelClose.addEventListener('click', closePanel);
overlay.addEventListener('click', closePanel);

// ---- 关于作者 ----
document.getElementById('about').addEventListener('click', function () {
  window.open('https://czy001.pythonanywhere.com/', '_blank');
});

// ---- 辉光开关（记忆到 localStorage）----
var glowToggle = document.getElementById('glow-toggle');
if (localStorage.getItem('noGlow') === '1') {
  document.body.classList.add('no-glow');
  glowToggle.checked = false;
}
glowToggle.addEventListener('change', function () {
  if (glowToggle.checked) {
    document.body.classList.remove('no-glow');
    localStorage.removeItem('noGlow');
  } else {
    document.body.classList.add('no-glow');
    localStorage.setItem('noGlow', '1');
  }
});

// ---- 液体玻璃开关 ----
var glassToggle = document.getElementById('glass-toggle');
if (localStorage.getItem('noGlass') === '1') {
  document.body.classList.add('no-glass');
  glassToggle.checked = false;
}
glassToggle.addEventListener('change', function () {
  if (glassToggle.checked) {
    document.body.classList.remove('no-glass');
    localStorage.removeItem('noGlass');
  } else {
    document.body.classList.add('no-glass');
    localStorage.setItem('noGlass', '1');
  }
});

// ---- 隐藏设置按钮（鼠标移到右上角才显现）----
var hideBtnToggle = document.getElementById('hidebtn-toggle');
if (localStorage.getItem('hideSettings') === '1') {
  document.body.classList.add('hide-settings');
  hideBtnToggle.checked = true;
}
hideBtnToggle.addEventListener('change', function () {
  if (hideBtnToggle.checked) {
    document.body.classList.add('hide-settings');
    localStorage.setItem('hideSettings', '1');
  } else {
    document.body.classList.remove('hide-settings', 'peek-settings');
    localStorage.removeItem('hideSettings');
  }
});
document.addEventListener('mousemove', function (e) {
  if (!document.body.classList.contains('hide-settings')) return;
  var near = e.clientX > window.innerWidth - 140 && e.clientY < 140;
  document.body.classList.toggle('peek-settings', near);
});

// ---- 空闲隐藏输入框（可自定义时间）----
var idleToggle = document.getElementById('idle-toggle');
var idleSecsEl = document.getElementById('idle-secs');
var idleMinus = document.getElementById('idle-minus');
var idlePlus = document.getElementById('idle-plus');
var idleTimer = null;
var idleSecs = parseInt(localStorage.getItem('idleSecs'), 10) || 5;
idleSecsEl.textContent = idleSecs;

function setSecs(v) {
  idleSecs = Math.min(600, Math.max(1, v || 5));
  idleSecsEl.textContent = idleSecs;
  localStorage.setItem('idleSecs', idleSecs);
  if (idleToggle.checked) resetIdle();
  if (typeof dockIdleToggle !== 'undefined' && dockIdleToggle.checked) resetDockIdle();
}
idleMinus.addEventListener('click', function () {
  setSecs(idleSecs - (idleSecs > 10 ? 5 : 1));
});
idlePlus.addEventListener('click', function () {
  setSecs(idleSecs + (idleSecs >= 10 ? 5 : 1));
});

// 直接点数字输入
idleSecsEl.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); idleSecsEl.blur(); return; }
  var ok = /[0-9]/.test(e.key) ||
    ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].indexOf(e.key) !== -1;
  if (!ok) e.preventDefault();
});
idleSecsEl.addEventListener('focus', function () {
  var r = document.createRange();
  r.selectNodeContents(idleSecsEl);
  var sel = window.getSelection();
  sel.removeAllRanges(); sel.addRange(r);
});
idleSecsEl.addEventListener('blur', function () {
  setSecs(parseInt(idleSecsEl.textContent, 10));
});

function showSearch() {
  document.body.classList.remove('searchbox-hidden');
}
function resetIdle() {
  showSearch();
  clearTimeout(idleTimer);
  if (!idleToggle.checked) return;
  idleTimer = setTimeout(function () {
    // 输入框有内容或聚焦时不隐藏
    if (document.activeElement === input || input.value.trim()) { resetIdle(); return; }
    document.body.classList.add('searchbox-hidden');
    suggest.classList.remove('show');
  }, idleSecs * 1000);
}
function startIdle() {
  ['mousemove', 'keydown', 'click', 'wheel', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, resetIdle, { passive: true });
  });
  resetIdle();
}
function stopIdle() {
  clearTimeout(idleTimer);
  showSearch();
}

if (localStorage.getItem('idleHide') === '1') {
  idleToggle.checked = true;
  startIdle();
}
idleToggle.addEventListener('change', function () {
  if (idleToggle.checked) {
    localStorage.setItem('idleHide', '1');
    startIdle();
  } else {
    localStorage.removeItem('idleHide');
    stopIdle();
  }
});

// ==================== 动态视频背景 + 壁纸库 ====================
var bg = document.getElementById('bg');
var bgInput = document.getElementById('bg-input');
var bgToggle = document.getElementById('bg-toggle');
var galleryBtn = document.getElementById('bg-gallery-btn');
var drawer = document.getElementById('bg-drawer');
var wpGrid = document.getElementById('wp-grid');
var DB_NAME = 'yuniBg', STORE = 'wallpapers';
var currentUrl = null;
var tileUrls = [];

function openDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
      // 迁移旧的单个视频
      if (db.objectStoreNames.contains('files')) {
        try {
          var old = req.transaction.objectStore('files').get('video');
          old.onsuccess = function () {
            var blob = old.result;
            if (blob) {
              req.transaction.objectStore(STORE).add({
                name: '旧壁纸', size: blob.size || 0, lastModified: 0, blob: blob
              });
            }
          };
        } catch (e) {}
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function store(mode) {
  return openDB().then(function (db) {
    return db.transaction(STORE, mode).objectStore(STORE);
  });
}

function listWallpapers() {
  return store('readonly').then(function (s) {
    return new Promise(function (resolve, reject) {
      var req = s.getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function addWallpaper(file) {
  return listWallpapers().then(function (list) {
    var dup = list.filter(function (w) {
      return w.name === file.name && w.size === file.size;
    })[0];
    if (dup) return dup.id; // 同名同大小视为同一张，不重复添加
    return store('readwrite').then(function (s) {
      return new Promise(function (resolve, reject) {
        var req = s.add({ name: file.name, size: file.size, lastModified: file.lastModified, blob: file });
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      });
    });
  });
}

function getWallpaper(id) {
  return store('readonly').then(function (s) {
    return new Promise(function (resolve, reject) {
      var req = s.get(id);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function deleteWallpaper(id) {
  return store('readwrite').then(function (s) {
    return new Promise(function (resolve) { s.delete(id).onsuccess = resolve; });
  });
}

function getActiveId() { return parseInt(localStorage.getItem('activeWp'), 10) || null; }
function setActiveId(id) {
  if (id == null) localStorage.removeItem('activeWp');
  else localStorage.setItem('activeWp', id);
}

function applyBlob(blob) {
  if (currentUrl) URL.revokeObjectURL(currentUrl);
  currentUrl = URL.createObjectURL(blob);
  bg.src = currentUrl;
  document.body.classList.add('has-bg');
  bg.play().catch(function () {});
}

function applyWallpaper(id) {
  return getWallpaper(id).then(function (w) {
    if (!w) return;
    applyBlob(w.blob);
    setActiveId(id);
    bgToggle.checked = true;
    renderGallery();
  });
}

function hideBackground() {
  bg.pause(); bg.removeAttribute('src'); bg.load();
  if (currentUrl) { URL.revokeObjectURL(currentUrl); currentUrl = null; }
  document.body.classList.remove('has-bg');
}

// ---- 壁纸库抽屉（用测得的真实高度做动画，收放都跟手）----
var DRAWER_MAX = 320;
var drawerCloseTimer = null;

function openDrawer() {
  clearTimeout(drawerCloseTimer);
  drawer.classList.add('open');
  galleryBtn.classList.add('open');
  renderGallery(); // 渲染后在内部把 max-height 设为真实内容高度（不超过 320px）
}

function closeDrawer() {
  clearTimeout(drawerCloseTimer);
  // 先固定当前高度作为动画起点，下一帧再收到 0，才能平滑收起
  drawer.style.maxHeight = Math.min(drawer.scrollHeight, DRAWER_MAX) + 'px';
  requestAnimationFrame(function () {
    drawer.style.maxHeight = '0px';
  });
  drawer.style.overflow = 'hidden'; // 收起时不显示滚动条
  drawerCloseTimer = setTimeout(function () {
    clearTiles();
    drawer.style.maxHeight = '';
    drawer.style.overflow = '';
    drawer.classList.remove('open');
    galleryBtn.classList.remove('open');
  }, 450);
}

galleryBtn.addEventListener('click', function () {
  if (drawer.classList.contains('open')) closeDrawer();
  else openDrawer();
});

function clearTiles() {
  tileUrls.forEach(function (u) { URL.revokeObjectURL(u); });
  tileUrls = [];
  wpGrid.innerHTML = '';
}

// 抓取视频封面（首帧附近）生成静态图
function makePoster(blob) {
  return new Promise(function (resolve, reject) {
    var v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.playsInline = true;
    var url = URL.createObjectURL(blob);
    v.src = url;
    var done = false;
    function fail() { if (!done) { done = true; URL.revokeObjectURL(url); reject(new Error('poster fail')); } }
    function grab() {
      if (done) return; done = true;
      try {
        var w = v.videoWidth || 320, h = v.videoHeight || 200;
        var scale = Math.min(1, 400 / w);
        var c = document.createElement('canvas');
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          URL.revokeObjectURL(url);
          b ? resolve(b) : reject(new Error('toBlob null'));
        }, 'image/jpeg', 0.82);
      } catch (e) { URL.revokeObjectURL(url); reject(e); }
    }
    v.addEventListener('loadeddata', function () {
      var t = Math.min(1, (isFinite(v.duration) ? v.duration : 2) * 0.1);
      try { v.currentTime = t; } catch (e) { grab(); }
    });
    v.addEventListener('seeked', grab);
    v.addEventListener('error', fail);
    setTimeout(fail, 8000); // 兜底超时
  });
}

// 把封面写回库，下次直接用
function persistPoster(id, posterBlob) {
  return getWallpaper(id).then(function (w) {
    if (!w) return;
    w.poster = posterBlob;
    return store('readwrite').then(function (s) { s.put(w); });
  });
}

function renderGallery() {
  if (!drawer.classList.contains('open')) return;
  listWallpapers().then(function (list) {
    var active = getActiveId();
    clearTiles();
    list.forEach(function (w) {
      var tile = document.createElement('div');
      tile.className = 'wp-tile' + (w.id === active ? ' active' : '');
      var img = document.createElement('img');
      tile.appendChild(img);
      if (w.poster) {
        var pu = URL.createObjectURL(w.poster); tileUrls.push(pu); img.src = pu;
      } else {
        // 没有封面 → 抓取视频首帧，生成后缓存回库
        makePoster(w.blob).then(function (pb) {
          var pu = URL.createObjectURL(pb); tileUrls.push(pu); img.src = pu;
          persistPoster(w.id, pb);
        }).catch(function () {});
      }
      var del = document.createElement('button');
      del.className = 'wp-del'; del.textContent = '✕'; del.title = '删除';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteWallpaper(w.id).then(function () {
          if (w.id === active) {
            // 删的是正在用的 → 还有别的就切过去，一张都没了才关闭
            listWallpapers().then(function (rest) {
              if (rest.length) {
                applyWallpaper(rest[0].id);
              } else {
                setActiveId(null); hideBackground(); bgToggle.checked = false;
                renderGallery();
              }
            });
          } else {
            renderGallery();
          }
        });
      });
      tile.appendChild(del);
      tile.addEventListener('click', function () { applyWallpaper(w.id); });
      wpGrid.appendChild(tile);
    });
    // + 上传瓦片
    var add = document.createElement('div');
    add.className = 'wp-add'; add.textContent = '+'; add.title = '上传新壁纸';
    add.addEventListener('click', function () { bgInput.value = ''; bgInput.click(); });
    wpGrid.appendChild(add);

    // 撑开到真实内容高度（不超过 320px，超出可滚动）
    if (drawer.classList.contains('open')) {
      drawer.style.maxHeight = Math.min(drawer.scrollHeight, DRAWER_MAX) + 'px';
    }
  });
}

// ---- 上传 ----
bgInput.addEventListener('change', function () {
  var file = bgInput.files[0];
  if (!file) return;
  addWallpaper(file).then(function (id) { applyWallpaper(id); });
});

// ---- 开关：库为空强制上传；有库则直接应用 ----
bgToggle.addEventListener('change', function () {
  if (bgToggle.checked) {
    listWallpapers().then(function (list) {
      if (!list.length) {
        bgInput.value = ''; bgInput.click();
        setTimeout(function () {
          if (!document.body.classList.contains('has-bg')) bgToggle.checked = false;
        }, 800);
      } else {
        var id = getActiveId();
        if (!id || !list.some(function (w) { return w.id === id; })) id = list[0].id;
        applyWallpaper(id);
      }
    });
  } else {
    hideBackground();
  }
});

bgInput.addEventListener('cancel', function () {
  if (!document.body.classList.contains('has-bg')) bgToggle.checked = false;
});

// ---- 启动恢复上次背景 ----
listWallpapers().then(function (list) {
  if (!list.length) return;
  var id = getActiveId();
  if (id && list.some(function (w) { return w.id === id; })) applyWallpaper(id);
});

// ==================== 收藏夹 Dock ====================
var bmDock = document.getElementById('bm-dock');

// ---- 自定义书签（localStorage 持久化）----
function getCustomBMs() {
  try { return JSON.parse(localStorage.getItem('customBMs') || '[]'); }
  catch (e) { return []; }
}
function saveCustomBMs(list) {
  localStorage.setItem('customBMs', JSON.stringify(list));
}

// ---- 图标：扩展环境走 chrome://favicon，否则用首字母 ----
function faviconURL(url) {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    var a = document.createElement('a');
    a.href = url;
    var host = a.hostname;
    if (!host) return null;
    // Chrome/Edge: chrome://favicon; Firefox: Google favicon proxy
    if (typeof chrome.bookmarks !== "undefined" && chrome.bookmarks.getTree) {
      return "chrome://favicon/size/16@2x/" + a.protocol + "//" + host + "/";
    }
    return "https://www.google.com/s2/favicons?domain=" + host + "&sz=32";
  }
  return null;
}

function makePlaceholderEl(title) {
  var ph = document.createElement('span');
  ph.className = 'bm-icon placeholder';
  ph.textContent = (title || '?').charAt(0).toUpperCase();
  return ph;
}

// ---- 渲染 Dock ----
function renderDock(bookmarks) {
  bmDock.innerHTML = '';

  // 合并自定义书签（放到最后）
  var custom = getCustomBMs();
  var all = (bookmarks || []).concat(custom);

  all.forEach(function (bm) {
    var item = document.createElement('div');
    item.className = 'bm-item';
    item.title = bm.title + '\n' + bm.url;
    item.setAttribute('data-id', bm._id || '');

    // 图标
    if (bm._icon) {
      // 自定义图标（base64）
      var img = document.createElement('img');
      img.className = 'bm-icon';
      img.src = bm._icon;
      item.appendChild(img);
    } else {
      var icon = document.createElement('img');
      icon.className = 'bm-icon';
      var fv = faviconURL(bm.url);
      if (fv) {
        icon.src = fv;
        icon.onerror = function () {
          icon.style.display = 'none';
          item.insertBefore(makePlaceholderEl(bm.title), item.firstChild);
        };
      } else {
        icon.style.display = 'none';
        item.appendChild(makePlaceholderEl(bm.title));
      }
      item.appendChild(icon);
    }

    // 名称
    var name = document.createElement('span');
    name.className = 'bm-name';
    name.textContent = bm.title;
    item.appendChild(name);

    // 删除按钮（仅自定义书签有）
    if (bm._id) {
      var del = document.createElement('button');
      del.className = 'bm-del';
      del.textContent = '✕';
      del.title = '删除';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        removeCustomBM(bm._id);
      });
      item.appendChild(del);
    }

    item.addEventListener('click', function () {
      window.open(bm.url, '_self');
    });

    bmDock.appendChild(item);
  });

  // + 添加按钮
  var add = document.createElement('div');
  add.className = 'bm-add';
  add.textContent = '+';
  add.title = '添加书签';
  add.addEventListener('click', function (e) {
    e.stopPropagation();
    openBmForm();
  });
  bmDock.appendChild(add);

  // 无自定义书签时 + 始终可见
  document.body.classList.toggle('no-custom-bm', custom.length === 0);
}

// ---- 自定义书签 CRUD ----
function removeCustomBM(id) {
  var list = getCustomBMs().filter(function (b) { return b._id !== id; });
  saveCustomBMs(list);
  loadBookmarks();
}

// ---- 添加表单 ----
var bmFormWrap = document.getElementById('bm-form-wrap');
var bmForm = document.getElementById('bm-form');
var bmNameEl = document.getElementById('bm-name');
var bmUrlEl = document.getElementById('bm-url');
var bmSaveBtn = document.getElementById('bm-save');
var bmIconPick = document.getElementById('bm-icon-pick');
var bmIconInput = document.getElementById('bm-icon-input');
var bmIconData = null;

var bmHint = document.getElementById('bm-hint');

function openBmForm() {
  bmFormWrap.classList.add('open');
  bmNameEl.value = '';
  bmUrlEl.value = '';
  bmIconData = null;
  bmIconPick.innerHTML = '🖼';
  bmSaveBtn.disabled = true;
  bmHint.classList.remove('show');
  bmNameEl.focus();
}

function closeBmForm() {
  if (!bmFormWrap.classList.contains('open')) return;
  bmForm.classList.add('closing');
  bmForm.addEventListener('animationend', function onEnd() {
    bmForm.removeEventListener('animationend', onEnd);
    bmForm.classList.remove('closing');
    bmFormWrap.classList.remove('open');
  });
}

bmForm.addEventListener('submit', function (e) {
  e.preventDefault();
  var title = bmNameEl.value.trim();
  var url = bmUrlEl.value.trim();
  if (!title && !url) {
    bmHint.textContent = '请填写名称和网址';
    bmHint.classList.add('show');
    return;
  }
  if (!title) {
    bmHint.textContent = '请填写名称';
    bmHint.classList.add('show');
    return;
  }
  if (!url) {
    bmHint.textContent = '请填写网址';
    bmHint.classList.add('show');
    return;
  }
  bmHint.classList.remove('show');
  // 自动补 https://
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  var list = getCustomBMs();
  list.push({
    _id: 'c' + Date.now(),
    title: title,
    url: url,
    _icon: bmIconData || null
  });
  saveCustomBMs(list);
  closeBmForm();
  loadBookmarks();
});

document.getElementById('bm-cancel').addEventListener('click', closeBmForm);

// 输入校验
function checkBmForm() {
  bmSaveBtn.disabled = !bmNameEl.value.trim() || !bmUrlEl.value.trim();
}
bmNameEl.addEventListener('input', checkBmForm);
bmUrlEl.addEventListener('input', checkBmForm);

// 图标上传
bmIconPick.addEventListener('click', function () { bmIconInput.value = ''; bmIconInput.click(); });
bmIconInput.addEventListener('change', function () {
  var file = bmIconInput.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    bmIconData = reader.result;
    bmIconPick.innerHTML = '<img src="' + bmIconData + '" alt="">';
  };
  reader.readAsDataURL(file);
});

// 点击外部关闭表单
document.addEventListener('click', function (e) {
  if (bmFormWrap.classList.contains('open') &&
      !bmFormWrap.contains(e.target) &&
      e.target.className !== 'bm-add') {
    closeBmForm();
  }
});

// ---- 加载书签 ----
function loadBookmarks() {
  if (typeof chrome === 'undefined' || !chrome.bookmarks) {
    renderDock([]);
    return;
  }

  chrome.bookmarks.getTree().then(function (tree) {
    // 找"书签栏 / Bookmarks Bar"节点
    var bar = null;
    function walk(nodes) {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.title === '书签栏' || n.title === 'Bookmarks Bar' ||
            n.title === 'Bookmarks bar' || n.title === 'bookmarks bar') {
          bar = n;
          return;
        }
        if (n.children) walk(n.children);
      }
    }
    walk(tree);

    function flatten(nodes) {
      var all = [];
      for (var j = 0; j < nodes.length; j++) {
        var c = nodes[j];
        if (c.url) all.push(c);
        if (c.children) all = all.concat(flatten(c.children));
      }
      return all;
    }

    var bookmarks = [];
    if (bar && bar.children) {
      bookmarks = flatten(bar.children);
    } else {
      var root = tree[0];
      if (root && root.children) bookmarks = flatten(root.children);
    }

    renderDock(bookmarks.slice(0, 30));
  }).catch(function (err) {
    console.error('[Dock] Failed to load bookmarks:', err);
    renderDock([]);
  });
}

// ---- Dock 总开关 ----
var dockToggle = document.getElementById('dock-toggle');
if (localStorage.getItem('noDock') === '1') {
  document.body.classList.add('no-bmdock');
  dockToggle.checked = false;
}
dockToggle.addEventListener('change', function () {
  if (dockToggle.checked) {
    document.body.classList.remove('no-bmdock');
    localStorage.removeItem('noDock');
  } else {
    document.body.classList.add('no-bmdock');
    localStorage.setItem('noDock', '1');
  }
});

// ---- Dock 空闲隐藏开关（独立计时）----
var dockIdleToggle = document.getElementById('dock-idle-toggle');
var dockIdleTimer = null;
var dockActivityEvents = ['mousemove', 'keydown', 'click', 'wheel', 'touchstart'];

function showDock() {
  document.body.classList.remove('dock-hidden');
}

function resetDockIdle() {
  showDock();
  clearTimeout(dockIdleTimer);
  if (!dockIdleToggle.checked) return;
  dockIdleTimer = setTimeout(function () {
    document.body.classList.add('dock-hidden');
  }, idleSecs * 1000);
}

function startDockIdle() {
  dockActivityEvents.forEach(function (eventName) {
    document.addEventListener(eventName, resetDockIdle, { passive: true });
  });
  resetDockIdle();
}

function stopDockIdle() {
  dockActivityEvents.forEach(function (eventName) {
    document.removeEventListener(eventName, resetDockIdle);
  });
  clearTimeout(dockIdleTimer);
  showDock();
}

if (localStorage.getItem('dockIdle') === '1') {
  document.body.classList.add('dock-idle');
  dockIdleToggle.checked = true;
  startDockIdle();
}
dockIdleToggle.addEventListener('change', function () {
  if (dockIdleToggle.checked) {
    document.body.classList.add('dock-idle');
    localStorage.setItem('dockIdle', '1');
    startDockIdle();
  } else {
    document.body.classList.remove('dock-idle');
    localStorage.removeItem('dockIdle');
    stopDockIdle();
  }
});

// ---- 管理 Dock（编辑模式）----
var manageDockToggle = document.getElementById('manage-dock-toggle');

function enterEditMode() {
  document.body.classList.add('bm-edit');
  manageDockToggle.checked = true;
}
function exitEditMode() {
  document.body.classList.remove('bm-edit');
  manageDockToggle.checked = false;
}

manageDockToggle.addEventListener('change', function () {
  if (manageDockToggle.checked) {
    enterEditMode();
  } else {
    exitEditMode();
  }
});

// 启动加载
loadBookmarks();

