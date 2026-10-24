/* ================================================================
   豆浆小屋 · 主页交互脚本（v12 整理版）
   1. 动态视频壁纸 / 纯渐变 双模式背景（⚙️设置面板切换，访客侧持久化）
   2. 飘落花瓣（樱花+搭配粒子，可在面板关闭）
   3. 打字机标题（只打一次）
   4. 主题切换圆环扩散（黑白双主题）
   5. PJAX 切页不断歌
   6. 网易云音乐播放器（含歌单缓存/续播）
   ================================================================ */
(function () {
  'use strict'

  /* 网易云音乐 meting API 兜底 */
  window.meting_api = window.meting_api || 'https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&r=:r'

  /* ---------- 访客特效状态（localStorage 持久化，访客各自保存） ---------- */
  var FXKEY = 'doujiang_fx'
  function loadFx () {
    var fx = { wallpaper: 'video', petals: true }
    try {
      var raw = localStorage.getItem(FXKEY)
      if (raw) {
        var saved = JSON.parse(raw)
        for (var k in fx) if (saved[k] !== undefined) fx[k] = saved[k]
      }
    } catch (e) {}
    return fx
  }
  function saveFx (fx) { try { localStorage.setItem(FXKEY, JSON.stringify(fx)) } catch (e) {} }
  var FX = loadFx()

  function reducedMotion () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  /* ---------- 背景层：动态视频 / 纯渐变，按状态构建 ---------- */
  function buildBG () {
    var old1 = document.getElementById('dj-video-bg')
    var old2 = document.getElementById('dj-simple-bg')
    if (old1) old1.remove()
    if (old2) old2.remove()
    var wrap = document.createElement('div')
    wrap.id = FX.wallpaper === 'gradient' ? 'dj-simple-bg' : 'dj-video-bg'
    wrap.setAttribute('aria-hidden', 'true')
    if (FX.wallpaper === 'gradient') {
      document.body.insertBefore(wrap, document.body.firstChild)
    } else {
      var home = document.querySelector('.dj-home')
      var src = (home && home.getAttribute('data-bg-video')) || '/media/bg-cat.mp4'
      var poster = (home && home.getAttribute('data-bg-poster')) || ''
      wrap.innerHTML =
        '<video autoplay loop muted playsinline preload="auto" poster="' + poster + '">' +
        '<source src="' + src + '" type="video/mp4"></video>' +
        '<div class="dj-video-overlay"></div>'
      document.body.insertBefore(wrap, document.body.firstChild)
    }
  }

  /* ---------- 飘落花瓣（樱花+搭配粒子） ---------- */
  function initPetals () {
    if (reducedMotion()) return
    if (window.innerWidth < 720) return
    if (!FX.petals) return
    var icons = ['\u{1F338}', '\u{1F338}', '\u{2728}', '\u{1FAE7}', '\u{1F338}', '\u{2728}']
    var field = document.createElement('div')
    field.id = 'petal-field'
    field.setAttribute('aria-hidden', 'true')
    document.body.appendChild(field)
    var count = Math.max(8, Math.min(16, Math.floor(window.innerWidth / 95)))
    for (var i = 0; i < count; i++) {
      var p = document.createElement('span')
      p.className = 'petal'
      p.textContent = icons[i % icons.length]
      p.style.left = (Math.random() * 100).toFixed(1) + 'vw'
      p.style.fontSize = (10 + Math.random() * 13).toFixed(1) + 'px'
      p.style.setProperty('--drift', (Math.random() * 8 - 4).toFixed(1))
      p.style.animationDuration = (9 + Math.random() * 11).toFixed(1) + 's'
      p.style.animationDelay = (-Math.random() * 22).toFixed(1) + 's'
      p.style.opacity = (0.35 + Math.random() * 0.5).toFixed(2)
      field.appendChild(p)
    }
  }

  /* ---------- 打字机效果（只打一次，不循环） ---------- */
  function initTypewriter () {
    var el = document.querySelector('.dj-idcard-title')
    if (!el || el.__typed) return
    el.__typed = true
    var text = el.textContent
    el.textContent = ''
    el.style.minHeight = '1.5em'
    var cursor = document.createElement('span')
    cursor.className = 'dj-type-cursor'
    cursor.textContent = '▍'
    el.appendChild(cursor)
    var i = 0
    var timer = setInterval(function () {
      if (i >= text.length) {
        clearInterval(timer)
        setTimeout(function () { cursor.remove() }, 900)
        return
      }
      cursor.insertAdjacentText('beforebegin', text.charAt(i++))
    }, 85)
  }

  /* ---------- 回顶按钮：平滑滚回顶部 ---------- */
  function initBackToTop () {
    var btn = document.getElementById('back-to-top-button')
    if (!btn || btn.__fixed) return
    btn.__fixed = true
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  /* ---------- 主题切换：黑白双主题 + 圆环扩散（View Transitions） ---------- */
  function applyThemeDirect (theme) {
    document.body.setAttribute('theme', theme)
    document.documentElement.style.setProperty('color-scheme', theme === 'light' ? 'light' : 'dark')
    try { localStorage.setItem('theme', theme) } catch (e) {}
    window.isDark = !(theme === 'light')
  }

  function applyThemeCircle (theme) {
    if (!document.startViewTransition || reducedMotion()) {
      applyThemeDirect(theme)
      return
    }
    var vt = document.startViewTransition(function () { applyThemeDirect(theme) })
    vt.ready.then(function () {
      var pos = window.__djTogglePos || { x: window.innerWidth - 48, y: 38 }
      var R = Math.hypot(
        Math.max(pos.x, window.innerWidth - pos.x),
        Math.max(pos.y, window.innerHeight - pos.y)
      )
      document.documentElement.animate(
        { clipPath: [
            'circle(0px at ' + pos.x + 'px ' + pos.y + 'px)',
            'circle(' + R + 'px at ' + pos.x + 'px ' + pos.y + 'px)'
          ] },
        { duration: 450, easing: 'cubic-bezier(0.3, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
      )
    }).catch(function () {})
  }

  function initThemeReveal () {
    if (!document.startViewTransition) return
    /* 捕获阶段拦截：只允许 黑↔白 两个主题，拦下 DoIt 的 dark→black→light 三段循环 */
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.theme-switch') : null
      if (!t) return
      e.stopPropagation()
      e.preventDefault()
      var r = t.getBoundingClientRect()
      window.__djTogglePos = {
        x: e.clientX || r.left + r.width / 2,
        y: e.clientY || r.top + r.height / 2
      }
      var cur = document.body.getAttribute('theme') || 'dark'
      var next = cur === 'dark' ? 'light' : 'dark'
      applyThemeCircle(next)
    }, true)
  }

  /* ---------- PJAX：切页只换正文，页脚播放器不断歌 ---------- */
  var pjaxEnabled = 'pushState' in window.history && !!window.fetch && !!window.DOMParser

  function pjaxBar () {
    var bar = document.getElementById('pjax-bar')
    if (!bar) {
      bar = document.createElement('div')
      bar.id = 'pjax-bar'
      document.body.appendChild(bar)
    }
    return bar
  }

  function pjaxSwap (html, url, push) {
    var doc = new DOMParser().parseFromString(html, 'text/html')
    var from = document.querySelector('main.main .container')
    var to = doc.querySelector('main.main .container')
    if (!from || !to) throw new Error('pjax: container missing')
    from.innerHTML = to.innerHTML
    document.title = doc.title
    if (push) window.history.pushState({ pjax: true }, '', url)
    window.scrollTo(0, 0)
    if (window.__doitReinitContent) {
      try { window.__doitReinitContent() } catch (e) {}
    }
    if (window.__djPageInit) {
      try { window.__djPageInit() } catch (e) {}
    }
    /* 新内容滑入动画 */
    document.body.classList.remove('pjax-loading')
    document.body.classList.add('pjax-in')
    setTimeout(function () { document.body.classList.remove('pjax-in') }, 500)
  }

  function pjaxNavigate (url, push) {
    document.body.classList.add('pjax-loading')
    pjaxBar()
    fetch(url, { headers: { 'X-PJAX': '1' } })
      .then(function (r) {
        if (!r.ok) throw new Error('pjax: http ' + r.status)
        return r.text()
      })
      .then(function (html) {
        pjaxSwap(html, url, push)
      })
      .catch(function () {
        window.location.href = url
      })
  }

  function initPjax () {
    if (!pjaxEnabled) return
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      var a = e.target.closest ? e.target.closest('a') : null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      if (a.hasAttribute('data-no-pjax')) return
      var href = a.getAttribute('href') || ''
      if (!href || href.charAt(0) === '#' ||
          href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0 ||
          href.indexOf('javascript:') === 0) return
      var url
      try { url = new URL(a.href, window.location.href) } catch (err) { return }
      if (url.origin !== window.location.origin) return
      if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|zip|xml|json|txt|pdf|mp3|mp4|woff2?)$/i.test(url.pathname)) return
      if (url.pathname === window.location.pathname && url.hash) return
      if (url.href === window.location.href) return
      e.preventDefault()
      pjaxNavigate(url.href, true)
    })
    window.addEventListener('popstate', function () {
      pjaxNavigate(window.location.href, false)
    })
  }

  /* ---------- 网易云音乐播放器（歌单缓存 + 切页续播） ---------- */
  var PLAYER_STORAGE = 'doujiang_player_state'
  var PLAYLIST_STORAGE = 'doujiang_playlist_cache'
  var PLAYLIST_TTL = 4 * 60 * 60 * 1000
  var playerEl = null
  var playerInst = null

  function getPlayerEl () {
    if (!playerEl) playerEl = document.querySelector('#music-player')
    return playerEl
  }

  function buildApiUrl (el) {
    var api = el.getAttribute('data-api') || 'https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&r=:r'
    return api
      .replace(':server', el.getAttribute('data-server') || 'netease')
      .replace(':type', el.getAttribute('data-type') || 'playlist')
      .replace(':id', el.getAttribute('data-id') || '')
      .replace(':r', Math.random())
  }

  function toAudio (song) {
    return {
      name: song.name || '',
      artist: song.artist || '',
      url: song.url || '',
      cover: song.pic || song.cover || ''
    }
  }

  function createPlayer (el, list) {
    playerInst = new APlayer({
      container: el,
      fixed: true,
      mini: true,
      mutex: true,
      theme: el.getAttribute('data-theme') || '#f78fb3',
      order: el.getAttribute('data-order') || 'random',
      listFolded: true,
      listMaxHeight: '240px',
      audio: list.map(toAudio)
    })
    el.aplayer = playerInst
  }

  function initMusicPlayer (done) {
    var el = getPlayerEl()
    if (!el || !window.APlayer || el.aplayer) return
    var cached = null
    try {
      var raw = localStorage.getItem(PLAYLIST_STORAGE)
      if (raw) {
        var data = JSON.parse(raw)
        if (data && Array.isArray(data.list) && data.list.length &&
            Date.now() - (data.ts || 0) < PLAYLIST_TTL) {
          cached = data.list
        }
      }
    } catch (e) {}

    if (cached) {
      createPlayer(el, cached)
      if (done) done()
      fetch(buildApiUrl(el)).then(function (r) { return r.json() }).then(function (list) {
        if (list && list.length) {
          try { localStorage.setItem(PLAYLIST_STORAGE, JSON.stringify({ ts: Date.now(), list: list })) } catch (e) {}
        }
      }).catch(function () {})
      return
    }

    fetch(buildApiUrl(el)).then(function (r) { return r.json() }).then(function (list) {
      if (!list || !list.length) return
      try { localStorage.setItem(PLAYLIST_STORAGE, JSON.stringify({ ts: Date.now(), list: list })) } catch (e) {}
      createPlayer(el, list)
      if (done) done()
    }).catch(function () {})
  }

  function savePlayerState () {
    try {
      var player = playerInst
      if (!player || !player.list || !player.list.audios) return
      var audio = player.audio
      if (!audio || isNaN(audio.currentTime)) return
      var current = player.list.audios[player.index] || {}
      localStorage.setItem(PLAYER_STORAGE, JSON.stringify({
        url: current.url || audio.currentSrc || '',
        name: current.name || '',
        time: audio.currentTime,
        playing: !audio.paused
      }))
    } catch (e) {}
  }

  function applyPlayerRestore (player, state) {
    var audios = player.list.audios
    var index = -1
    for (var i = 0; i < audios.length; i++) {
      if (audios[i].url === state.url) { index = i; break }
    }
    if (index === -1) return
    if (index !== player.index) player.list.switch(index)
    var audio = player.audio
    var seek = function () {
      try {
        if (state.time > 1 && state.time < audio.duration - 1) {
          audio.currentTime = state.time
        }
      } catch (e) {}
      if (state.playing) {
        var p = player.play()
        if (p && p.catch) p.catch(function () {})
      }
    }
    if (audio.readyState >= 1) {
      seek()
    } else {
      audio.addEventListener('loadedmetadata', seek, { once: true })
    }
  }

  function restorePlayerState () {
    var raw = null
    try { raw = localStorage.getItem(PLAYER_STORAGE) } catch (e) {}
    if (!raw) return
    var state = null
    try { state = JSON.parse(raw) } catch (e) {}
    if (!state || typeof state.url !== 'string') return
    var tries = 0
    var timer = setInterval(function () {
      var player = playerInst
      if (player && player.list && player.list.audios && player.list.audios.length) {
        clearInterval(timer)
        applyPlayerRestore(player, state)
      } else if (++tries > 60) {
        clearInterval(timer)
      }
    }, 300)
  }

  window.addEventListener('pagehide', savePlayerState)
  window.addEventListener('beforeunload', savePlayerState)

  /* ---------- 特效设置面板：动态壁纸开关 + 落花开关（访客侧持久化） ---------- */
  function initFxPanel () {
    var panel = document.createElement('div')
    panel.className = 'dj-fx-panel'
    panel.hidden = true
    panel.innerHTML =
      '<div class="dj-fx-title">特效设置</div>' +
      '<div class="dj-fx-row"><span>🎞️ 动态壁纸</span>' +
      '  <button type="button" class="dj-fx-toggle" data-k="wallpaper"></button></div>' +
      '<div class="dj-fx-row"><span>🌸 飘落花瓣</span>' +
      '  <button type="button" class="dj-fx-toggle" data-k="petals"></button></div>' +
      '<div class="dj-fx-note">设置保存在访客自己的浏览器里</div>'
    document.body.appendChild(panel)

    function refresh () {
      panel.querySelectorAll('.dj-fx-toggle').forEach(function (b) {
        var k = b.dataset.k
        var on = k === 'wallpaper' ? FX.wallpaper === 'video' : !!FX.petals
        b.textContent = on ? '开' : '关'
        b.classList.toggle('off', !on)
      })
      var f = document.getElementById('petal-field')
      if (f) f.style.display = FX.petals ? '' : 'none'
    }
    function commit () { saveFx(FX); refresh(); buildBG() }

    panel.addEventListener('click', function (e) {
      if (e.target.dataset && e.target.dataset.k === 'wallpaper') {
        FX.wallpaper = FX.wallpaper === 'video' ? 'gradient' : 'video'
        commit()
      }
      if (e.target.dataset && e.target.dataset.k === 'petals') {
        FX.petals = !FX.petals
        commit()
      }
    })

    window.__djOpenFxPanel = function () {
      panel.hidden = false
      refresh()
    }
    refresh()
  }

  /* ---------- 页眉"设置"入口 → 特效面板 ---------- */
  function initFxEntry () {
    var a = Array.from(document.querySelectorAll('header a')).find(function (x) {
      return x.textContent.trim() === '设置'
    })
    if (!a) return
    a.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      if (window.__djOpenFxPanel) window.__djOpenFxPanel()
    })
  }

  /* ---------- 页面加载完成后执行 ---------- */
  function onReady () {
    buildBG()
    initPetals()
    initTypewriter()
    initBackToTop()
    initThemeReveal()
    initFxPanel()
    initFxEntry()
    initPjax()
    window.__djPageInit()
    initMusicPlayer(function () {
      restorePlayerState()
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady)
  } else {
    onReady()
  }
})()
