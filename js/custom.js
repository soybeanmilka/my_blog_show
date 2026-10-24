/* ================================================================
   豆浆小屋 · 主页交互脚本
   1. 飘落花瓣（樱花 + 泡泡）
   2. 点击头像冒出小爱心（延迟后仍正常跳转）
   3. 网易云音乐播放器兜底配置
   4. lvyovo 风 · 全屏柔光光斑背景（鼠标牵引）
   ================================================================ */
(function () {
  'use strict'

  /* 网易云音乐 meting API 兜底（元素上有 api 属性时用元素的） */
  window.meting_api = window.meting_api || 'https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&r=:r'

  /* ---------- 全屏柔光光斑背景 ---------- */
  function initGlowBg () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.innerWidth < 720) return
    var canvas = document.createElement('canvas')
    canvas.id = 'glow-bg'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.appendChild(canvas)
    var ctx = canvas.getContext('2d')
    var W = 0, H = 0
    var mouseX = -9999, mouseY = -9999
    var spots = []
    var colors = [
      [53, 191, 171],
      [31, 201, 231],
      [255, 182, 207],
      [168, 200, 255],
      [224, 214, 255],
      [128, 222, 212]
    ]
    function resize () {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    function makeSpots () {
      spots = []
      var count = Math.max(6, Math.min(10, Math.floor(W / 240)))
      for (var i = 0; i < count; i++) {
        spots.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 70 + Math.random() * 130,
          c: colors[i % colors.length],
          a: 0.10 + Math.random() * 0.08,
          vx: (Math.random() * 2 - 1) * 0.18,
          vy: (Math.random() * 2 - 1) * 0.14,
          phase: Math.random() * Math.PI * 2
        })
      }
    }
    function tick () {
      ctx.clearRect(0, 0, W, H)
      for (var i = 0; i < spots.length; i++) {
        var s = spots[i]
        s.x += s.vx + (mouseX - s.x) * 0.0015
        s.y += s.vy + (mouseY - s.y) * 0.0015
        if (s.x < -s.r) s.x = W + s.r; if (s.x > W + s.r) s.x = -s.r
        if (s.y < -s.r) s.y = H + s.r; if (s.y > H + s.r) s.y = -s.r
        var g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r)
        g.addColorStop(0, 'rgba(' + s.c[0] + ',' + s.c[1] + ',' + s.c[2] + ',' + s.a + ')')
        g.addColorStop(1, 'rgba(' + s.c[0] + ',' + s.c[1] + ',' + s.c[2] + ',0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
      requestAnimationFrame(tick)
    }
    function onMouse (e) {
      mouseX = e.clientX
      mouseY = e.clientY
    }
    function onTouch (e) {
      var t = e.touches && e.touches[0]
      if (t) { mouseX = t.clientX; mouseY = t.clientY }
    }
    resize()
    makeSpots()
    window.addEventListener('resize', function () {
      resize()
      makeSpots()
    })
    window.addEventListener('mousemove', onMouse, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    requestAnimationFrame(tick)
  }

  /* ---------- 飘落的花瓣 ---------- */
  function initPetals () {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.innerWidth < 720) return
    try { if ((JSON.parse(localStorage.getItem('doujiang_fx') || '{}').petals) === false) return } catch (e) {}
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

  /* ---------- 切页续播：歌单缓存 + 保存/恢复播放进度 ---------- */
  var PLAYER_STORAGE = 'doujiang_player_state'
  var PLAYLIST_STORAGE = 'doujiang_playlist_cache'
  var PLAYLIST_TTL = 4 * 60 * 60 * 1000   // 歌单缓存 4 小时
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
    var opts = {
      container: el,
      fixed: true,
      mini: true,
      mutex: true,
      theme: el.getAttribute('data-theme') || '#f78fb3',
      order: el.getAttribute('data-order') || 'random',
      listFolded: true,
      listMaxHeight: '240px',
      audio: list.map(toAudio)
    }
    playerInst = new APlayer(opts)
    el.aplayer = playerInst
  }

  /* 读歌单：先试缓存（秒开），没有再请求 API 并写缓存 */
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
      /* 后台静默刷新缓存（防止歌曲 URL 过期） */
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

  /* ---------- 点击头像冒出小爱心 ---------- */
  function initHeartBurst () {
    var avatar = document.querySelector('.home-avatar a')
    if (!avatar) return
    var icons = ['\u{1F496}', '\u{1FA77}', '\u2728', '\u{1F495}', '\u{1F5FF}', '\u{1F380}']
    avatar.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return
      var rect = avatar.getBoundingClientRect()
      var cx = rect.left + rect.width / 2
      var cy = rect.top + rect.height / 2
      for (var i = 0; i < 8; i++) {
        var span = document.createElement('span')
        span.className = 'heart-burst'
        span.textContent = icons[i % icons.length]
        span.style.left = (cx + (Math.random() * 60 - 30)) + 'px'
        span.style.top = (cy + (Math.random() * 30 - 15)) + 'px'
        span.style.animationDelay = (Math.random() * 0.25).toFixed(2) + 's'
        document.body.appendChild(span)
        ;(function (el) { setTimeout(function () { el.remove() }, 1400) })(span)
      }
    })
  }

  /* ---------- 评级条（学 huxx：Lv + 经验条，+1/秒，进度存 localStorage） ---------- */
  function initLvBar () {
    /* pjax 切页后元素是新的：用全局定时器，每秒重新查询元素 */
    if (window.__djLvTimer) { clearInterval(window.__djLvTimer); window.__djLvTimer = null }
    var KEY = 'doujiang_xp'
    var STEP = 300 /* 每 300 经验（5 分钟）升一级 */
    var xp = 0
    try { xp = parseInt(localStorage.getItem(KEY), 10) || 0 } catch (e) {}
    function render () {
      var n = document.getElementById('dj-lv-num')
      var f = document.getElementById('dj-lv-fill')
      if (!n || !f) return
      n.textContent = Math.floor(xp / STEP)
      f.style.width = (((xp % STEP) / STEP) * 100).toFixed(1) + '%'
    }
    render()
    window.__djLvTimer = setInterval(function () {
      xp++
      try { localStorage.setItem(KEY, xp) } catch (e) {}
      render()
    }, 1000)
  }

  /* ---------- 滚动变脸：往下滑，头像表情按进度轮换；到底变颜文字 ---------- */
  function initScrollFace () {
    var face = document.getElementById('dj-face')
    if (!face || face.__fxInit) return
    face.__fxInit = true
    var faces = []
    try { faces = JSON.parse(face.getAttribute('data-faces') || '[]') } catch (e) {}
    var kaomoji = face.getAttribute('data-bottom') || '(´･ω･`)'
    if (!faces.length) return
    var idx = -2
    var raf = 0
    function onScroll () {
      if (raf) return
      raf = requestAnimationFrame(function () {
        raf = 0
        var doc = document.documentElement.scrollHeight - window.innerHeight
        var prog = doc > 0 ? window.scrollY / doc : 0
        var next
        var isKao = prog >= 0.985
        if (isKao) {
          next = kaomoji
        } else {
          next = faces[Math.min(Math.floor(prog * faces.length), faces.length - 1)]
        }
        if (next !== face.textContent) {
          face.textContent = next
          face.classList.toggle('is-kaomoji', isKao)
          face.classList.remove('is-pop')
          void face.offsetWidth
          face.classList.add('is-pop')
        }
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  /* ---------- 滚动进场：卡片进入视口才弹出（带弹簧），弹出时头像笑脸跟着弹一下 ---------- */
  function bounceFace () {
    var face = document.getElementById('dj-face')
    if (!face) return
    face.classList.remove('is-pop')
    void face.offsetWidth
    face.classList.add('is-pop')
  }

  function initScrollReveal () {
    var els = document.querySelectorAll('[data-dj-reveal]')
    if (!els.length) return
    if (window.__djIO) { window.__djIO.disconnect(); window.__djIO = null }
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var en = entries[i]
        if (en.isIntersecting) {
          en.target.classList.add('is-in')
          bounceFace()
        } else {
          en.target.classList.remove('is-in') /* 滚出去再滚回来会重新弹一次 */
        }
      }
    }, { threshold: 0.15 })
    for (var j = 0; j < els.length; j++) io.observe(els[j])
    window.__djIO = io
  }

  /* ---------- 牛奶海背景：滚动 = 往牛奶海深处下潜，奶泡上浮 ---------- */
  function initMilkSea () {
    if (document.getElementById('milk-sea')) return
    var sea = document.createElement('div')
    sea.id = 'milk-sea'
    sea.setAttribute('aria-hidden', 'true')
    document.body.appendChild(sea)
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    var bubbles = []
    for (var i = 0; i < 14; i++) {
      var b = document.createElement('span')
      b.className = 'dj-bubble'
      var size = 5 + Math.random() * 26
      b.style.width = b.style.height = size.toFixed(1) + 'px'
      sea.appendChild(b)
      bubbles.push({
        el: b,
        x: Math.random() * 100,
        y: Math.random() * 1.15,
        speed: 0.015 + Math.random() * 0.05,
        size: size,
        phase: Math.random() * Math.PI * 2
      })
    }
    var lastScroll = window.scrollY || 0
    var dive = 0
    var lastTs = 0
    function tick (ts) {
      var dt = Math.min((ts - lastTs) / 1000 || 0.016, 0.05)
      lastTs = ts
      var sy = window.scrollY || 0
      dive = Math.min(0.6, dive * 0.9 + Math.abs(sy - lastScroll) * 0.003)
      lastScroll = sy
      var vh = window.innerHeight
      var doc = document.documentElement.scrollHeight - vh
      var prog = doc > 0 ? sy / doc : 0
      sea.style.backgroundPositionY = (prog * 200).toFixed(2) + '%'
      for (var i = 0; i < bubbles.length; i++) {
        var p = bubbles[i]
        p.y -= (p.speed + dive) * dt
        if (p.y < -0.08) {
          p.y = 1.08 + Math.random() * 0.1
          p.x = Math.random() * 100
        }
        var wob = Math.sin(ts * 0.001 + p.phase) * (6 + p.size * 0.2)
        p.el.style.transform =
          'translate(' + (p.x + wob / window.innerWidth * 100).toFixed(2) + 'vw, ' +
          (p.y * vh).toFixed(1) + 'px)'
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }

  /* pjax 切页后重新绑定页面级滚动特效 */
  window.__djPageInit = function () {
    initScrollReveal()
    initTypewriter()
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
        /* 出错就整页跳转兜底 */
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

  window.addEventListener('pagehide', savePlayerState)
  window.addEventListener('beforeunload', savePlayerState)

  /* ---------- 黄昏动态壁纸背景（Wallpaper Engine 预览图 + 磨砂模糊） ---------- */
  function initDuskBG () {
    if (document.getElementById('dj-dusk-bg')) return
    var wrap = document.createElement('div')
    wrap.id = 'dj-dusk-bg'
    wrap.setAttribute('aria-hidden', 'true')
    wrap.innerHTML = '<img src="/images/dusk-bg.webp" alt=""><div class="dj-dusk-overlay"></div>'
    document.body.insertBefore(wrap, document.body.firstChild)
  }

  /* ---------- 简易背景：纯 CSS 渐变（零媒体，不卡电脑） ---------- */
  var FXKEY = 'doujiang_fx'
  function loadFx () {
    var fx = { petals: true }
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
  var FX = null
  function initSimpleBG () {
    if (document.getElementById('dj-simple-bg')) return
    FX = loadFx()
    var wrap = document.createElement('div')
    wrap.id = 'dj-simple-bg'
    wrap.setAttribute('aria-hidden', 'true')
    document.body.insertBefore(wrap, document.body.firstChild)
    if (FX.blur > 0) wrap.style.filter = 'blur(' + FX.blur + 'px)'
  }

  /* ---------- 打字机效果（只打一次，不循环） ---------- */
  function initTypewriter () {
    var el = document.querySelector('.dj-idcard-title')
    if (!el || el.__typed) return
    el.__typed = true
    var text = el.textContent
    el.textContent = ''
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

  /* ---------- 主题切换：黑白双主题 + 从按钮位置圆环扩散 ---------- */
  function reducedMotion () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  function applyThemeDirect (theme) {
    /* 等效 DoIt setColorTheme（它在 esbuild 包内不暴露全局，只能自实现） */
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

  /* ---------- 回顶按钮：平滑滚回顶部（原生锚点在这个布局下不生效） ---------- */
  function initBackToTop () {
    var btn = document.getElementById('back-to-top-button')
    if (!btn || btn.__fixed) return
    btn.__fixed = true
    btn.addEventListener('click', function (e) {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  /* ---------- 特效设置面板：落花开关（访客侧持久化） ---------- */
  function initFxPanel () {
    var panel = document.createElement('div')
    panel.className = 'dj-fx-panel'
    panel.hidden = true
    panel.innerHTML =
      '<div class="dj-fx-title">特效设置</div>' +
      '<div class="dj-fx-row"><span>🌸 飘落花瓣</span>' +
      '  <button type="button" class="dj-fx-toggle" data-k="petals"></button></div>' +
      '<div class="dj-fx-row"><span>🌫️ 背景模糊</span>' +
      '  <input type="range" class="dj-fx-blur" min="0" max="16" step="1" aria-label="背景模糊程度"></div>' +
      '<div class="dj-fx-note">设置保存在访客自己的浏览器里</div>'
    document.body.appendChild(panel)

    function applyBlur () {
      var bg = document.getElementById('dj-simple-bg')
      if (bg) bg.style.filter = FX.blur > 0 ? 'blur(' + FX.blur + 'px)' : ''
    }
    function refresh () {
      panel.querySelector('[data-k="petals"]').textContent = FX.petals ? '开' : '关'
      panel.querySelector('[data-k="petals"]').classList.toggle('off', !FX.petals)
      panel.querySelector('.dj-fx-blur').value = FX.blur
      var f = document.getElementById('petal-field')
      if (f) f.style.display = FX.petals ? '' : 'none'
      applyBlur()
    }
    function commit () { saveFx(FX); refresh() }

    panel.addEventListener('click', function (e) {
      if (e.target.dataset && e.target.dataset.k === 'petals') {
        FX.petals = !FX.petals
        commit()
      }
    })
    panel.querySelector('.dj-fx-blur').addEventListener('input', function (e) {
      FX.blur = parseInt(e.target.value, 10) || 0
      saveFx(FX)
      applyBlur()
    })

    window.__djOpenFxPanel = function () {
      panel.hidden = false
      refresh()
    }
    refresh()
  }

  function onReady () {
    initSimpleBG()
    initTypewriter()
    initBackToTop()
    initThemeReveal()
    initPetals()
    initFxPanel()
    initHeartBurst()
    initPjax()
    initFxEntry()
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
