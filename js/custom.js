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
    var icons = ['\u{1F338}', '\u{1F33A}', '\u{1F343}', '\u2728', '\u{1F4AE}', '\u{1FAE7}']
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

  /* 页面加载完成后执行 */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initGlowBg()
      initPetals()
      initHeartBurst()
    })
  } else {
    initGlowBg()
    initPetals()
    initHeartBurst()
  }
})()
