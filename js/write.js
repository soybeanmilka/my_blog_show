/* ================================================================
   豆浆小屋 · 在线写作页（/write/）
   1. 工具栏插入 Markdown
   2. 实时预览（marked）
   3. 生成 Hugo frontmatter + 复制 / 下载 / 跳转 GitHub
   4. 草稿自动保存 localStorage
   ================================================================ */
(function () {
  'use strict'

  var STORE_KEY = 'doujiang_write_draft_v1'

  var $ = function (id) { return document.getElementById(id) }
  var title = $('write-title')
  var slug = $('write-slug')
  var desc = $('write-description')
  var cats = $('write-categories')
  var tags = $('write-tags')
  var emoji = $('write-emoji')
  var draft = $('write-draft')
  var editor = $('write-editor')
  var preview = $('write-preview')
  if (!editor || !preview) return

  /* ---------- 工具栏：在光标处插入 Markdown ---------- */
  var SNIPPETS = {
    bold: ['**', '**', '加粗文字'],
    italic: ['*', '*', '斜体文字'],
    h2: ['\n## ', '', '二级标题'],
    h3: ['\n### ', '', '三级标题'],
    code: ['`', '`', 'code'],
    codeblock: ['\n```cpp\n', '\n```\n', '// 代码'],
    link: ['[', '](https://)', '链接文字'],
    image: ['![](', ')', '图片路径'],
    quote: ['\n> ', '', '引用内容'],
    ul: ['\n- ', '', '列表项'],
    ol: ['\n1. ', '', '列表项'],
    math: ['$', '$', 'x^2'],
    mathblock: ['\n$$\n', '\n$$\n', 'E = mc^2'],
    table: ['\n| 列1 | 列2 |\n| --- | --- |\n| 值 | 值 |\n', '', '']
  }

  function insertAtCursor (pre, post, selText) {
    var start = editor.selectionStart
    var end = editor.selectionEnd
    var selected = editor.value.slice(start, end) || selText
    var val = editor.value
    editor.value = val.slice(0, start) + pre + selected + post + val.slice(end)
    var pos = start + pre.length + selected.length
    editor.focus()
    editor.setSelectionRange(pos, pos + post.length)
    renderPreview()
    saveDraft()
  }

  document.getElementById('write-toolbar').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-role]')
    if (!btn) return
    var role = btn.getAttribute('data-role')
    var s = SNIPPETS[role]
    if (s) insertAtCursor(s[0], s[1], s[2])
  })

  /* ---------- 实时预览 ---------- */
  var PREVIEW_TAG = ['h1', 'h2', 'h3', 'h4', 'table', 'blockquote', 'ul', 'ol', 'pre', 'p', 'img', 'hr']
  function renderPreview () {
    var md = editor.value
    var html = ''
    try {
      if (window.marked) {
        html = window.marked.parse(md)
      } else {
        html = '<p><i>预览组件加载中……</i></p>'
      }
    } catch (err) {
      html = '<p style="color:#e868a8">预览出错：' + err.message + '</p>'
    }
    var wrap = document.createElement('div')
    wrap.innerHTML = html
    var empty = !wrap.textContent.trim()
    preview.innerHTML = empty
      ? '<p class="write-preview-empty">写点东西，预览会出现在这里 ✍️</p>'
      : html
    var tags = wrap.querySelectorAll ? PREVIEW_TAG : []
    var tagsFound = 0
    if (wrap.querySelectorAll) {
      for (var i = 0; i < PREVIEW_TAG.length; i++) {
        tagsFound += wrap.querySelectorAll(PREVIEW_TAG[i]).length
      }
    }
    if (!tagsFound && !empty) {
      preview.innerHTML = '<p class="write-preview-empty">只有纯文本？试试 Markdown 语法加粗、列表、代码块～</p>'
    }
  }

  var previewTimer = null
  editor.addEventListener('input', function () {
    clearTimeout(previewTimer)
    previewTimer = setTimeout(function () { renderPreview(); saveDraft() }, 200)
  })

  /* ---------- 生成 Hugo 文件 ---------- */
  function toSafeSlug (raw) {
    var s = (raw || '').trim().toLowerCase()
    s = s.replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-')
    s = s.replace(/-{2,}/g, '-').replace(/^-|-$/g, '')
    return s
  }

  function buildFile () {
    var now = new Date()
    var y = now.getFullYear()
    var m = ('0' + (now.getMonth() + 1)).slice(-2)
    var d = ('0' + now.getDate()).slice(-2)
    var dateStr = y + '-' + m + '-' + d

    var t = (title.value || '').trim()
    var s = toSafeSlug(slug.value || t)
    var descText = (desc.value || '').trim()
    var catsArr = (cats.value || '').split(/[,，]/).map(function (x) { return x.trim() }).filter(Boolean)
    var tagsArr = (tags.value || '').split(/[,，]/).map(function (x) { return x.trim() }).filter(Boolean)
    var emojiText = (emoji.value || '').trim()
    var isDraft = draft.checked

    var fm = []
    fm.push('---')
    fm.push('title: "' + t + '"')
    fm.push('date: ' + dateStr)
    if (descText) fm.push('description: "' + descText + '"')
    if (catsArr.length) fm.push('categories: ' + JSON.stringify(catsArr))
    if (tagsArr.length) fm.push('tags: ' + JSON.stringify(tagsArr))
    fm.push('draft: ' + (isDraft ? 'true' : 'false'))
    if (emojiText) fm.push('emoji: "' + emojiText + '"')
    fm.push('---')
    fm.push('')

    return { slug: s, content: fm.join('\n') + editor.value }
  }

  function currentFile () {
    return buildFile()
  }

  /* ---------- 复制 ---------- */
  $('write-copy').addEventListener('click', function () {
    var file = currentFile()
    if (!file.slug && !file.content.trim()) {
      alert('先写点内容再复制吧～')
      return
    }
    navigator.clipboard.writeText(file.content).then(function () {
      var btn = $('write-copy')
      var old = btn.innerHTML
      btn.innerHTML = '<i class="fas fa-check fa-fw"></i>&nbsp;已复制！'
      setTimeout(function () { btn.innerHTML = old }, 1600)
    }).catch(function () {
      prompt('复制失败，手动复制下面的内容：', file.content)
    })
  })

  /* ---------- 下载 ---------- */
  $('write-download').addEventListener('click', function () {
    var file = currentFile()
    if (!file.content.trim()) {
      alert('先写点内容再下载吧～')
      return
    }
    var blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' })
    var a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'index.md'
    a.click()
    setTimeout(function () { URL.revokeObjectURL(a.href) }, 3000)
  })

  /* ---------- 跳转 GitHub 新建文件 ---------- */
  $('write-github').addEventListener('click', function () {
    var file = currentFile()
    if (!file.slug) {
      alert('请先填写标题，才能生成文件路径～')
      return
    }
    var path = 'content/posts/' + file.slug + '/index.md'
    var url = 'https://github.com/soybeanmilka/my_blog_source/new/main/' + path
    window.open(url, '_blank')
  })

  /* ---------- 清空 ---------- */
  $('write-reset').addEventListener('click', function () {
    if (!confirm('确定清空所有内容吗？草稿也会被删除。')) return
    ;['write-title', 'write-slug', 'write-description', 'write-categories', 'write-tags', 'write-emoji'].forEach(function (id) {
      document.getElementById(id).value = ''
    })
    editor.value = ''
    draft.checked = true
    renderPreview()
    localStorage.removeItem(STORE_KEY)
  })

  /* ---------- 草稿自动保存 ---------- */
  function saveDraft () {
    try {
      var data = {
        title: title.value,
        slug: slug.value,
        desc: desc.value,
        cats: cats.value,
        tags: tags.value,
        emoji: emoji.value,
        draft: draft.checked,
        body: editor.value,
        ts: Date.now()
      }
      localStorage.setItem(STORE_KEY, JSON.stringify(data))
    } catch (e) {}
  }

  function loadDraft () {
    try {
      var raw = localStorage.getItem(STORE_KEY)
      if (!raw) return
      var data = JSON.parse(raw)
      if (!data || !data.body) return
      title.value = data.title || ''
      slug.value = data.slug || ''
      desc.value = data.desc || ''
      cats.value = data.cats || ''
      tags.value = data.tags || ''
      emoji.value = data.emoji || ''
      draft.checked = data.draft !== false
      editor.value = data.body
      renderPreview()
    } catch (e) {}
  }

  ;['write-title', 'write-slug', 'write-description', 'write-categories', 'write-tags', 'write-emoji'].forEach(function (id) {
    document.getElementById(id).addEventListener('input', saveDraft)
  })
  draft.addEventListener('change', saveDraft)

  renderPreview()
  loadDraft()
})()
