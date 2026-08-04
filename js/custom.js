/* ================================================================
   豆浆小屋 · 主页交互脚本
   1. 飘落花瓣（樱花 + 泡泡）
   2. 点击头像冒出小爱心（延迟后仍正常跳转）
   3. 网易云音乐播放器兜底配置
   ================================================================ */
(function () {
  'use strict'

  /* 网易云音乐 meting API 兜底（元素上有 api 属性时用元素的） */
  window.meting_api = window.meting_api || 'https://api.injahow.cn/meting/?server=:server&type=:type&id=:id&r=:r'

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
      initPetals()
      initHeartBurst()
    })
  } else {
    initPetals()
    initHeartBurst()
  }
})()
