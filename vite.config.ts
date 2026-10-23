import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { parse as parseYaml } from 'yaml'

import siteConfiguration from './.figma/make/site.json'


// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.
  const emitSourcemaps = mode === 'development'

  return {
    base: process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      // JSX の変換先を src/jsx に（日本語の文節ごとに <wbr> を入れて、不自然な改行を防ぐ）
      react({ jsxImportSource: '@/jsx' }),
      tailwindcss(),
      figmaSiteConfiguration(siteConfiguration),
      coanaRemoteImages(),
      coanaPageMeta(),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}' }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      watch: {
        ignored: [
          '**/.figma/**',
],
      },
    },
    preview: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }
})

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */
function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function replaceHtmlCommentSlot(html: string, slotName: string, content: string): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "Figma Make App"
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitizeHtmlValue(config.language) || 'en'
  const googleAnalyticsId = sanitizeHtmlValue(config.analytics?.googleAnalyticsId)
  const headStart = config.customScripts?.headStart ?? ''
  const headEnd = config.customScripts?.headEnd ?? ''
  const bodyStart = config.customScripts?.bodyStart ?? ''
  const bodyEnd = config.customScripts?.bodyEnd ?? ''
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'figma-site-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, 'figma:lang', language)
        result = replaceHtmlCommentSlot(result, 'figma:title', escapeHtmlText(title))
        result = replaceHtmlCommentSlot(result, 'figma:head-start', headStart)
        result = replaceHtmlCommentSlot(result, 'figma:head-end', headEnd)
        result = replaceHtmlCommentSlot(result, 'figma:body-start', bodyStart)
        result = replaceHtmlCommentSlot(result, 'figma:body-end', bodyEnd)

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
        }
        if (config.robots?.index === false) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        if (favicon) {
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: favicon }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
        }
        if (description) {
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }
        if (socialImage) {
          tags.push(
            { tag: 'meta', attrs: { property: 'og:image', content: socialImage }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:image', content: socialImage }, injectTo: 'head' },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: 'head',
            },
            {
              tag: 'script',
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: 'head',
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'figma-bypass-link', href: '#root' },
              children: 'Skip to content',
              injectTo: 'body-prepend',
            },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */
function figmaErrorOverlayReplay(): Plugin {
  return {
    name: 'figma-error-overlay-replay',
    apply: 'serve',
    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (...args: any[]) => void
      server.ws.send = ((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === 'error') {
            lastError = payload as object
          } else if (type === 'update' || type === 'full-reload') {
            lastError = null
          }
        }
        return origSend(...args)
      }) as typeof server.ws.send

      server.ws.on('connection', (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: 'figma-react-refresh-boundary-fallback',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: 'full-reload', path: '*' })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes('/node_modules/')) return null

      const moduleId = id.split('?')[0] ?? id
      const hasRefreshBoundary = code.includes('registerExportsForReactRefresh')
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */
function figmaMakeKitPlugin(options: { storiesGlob: string | string[] }): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob) ? options.storiesGlob : [options.storiesGlob]
  const ROUTE = '/.figma/make/kit.html'
  const VIRTUAL_ID = 'virtual:figma-stories'
  const RESOLVED_ID = '\0' + VIRTUAL_ID
  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: 'figma-make-kit',
    apply: 'serve',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return STORIES_MODULE
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.split('?')[0] !== ROUTE) return next()

        try {
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}

/**
 * 外部の写真（Unsplash）をビルド時に取り込み、自社ドメイン（/images/remote/）から配信する。
 * - CMS に Unsplash の画像URLを貼るだけで、公開時に自動で WebP に最適化して自社ホストに切り替わる
 * - 取り込みに失敗した画像は、元のURLのまま表示される（サイトが壊れない）
 * - 対応表は virtual:remote-images として src/content.ts から参照する
 */
const remoteImageMap: Record<string, string> = {}
function coanaRemoteImages(): Plugin {
  const VIRTUAL_ID = 'virtual:remote-images'
  const RESOLVED_ID = '\0' + VIRTUAL_ID
  const files: { fileName: string; source: Uint8Array }[] = []
  let isBuild = false

  const collect = (value: unknown, out: Set<string>) => {
    if (typeof value === 'string') {
      if (/^https:\/\/images\.unsplash\.com\/photo-[\w-]+/.test(value)) out.add(value)
    } else if (Array.isArray(value)) {
      value.forEach((v) => collect(v, out))
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach((v) => collect(v, out))
    }
  }

  return {
    name: 'coana-remote-images',
    configResolved(config) {
      isBuild = config.command === 'build'
    },
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },
    load(id) {
      return id === RESOLVED_ID ? 'export default ' + JSON.stringify(remoteImageMap) : null
    },
    async buildStart() {
      if (!isBuild) return
      const urls = new Set<string>()
      const contentDir = path.resolve(__dirname, 'content')
      const jsonFiles = [
        ...fs.readdirSync(contentDir).filter((n) => n.endsWith('.json')).map((n) => path.join(contentDir, n)),
        ...(fs.existsSync(path.join(contentDir, 'solutions'))
          ? fs.readdirSync(path.join(contentDir, 'solutions')).filter((n) => n.endsWith('.json')).map((n) => path.join(contentDir, 'solutions', n))
          : []),
      ]
      for (const file of jsonFiles) {
        try { collect(JSON.parse(fs.readFileSync(file, 'utf8')), urls) } catch { /* 壊れたJSONは他のビルド処理でエラーになる */ }
      }
      const list = [...urls]
      let done = 0
      const worker = async () => {
        while (list.length) {
          const url = list.shift()!
          const id = (url.match(/photo-([\w-]+)/) || [])[1]
          const width = Math.min(2000, Number((url.match(/[?&]w=(\d+)/) || [])[1] || 1600))
          const fileName = 'images/remote/unsplash-' + id + '-w' + width + '.webp'
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 20000)
          try {
            const res = await fetch('https://images.unsplash.com/photo-' + id + '?fm=webp&q=72&fit=crop&w=' + width, { signal: controller.signal })
            const type = res.headers.get('content-type') || ''
            if (!res.ok || !type.startsWith('image/')) throw new Error(res.status + ' ' + type)
            files.push({ fileName, source: new Uint8Array(await res.arrayBuffer()) })
            remoteImageMap[url] = '/' + fileName
            done++
          } catch (error) {
            this.warn('外部画像を取り込めなかったため元のURLのまま使います: ' + url + ' (' + String(error) + ')')
          } finally {
            clearTimeout(timer)
          }
        }
      }
      await Promise.all(Array.from({ length: 6 }, worker))
      this.info?.('外部画像を自社ドメインに取り込みました: ' + done + '/' + urls.size)
    },
    generateBundle() {
      const seen = new Set<string>()
      for (const file of files) {
        if (seen.has(file.fileName)) continue
        seen.add(file.fileName)
        this.emitFile({ type: 'asset', fileName: file.fileName, source: file.source })
      }
    },
  }
}

/**
 * SEO：各ページ・各トピックス記事ごとに、タイトル・説明文・OGP・構造化データ（JSON-LD）を埋め込んだ HTML を書き出す。
 * あわせて sitemap.xml、RSS（feed.xml）、llms.txt、404.html を生成する。
 * 会社情報・サービス名・FAQ は content/ の JSON（CMSで編集する内容）から読み込む。
 */
/** リレー型の図（御社 → COANA TOKYO → 領域 → 戻り）を、順番の文章にする（クローラー・llms.txt・チャットの知識用） */
function relayFlow(scheme?: { type?: string; team_label?: string; client?: { label?: string; sub?: string; todo?: string }; center?: { label?: string; sub?: string }; steps?: string[]; nodes?: { label: string; partner?: boolean }[]; returns?: { label: string; sub?: string }[] }): string[] {
  if (!scheme || scheme.type !== 'relay') return []
  const part = (x?: { label?: string; sub?: string }) => (x?.label ? x.label + (x.sub ? '（' + x.sub + '）' : '') : '')
  const client = scheme.client?.todo ? { label: scheme.client.label, sub: scheme.client.todo } : scheme.client
  const returns = scheme.returns ?? []
  const out = [
    [scheme.steps?.[0], part(client) + ' → ' + part(scheme.center)].filter(Boolean).join('：'),
    [scheme.steps?.[1], (scheme.nodes ?? []).map((n) => n.label).join('・')].filter(Boolean).join('：'),
    // 最後の戻りは御社が受け取るもの。それより前は COANA TOKYO が担当する範囲
    ...returns.map((r, i) => (i === returns.length - 1 && returns.length > 1 ? '→ ' : '') + part(r)),
  ]
  return out.filter(Boolean)
}

function coanaPageMeta(): Plugin {
  const SITE = 'https://coana.co.jp'
  const SUFFIX = ' | COANA TOKYO合同会社'
  let outDir = 'dist'

  type PageMeta = { path: string; title: string; description: string; image?: string; type?: string; lastmod?: string; crumb?: string; jsonld?: object[]; preload?: string; lang?: 'ja' | 'en'; alternates?: { hreflang: string; href: string }[] }

  const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, rel), 'utf8'))
  const escapeAttr = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const absoluteUrl = (value: string) => (/^https?:\/\//.test(value) ? value : SITE + (value.startsWith('/') ? value : '/' + value))
  const stripHtml = (value: string) => value.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

  function setMeta(html: string, attr: 'name' | 'property', key: string, content: string) {
    const tag = '<meta ' + attr + '="' + key + '" content="' + escapeAttr(content) + '" />'
    const pattern = new RegExp('<meta\\s+' + attr + '="' + key.replace(/[.:]/g, '\\$&') + '"[^>]*>')
    return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => '    ' + tag + '\n  </head>')
  }
  function appendHead(html: string, tag: string) { return html.replace('</head>', () => '    ' + tag + '\n  </head>') }

  function render(shell: string, page: PageMeta, defaultDescription: string, defaultImage: string) {
    const url = SITE + (page.path === '/' ? '/' : page.path)
    const description = page.description || defaultDescription
    const image = page.image || defaultImage
    let html = shell.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escapeAttr(page.title) + '</title>')
    // 英語ページは <html lang> と og:locale を切り替える
    if (page.lang === 'en') {
      html = html.replace(/<html\s+lang="[^"]*"/, '<html lang="en"')
      html = setMeta(html, 'property', 'og:locale', 'en_US')
      html = setMeta(html, 'property', 'og:site_name', 'COANA TOKYO LLC')
    }
    html = setMeta(html, 'name', 'description', description)
    html = setMeta(html, 'name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
    html = setMeta(html, 'property', 'og:type', page.type || 'website')
    html = setMeta(html, 'property', 'og:url', url)
    html = setMeta(html, 'property', 'og:title', page.title)
    html = setMeta(html, 'property', 'og:description', description)
    if (image) {
      html = setMeta(html, 'property', 'og:image', image)
      html = setMeta(html, 'property', 'og:image:alt', page.title)
      html = setMeta(html, 'name', 'twitter:card', 'summary_large_image')
      html = setMeta(html, 'name', 'twitter:image', image)
    }
    html = setMeta(html, 'name', 'twitter:title', page.title)
    html = setMeta(html, 'name', 'twitter:description', description)
    if (page.type === 'article' && page.lastmod) {
      html = setMeta(html, 'property', 'article:published_time', page.lastmod)
      html = setMeta(html, 'property', 'article:modified_time', page.lastmod)
    }
    const canonical = '<link rel="canonical" href="' + escapeAttr(url) + '" />'
    html = /<link\s+rel="canonical"[^>]*>/.test(html)
      ? html.replace(/<link\s+rel="canonical"[^>]*>/, () => canonical)
      : appendHead(html, canonical)
    for (const alt of page.alternates ?? []) {
      html = appendHead(html, '<link rel="alternate" hreflang="' + escapeAttr(alt.hreflang) + '" href="' + escapeAttr(alt.href) + '" />')
    }
    html = appendHead(html, '<link rel="alternate" type="application/rss+xml" title="COANA TOKYO トピックス" href="' + SITE + '/feed.xml" />')
    if (page.preload) html = appendHead(html, '<link rel="preload" as="image" href="' + escapeAttr(page.preload) + '" fetchpriority="high" />')
    for (const data of page.jsonld ?? []) {
      html = appendHead(html, '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>')
    }
    return html
  }

  return {
    name: 'coana-page-meta',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const shellPath = path.join(outDir, 'index.html')
      if (!fs.existsSync(shellPath)) return
      const builtShell = fs.readFileSync(shellPath, 'utf8')
      const defaultDescription = (builtShell.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1] || ''
      const builtImage = (builtShell.match(/<meta\s+property="og:image"\s+content="([^"]*)"/) || [])[1] || ''
      const homeTitle = (builtShell.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'COANA TOKYO合同会社'

      const settings = readJson('content/settings.json')
      const about = readJson('content/about.json')
      const home = readJson('content/home.json')
      const services = readJson('content/services.json')
    const privacy = readJson('content/privacy.json')

    // sitemap.xml の lastmod 用：内容ファイルの最終更新日を git の履歴から取得する（取得できない環境では付けない）
    const gitRun = (cmd: string) => execSync(cmd, { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'], timeout: 30000 }).toString().trim()
    let gitHistory = false
    try {
      if (gitRun('git rev-parse --is-shallow-repository') === 'true') {
        try { gitRun('git fetch --unshallow --quiet') } catch { /* 履歴を取得できなければ lastmod は付けない */ }
      }
      gitHistory = gitRun('git rev-parse --is-shallow-repository') === 'false'
    } catch { gitHistory = false }
    const isYmd = (value: string | undefined): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
    const maxDate = (...dates: (string | undefined)[]) => dates.filter(isYmd).sort().pop()
    const lastModified = (...files: string[]): string | undefined => {
      if (!gitHistory) return undefined
      return maxDate(...files.map((file) => {
        try { return gitRun('git log -1 --format=%cs -- "' + file + '"') } catch { return undefined }
      }))
    }
    // プライバシーポリシーの改定日（なければ制定日）
    const privacyBody = String(privacy.body || '')
    const privacyDateMatch = privacyBody.match(/改定日[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/) || privacyBody.match(/制定日[：:]\s*(\d{4})年(\d{1,2})月(\d{1,2})日/)
    const privacyDate = privacyDateMatch ? privacyDateMatch[1] + '-' + privacyDateMatch[2].padStart(2, '0') + '-' + privacyDateMatch[3].padStart(2, '0') : undefined

      // ファビコン・スマホ用アイコン・SNS共有画像は CMS（content/settings.json）の設定を優先する
      const defaultImage = settings.og_image ? absoluteUrl(String(settings.og_image)) : builtImage
      const faviconHref = String(settings.favicon || '/favicon.svg')
      const touchIconHref = String(settings.apple_touch_icon || '/apple-touch-icon.png')
      const faviconType = /\.svg$/i.test(faviconHref) ? 'image/svg+xml' : /\.png$/i.test(faviconHref) ? 'image/png' : /\.ico$/i.test(faviconHref) ? 'image/x-icon' : ''
      let shell = builtShell.replace(/\s*<link\s+rel="(?:icon|apple-touch-icon|manifest)"[^>]*>/g, '')
      shell = shell.replace('</head>', () => '    <link rel="icon" href="' + escapeAttr(faviconHref) + '"' + (faviconType ? ' type="' + faviconType + '"' : '') + ' />\n    ' + (faviconHref !== '/favicon.ico' ? '<link rel="icon" href="/favicon.ico" sizes="any" />\n    ' : '') + '<link rel="apple-touch-icon" href="' + escapeAttr(touchIconHref) + '" />\n    '
        // Google 検索結果のファビコン用：48 の倍数の正方形 PNG（円形に切り抜かれても欠けない余白）。ファイル名を変えて再取得を促す
        + '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-v2-48.png" />\n    '
        + '<link rel="icon" type="image/png" sizes="96x96" href="/favicon-v2-96.png" />\n    '
        + '<link rel="icon" type="image/png" sizes="192x192" href="/favicon-v2-192.png" />\n    '
        + '<link rel="manifest" href="/site.webmanifest" />\n  </head>')

      // 住所を都道府県・市区町村・それ以降に分ける（構造化データ用）
      const address: string = String(settings.address || '')
      const regionMatch = address.match(/^(東京都|北海道|(?:大阪|京都)府|.{2,3}県)/)
      const region = regionMatch ? regionMatch[1] : ''
      const rest = address.slice(region.length)
      const localityMatch = rest.match(/^(.+?[市区町村])/)
      const locality = localityMatch ? localityMatch[1] : ''
      const street = rest.slice(locality.length)

      const orgId = SITE + '/#organization'
      // 提供地域：全国（オンライン）＋本拠地の東京都。Google ビジネスプロフィールは住所非表示のサービス提供地域型に合わせる
      // （登記上の住所 address は残す。電話番号は掲載しない）
      const areaServedFor = (lang: 'ja' | 'en') => [
        { '@type': 'Country', name: lang === 'en' ? 'Japan' : '日本' },
        { '@type': 'AdministrativeArea', name: lang === 'en' ? 'Tokyo' : '東京都' },
      ]
      const organization = {
        '@type': ['Organization', 'ProfessionalService'],
        '@id': orgId,
        name: settings.company_name || 'COANA TOKYO合同会社',
        alternateName: 'COANA TOKYO',
        url: SITE,
        sameAs: settings.same_as || ['https://www.facebook.com/profile.php?id=61589876101798', 'https://maps.google.com/?cid=15984393387638365667'],
        logo: SITE + '/favicon-v2-512.png', // 公式ロゴキットから作った正方形 PNG（512px。Google の推奨は 112px 以上）
        image: defaultImage,
        description: defaultDescription,
        email: settings.email,
        address: { '@type': 'PostalAddress', postalCode: String(settings.postal_code || '').replace(/^〒/, ''), addressRegion: region, addressLocality: locality, streetAddress: street, addressCountry: 'JP' },
        areaServed: areaServedFor('ja'),
        founder: { '@type': 'Person', name: about.profile_name, jobTitle: about.profile_role },
        foundingDate: '2025-10',
        knowsAbout: ['経理代行・経理業務の改善', 'クラウド会計・ITツール導入支援', 'バックオフィス代行・DX支援', '創業支援', 'ERPの導入', 'グループウェアの導入', '営業・販路開拓支援', 'セミナー・イベント開催支援', 'SNS運用支援・運用代行', 'Webサイト制作'],
        knowsLanguage: ['ja', 'en'],
        contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: settings.email, url: SITE + '/contact', availableLanguage: ['Japanese', 'English'], areaServed: 'JP' }],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'サービス',
          itemListElement: ['backoffice', 'marketing'].flatMap((key) => ((services[key]?.items ?? []) as { name: string; text: string }[]).map((item) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: item.name, description: item.text, provider: { '@id': orgId }, areaServed: areaServedFor('ja') } }))),
        },
      }
      const website = { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE, name: 'COANA TOKYO', publisher: { '@id': orgId }, inLanguage: ['ja', 'en'] }
      const graph = (...items: object[]) => [{ '@context': 'https://schema.org', '@graph': [organization, website, ...items] }]
      const crumbs = (items: { name: string; url: string }[]) => ({ '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })) })
      const homeCrumb = { name: 'ホーム', url: SITE + '/' }

      const faqs = ((home.faqs ?? []) as { q: string; a: string }[]).filter((f) => f.q && f.a)
      const faqPage = faqs.length ? [{ '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []

      // レンとジル（content/renjill/episodes.json）：公開日（日本時間）を過ぎた回だけ
      const renjillFile = path.resolve(__dirname, 'content/renjill/episodes.json')
      const renjillData = fs.existsSync(renjillFile) ? readJson('content/renjill/episodes.json') : { episodes: [], channels: {}, series: [] }
      const todayJstRj = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const renjillEps = ((renjillData.episodes ?? []) as { no: number; title: string; caption_ja: string; caption_en: string; date: string; youtube_id: string | null }[])
        .filter((e) => e.date <= todayJstRj).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.no - a.no))
      const renjillVideos = renjillEps.filter((e) => e.youtube_id).map((e) => ({
        '@type': 'VideoObject', name: e.title + '（レンとジル EP.' + e.no + '）', description: e.caption_ja + ' ' + e.caption_en, uploadDate: e.date,
        thumbnailUrl: 'https://i.ytimg.com/vi/' + e.youtube_id + '/hqdefault.jpg', embedUrl: 'https://www.youtube.com/embed/' + e.youtube_id,
        contentUrl: 'https://www.youtube.com/watch?v=' + e.youtube_id, publisher: { '@id': orgId },
      }))

      const pages: PageMeta[] = [
        { path: '/', title: homeTitle, description: '', jsonld: graph(...faqPage) },
        { path: '/about', crumb: '会社概要', title: '会社概要・代表メッセージ' + SUFFIX, description: '東京・港区のCOANA TOKYO合同会社の会社概要。中小企業・小規模事業者のバックオフィスとマーケティングを支える当社の考え方、代表メッセージ、代表プロフィール、会社情報をご紹介します。', jsonld: graph(crumbs([homeCrumb, { name: '会社概要', url: SITE + '/about' }])) },
        { path: '/services', crumb: 'サービス', title: 'サービス｜経理・バックオフィス改善、ITツール導入、マーケティング支援' + SUFFIX, description: '中小企業・小規模事業者に向けた、経理・業務フローの改善と実務代行、創業支援、会計・勤怠・販売管理などITツール・クラウドツールの導入支援、営業・セミナー・SNS・Webサイト制作のマーケティング支援。料金は個別お見積もり。', jsonld: graph(crumbs([homeCrumb, { name: 'サービス', url: SITE + '/services' }])) },
        { path: '/topics', crumb: 'トピックス', title: 'トピックス｜セミナー登壇・メディア掲載・お知らせ' + SUFFIX, description: 'セミナー登壇やメディア掲載など、COANA TOKYO合同会社の最新の活動をお知らせします。経理DXやクラウド会計に関する講座・記事もご紹介。', jsonld: graph(crumbs([homeCrumb, { name: 'トピックス', url: SITE + '/topics' }])) },
        { path: '/contact', crumb: 'お問い合わせ', title: 'お問い合わせ｜バックオフィス・マーケティングのご相談' + SUFFIX, description: '経理やバックオフィスの見直し、ITツール導入、集客・営業のご相談はこちらから。中小企業・小規模事業者の小さな困りごとでもお気軽に。内容を確認のうえ担当者よりご連絡いたします。', jsonld: graph(crumbs([homeCrumb, { name: 'お問い合わせ', url: SITE + '/contact' }])) },
        { path: '/privacy', crumb: 'プライバシーポリシー', title: 'プライバシーポリシー' + SUFFIX, description: 'COANA TOKYO合同会社のプライバシーポリシー。お問い合わせフォーム・メール・LINEで取得する個人情報の利用目的、第三者提供、業務委託、安全管理措置、Google アナリティクスの利用、開示等のご請求窓口について定めています。', jsonld: graph(crumbs([homeCrumb, { name: 'プライバシーポリシー', url: SITE + '/privacy' }])) },
        { path: '/renjill', crumb: 'レンとジル', title: 'レンとジル｜うさぎのオフィスコメディ（セリフなし）' + SUFFIX, description: 'うさぎの課長レンと、しっかり者の部下ジルが主役の、セリフのないオフィスコメディ。全エピソードを YouTube で見られます。Instagram・TikTok・Facebook でも公開中。', jsonld: graph(crumbs([homeCrumb, { name: 'レンとジル', url: SITE + '/renjill' }]), ...renjillVideos) },
      ]

      // サービス別の専用ページ（content/solutions/*.json）
      type Named = { name: string; text?: string }
      type Solution = {
        slug: string; order?: number; nav_label?: string; title: string; seo_title?: string; description?: string; lead?: string; catch?: string
        lang?: 'ja' | 'en'; hidden?: boolean; english?: { slug?: string }
        hero_facts?: { value: string; label: string }[]
        problems_title?: string; problems?: string[]; design?: string; before_after?: { title?: string; items?: { label: string; before: string; after: string }[] }
        scheme?: { type?: string; title?: string; lead?: string; center?: { label?: string; sub?: string }; client?: { label?: string; sub?: string }; steps?: string[]; returns?: { label: string; sub?: string }[]; nodes?: { label: string; sub?: string; who?: string; detail?: string }[]; points?: Named[]; note?: string }
        features_title?: string; features_lead?: string; features?: Named[]; tools?: string[]; tools_note?: string
        scope?: { title?: string; groups?: { name: string; items?: string[] }[]; note?: string }
        plans?: { title?: string; items?: { name: string; tag?: string; text?: string; includes?: string[]; best_for?: string }[]; note?: string }
        scenarios?: { title?: string; lead?: string; items?: { name: string; tag?: string; before?: string; text?: string }[]; note?: string }
        steps_title?: string; flow?: Named[]; flow_note?: string
        faq_title?: string; faqs?: { q: string; a: string }[]
      }
      // 日本語／英語ページで共通の見出し（src/SolutionPage.tsx の LABELS と対応）
      const SOL_LABELS = {
        ja: { home: 'ホーム', services: 'サービス', problems: 'こんなお悩みはありませんか', scheme: '支援の仕組み', before: 'Before', after: 'After', support: '支援内容とプラン', tools: '対応ツールの例', scope: 'ご依頼いただける業務の一覧', plans: 'ご利用プランの例', bestFor: 'こんな方に', scenarios: 'ご利用イメージ', flow: 'ご利用までの流れ', faq: 'よくあるご質問', contact: 'お問い合わせ・ご相談はこちら（無料）', list: 'サービス一覧', english: 'English page', suffix: ' | COANA TOKYO合同会社' },
        en: { home: 'Home', services: 'Services', problems: 'Sound familiar?', scheme: 'How it works', before: 'Before', after: 'After', support: 'What we do & plans', tools: 'Tools we work with', scope: 'Examples of what you can ask us', plans: 'Example plans', bestFor: 'Best for', scenarios: 'Example situations', flow: 'How to get started', faq: 'FAQ', contact: 'Contact us (free consultation)', list: 'All services', english: 'Japanese page', suffix: ' | COANA TOKYO LLC' },
      }
      const solLang = (sol: Solution): 'ja' | 'en' => (sol.lang === 'en' ? 'en' : 'ja')
      const solutionsDir = path.resolve(__dirname, 'content/solutions')
      const solutionList: Solution[] = fs.existsSync(solutionsDir)
        ? fs.readdirSync(solutionsDir)
            .filter((name) => name.endsWith('.json'))
            .map((name) => JSON.parse(fs.readFileSync(path.join(solutionsDir, name), 'utf8')) as Solution)
            .filter((sol) => sol && sol.slug)
            .sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
        : []
      // 日本語ページ ⇔ 英語ページの対応（english.slug で指定）
      const pairOf = (sol: Solution): Solution | undefined => {
        if (sol.english?.slug) return solutionList.find((item) => item.slug === sol.english?.slug)
        return solutionList.find((item) => item.english?.slug === sol.slug)
      }
      for (const sol of solutionList) {
        const lang = solLang(sol)
        const T = SOL_LABELS[lang]
        const url = SITE + '/services/' + sol.slug
        const label = sol.nav_label || sol.title
        const description = String(sol.description || sol.lead || '')
        const faqList = sol.faqs || []
        const pair = pairOf(sol)
        const alternates = pair
          ? [
              { hreflang: lang, href: url },
              { hreflang: solLang(pair), href: SITE + '/services/' + pair.slug },
              { hreflang: 'x-default', href: lang === 'ja' ? url : SITE + '/services/' + pair.slug },
            ]
          : undefined
        const catalog = (sol.scope?.groups ?? []).map((group) => ({
          '@type': 'OfferCatalog',
          name: group.name,
          itemListElement: (group.items ?? []).map((item) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: item, provider: { '@id': orgId } } })),
        }))
        pages.push({
          path: '/services/' + sol.slug,
          crumb: label,
          lang,
          alternates,
          title: (sol.seo_title || sol.title) + T.suffix,
          description,
          jsonld: graph(
            crumbs([{ name: T.home, url: SITE + '/' }, { name: T.services, url: SITE + '/services' }, { name: label, url }]),
            {
              '@type': 'Service',
              '@id': url + '#service',
              name: label,
              alternateName: sol.title !== label ? sol.title : undefined,
              serviceType: label,
              description,
              url,
              inLanguage: lang,
              provider: { '@id': orgId },
              areaServed: areaServedFor(lang),
              availableLanguage: lang === 'en' ? ['English', 'Japanese'] : undefined,
              audience: { '@type': 'BusinessAudience', name: lang === 'en' ? 'Founders and small businesses in Japan' : '中小企業・小規模事業者・個人事業主' },
              offers: { '@type': 'Offer', priceSpecification: { '@type': 'PriceSpecification', description: lang === 'en' ? 'Quoted individually. Consultation is free.' : '支援内容と業務範囲に応じた個別お見積もり。ご相談・お見積もりは無料。' }, availability: 'https://schema.org/InStock', url: SITE + '/contact' },
              hasOfferCatalog: catalog.length ? { '@type': 'OfferCatalog', name: sol.scope?.title || T.scope, itemListElement: catalog } : undefined,
            },
            ...(faqList.length ? [{ '@type': 'FAQPage', inLanguage: lang, mainEntity: faqList.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
          ),
        })
      }

      type Feed = { title: string; url: string; date: string; description: string }
      const feedItems: Feed[] = []
      // 予約投稿：公開日（日本時間）が今日より先の記事は、その日のビルドまで公開しない
      const todayJst = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const topicsDir = path.resolve(__dirname, 'content/topics')
      if (fs.existsSync(topicsDir)) {
        for (const file of fs.readdirSync(topicsDir).filter((name) => name.endsWith('.md'))) {
          const raw = fs.readFileSync(path.join(topicsDir, file), 'utf8')
          const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
          const fm = (match ? parseYaml(match[1]) : {}) ?? {}
          if (fm.draft) continue
          const slug = file.replace(/\.md$/, '')
          const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date ?? '').slice(0, 10)
          const isDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
          if (isDate && date > todayJst) continue
          const title = String(fm.title ?? slug)
          const url = SITE + '/topics/' + slug
          const image = fm.thumbnail ? absoluteUrl(String(fm.thumbnail)) : defaultImage
          const description = String(fm.summary ?? '')
          pages.push({
            path: '/topics/' + slug,
            title: title + SUFFIX,
            description,
            image,
            type: 'article',
            lastmod: isDate ? date : undefined,
            jsonld: graph(
              crumbs([homeCrumb, { name: 'トピックス', url: SITE + '/topics' }, { name: title, url }]),
              { '@type': 'Article', headline: title, description, image: [image], datePublished: isDate ? date : undefined, dateModified: isDate ? date : undefined, author: { '@id': orgId }, publisher: { '@id': orgId }, mainEntityOfPage: url, inLanguage: 'ja', articleSection: String(fm.category ?? 'お知らせ') },
            ),
          })
          feedItems.push({ title, url, date: isDate ? date : new Date().toISOString().slice(0, 10), description })
        }
      }

      // sitemap.xml の lastmod：固定ページ・サービス別ページにも最終更新日を付ける（記事は公開日）
      const latestTopic = maxDate(...feedItems.map((item) => item.date))
      const pageSources: Record<string, { files: string[]; extra?: string }> = {
        '/': { files: ['content/home.json', 'content/services.json', 'content/settings.json'], extra: latestTopic },
        '/about': { files: ['content/about.json', 'content/settings.json'] },
        '/services': { files: ['content/services.json', 'content/solutions'] },
        '/topics': { files: ['content/topics'], extra: latestTopic },
        '/contact': { files: ['content/settings.json'] },
        '/privacy': { files: ['content/privacy.json'], extra: privacyDate },
      }
      for (const page of pages) {
        if (page.lastmod) continue
        if (page.path.startsWith('/services/')) {
          page.lastmod = lastModified('content/solutions/' + page.path.slice('/services/'.length) + '.json')
          continue
        }
        const source = pageSources[page.path]
        if (source) page.lastmod = maxDate(lastModified(...source.files), source.extra)
      }

      // ── JavaScript を実行しないクローラー（AI 検索や一部の検索エンジン）にも内容とサイト内リンクが伝わるよう、
      //    各ページの本文を HTML に埋め込む。画面には表示せず、React の起動時に #root の中身ごと置き換わる。
      const esc = (value: unknown) => escapeAttr(String(value ?? ''))
      const paras = (value: unknown) =>
        String(value ?? '').split(/\n+/).map((t) => t.trim()).filter(Boolean).map((t) => '<p>' + esc(t) + '</p>').join('')
      const anchor = (href: string, text: string) => '<a href="' + esc(href) + '">' + esc(text) + '</a>'
      const serviceSections = (['backoffice', 'marketing'] as const).map((key) => {
        const group = services[key] || {}
        const items = (group.items || []) as { name: string; text: string; tags?: string[] }[]
        return '<section id="' + key + '"><h2>' + esc(group.title) + '</h2>' + paras(group.lead) +
          items.map((item) => '<h3>' + esc(item.name) + '</h3>' + paras(item.text) +
            ((item.tags || []).length ? '<p>' + esc((item.tags || []).join('・')) + '</p>' : '')).join('') + '</section>'
      }).join('')
      const sortedTopics = [...feedItems].sort((a, b) => b.date.localeCompare(a.date))
      const topicList = (items: Feed[]) => '<ul>' + items.map((item) =>
        '<li>' + anchor(item.url.replace(SITE, ''), item.title) + ' <time datetime="' + esc(item.date) + '">' + esc(item.date) + '</time></li>').join('') + '</ul>'
      const inlineMd = (text: string) => esc(stripHtml(text))
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => '<a href="' + href + '">' + label + '</a>')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
      const mdToHtml = (md: string): string => md.split(/\n{2,}/).map((chunk) => {
        const lines = chunk.trim().split('\n').map((l) => l.trim()).filter(Boolean)
        if (!lines.length) return ''
        const heading = lines[0].match(/^(#{1,6})\s+(.*)$/)
        if (heading) {
          const level = Math.min(6, Math.max(2, heading[1].length))
          return '<h' + level + '>' + inlineMd(heading[2]) + '</h' + level + '>' + (lines.length > 1 ? mdToHtml(lines.slice(1).join('\n')) : '')
        }
        if (lines.every((l) => /^[-*]\s+/.test(l))) return '<ul>' + lines.map((l) => '<li>' + inlineMd(l.replace(/^[-*]\s+/, '')) + '</li>').join('') + '</ul>'
        if (lines.every((l) => /^\d+[.)]\s+/.test(l))) return '<ol>' + lines.map((l) => '<li>' + inlineMd(l.replace(/^\d+[.)]\s+/, '')) + '</li>').join('') + '</ol>'
        const text = lines.map(inlineMd).filter(Boolean).join('<br>')
        return text ? '<p>' + text + '</p>' : ''
      }).join('')
      // サービスLPのキャッチコピー（画面の h1）：下線の印「**」を外し、行をつなぐ（英語の行の間だけ空白を入れる）
      const catchText = (text: string) => text.replace(/\*\*/g, '').split('\n').reduce((acc, line) => !acc ? line : acc + (/[A-Za-z0-9.,]$/.test(acc) ? ' ' : '') + line, '')
      const fallbackMain = (pagePath: string): string => {
        if (pagePath === '/') {
          const strengths = (home.strengths || []) as { title: string; text: string }[]
          const tools = (home.tools || []) as { name: string; category?: string }[]
          const faqItems = (home.faqs || []) as { q: string; a: string }[]
          return '<h1>' + esc(home.hero_line1) + esc(home.hero_line2) + '</h1>' + '<p>' + esc((home.hero_words || []).join('、')) + esc(home.hero_solve_text) + '</p>' + paras(home.hero_lead) +
            ((home.hero_badges || []).length ? '<ul>' + (home.hero_badges as string[]).map((b) => '<li>' + esc(b) + '</li>').join('') + '</ul>' : '') +
            '<section><h2>' + esc(home.services_title) + '</h2>' + paras(home.services_lead) + serviceSections + anchor('/services', 'サービスを詳しく見る') + '</section>' +
            '<section><h2>' + esc(home.strengths_title) + '</h2>' + paras(about.message_heading) + strengths.map((st) => '<h3>' + esc(st.title) + '</h3>' + paras(st.text)).join('') +
              '<p>' + esc(home.tools_title) + '：' + esc(tools.map((t) => t.name + (t.category ? '（' + t.category + '）' : '')).join('、')) + '</p>' + paras(home.tools_note) + anchor('/about', '会社概要・代表メッセージを見る') + '</section>' +
            '<section><h2>' + esc(home.faq_title) + '</h2><dl>' + faqItems.map((f) => '<dt>' + esc(f.q) + '</dt><dd>' + esc(f.a) + '</dd>').join('') + '</dl></section>' +
            '<section><h2>' + esc(home.topics_title) + '</h2>' + topicList(sortedTopics.slice(0, 5)) + anchor('/topics', 'トピックス一覧') + '</section>' +
            '<p>' + anchor('/contact', 'お問い合わせ・ご相談はこちら') + '</p>'
        }
        if (pagePath === '/about') {
          const rows = (about.company || []) as { label: string; value: string }[]
          return '<h1>会社概要</h1>' + paras(about.intro) +
            '<section id="message"><h2>' + esc(about.message_heading) + '</h2>' + ((about.message || []) as string[]).map((t) => paras(t)).join('') + paras(about.signature) + '</section>' +
            '<section id="profile"><h2>代表プロフィール</h2><p>' + esc(about.profile_role) + ' ' + esc(about.profile_name) + '</p>' + ((about.profile || []) as string[]).map((t) => paras(t)).join('') + '</section>' +
            '<section id="company"><h2>会社概要</h2><dl>' + rows.map((r) => '<dt>' + esc(r.label) + '</dt><dd>' + esc(r.value).replace(/\n/g, '<br>') + '</dd>').join('') + '</dl></section>'
        }
        if (pagePath === '/services') {
          const flow = (services.flow || []) as unknown[]
          return '<h1>サービス</h1>' + paras(services.intro) + serviceSections +
            '<section><h2>' + esc(services.pricing_title) + '</h2>' + paras(services.pricing) + '</section>' +
            '<section><h2>' + esc(services.flow_title) + '</h2><ol>' + flow.map((step) => '<li>' + esc(typeof step === 'string' ? step : Object.values(step as object).join(' ')) + '</li>').join('') + '</ol></section>' +
            '<p>' + anchor('/contact', 'お問い合わせ・ご相談はこちら') + '</p>'
        }
        if (pagePath === '/topics') return '<h1>トピックス</h1>' + paras(settings.topics_intro) + topicList(sortedTopics)
        if (pagePath === '/contact') return '<h1>お問い合わせ</h1>' + paras(settings.contact_intro)
        if (pagePath === '/renjill') {
          return '<h1>レンとジル</h1><p>うさぎの課長レンと、しっかり者の部下ジル。セリフのない、オフィスコメディです。</p>' +
            '<ul>' + Object.entries(renjillData.channels ?? {}).filter(([, url]) => url).map(([name, url]) => '<li>' + anchor(String(url), name) + '</li>').join('') + '</ul>' +
            '<h2>エピソード</h2>' + renjillEps.map((e) => '<article><h3>EP.' + e.no + ' ' + esc(e.title) + '</h3><time datetime="' + esc(e.date) + '">' + esc(e.date) + '</time><p>' + esc(e.caption_ja) + '</p><p>' + esc(e.caption_en) + '</p></article>').join('')
        }
        if (pagePath === '/privacy') return '<h1>プライバシーポリシー</h1>' + mdToHtml(privacyBody)
        if (pagePath.startsWith('/services/')) {
          const sol = solutionList.find((item) => '/services/' + item.slug === pagePath)
          if (!sol) return ''
          return solutionHtml(sol)
        }
        if (pagePath.startsWith('/topics/')) {
          const slug = pagePath.slice('/topics/'.length)
          const file = path.join(topicsDir, slug + '.md')
          const raw = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
          const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
          const fm = (match ? parseYaml(match[1]) : {}) || {}
          const item = feedItems.find((f) => f.url === SITE + pagePath)
          return '<article><h1>' + esc(fm.title ?? slug) + '</h1>' + (item ? '<time datetime="' + esc(item.date) + '">' + esc(item.date) + '</time>' : '') +
            (fm.category ? '<p>' + esc(fm.category) + '</p>' : '') + mdToHtml(match ? match[2] : raw) + '</article>' + anchor('/topics', 'トピックス一覧へ戻る')
        }
        return ''
      }
      // ── サービス別ページ：画面（src/SolutionPage.tsx）と同じ構成の本文を HTML / Markdown で組み立てる（検索エンジン・AI 検索向け）
      const named = (items: Named[] | undefined, tag: 'h3' | 'strong') => (items ?? []).map((item) =>
        (tag === 'h3' ? '<h3>' + esc(item.name) + '</h3>' : '<p><strong>' + esc(item.name) + '</strong></p>') + paras(item.text)).join('')
      const section = (title: string | undefined, body: string, id?: string) => (body ? '<section' + (id ? ' id="' + id + '"' : '') + '><h2>' + esc(title) + '</h2>' + body + '</section>' : '')
      const solutionHtml = (sol: Solution): string => {
        const T = SOL_LABELS[solLang(sol)]
        const pair = pairOf(sol)
        const supportTitle = sol.features_title && sol.features_title !== '支援内容' ? sol.features_title : T.support
        return (sol.catch ? '<h1>' + esc(catchText(sol.catch)) + '</h1><p>' + esc(sol.title) + '</p>' : '<h1>' + esc(sol.title) + '</h1>') + paras(sol.lead) +
          ((sol.hero_facts ?? []).length ? '<ul>' + (sol.hero_facts ?? []).map((f) => '<li>' + esc(f.value) + (f.label ? '：' + esc(f.label) : '') + '</li>').join('') + '</ul>' : '') +
          // 新デザイン（design: signal）のLPは「お悩み」を出さず、導入前／導入後を表示する（画面と同じ内容をクローラーにも）
          (sol.design === 'signal'
            ? section(catchText(sol.before_after?.title || '') || T.before + ' / ' + T.after, (sol.before_after?.items ?? []).length ? '<ul>' + (sol.before_after?.items ?? []).map((it) => '<li><strong>' + esc(it.label) + '</strong>：' + esc(T.before) + '　' + esc(it.before) + '／' + esc(T.after) + '　' + esc(it.after) + '</li>').join('') + '</ul>' : '')
            : section(sol.problems_title || T.problems, (sol.problems ?? []).length ? '<ul>' + (sol.problems ?? []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '')) +
          section(sol.scheme?.title || T.scheme, (sol.scheme ? paras(sol.scheme.lead) +
            (relayFlow(sol.scheme).length ? '<ol>' + relayFlow(sol.scheme).map((t) => '<li>' + esc(t) + '</li>').join('') + '</ol>' : '') +
            ((sol.scheme.nodes ?? []).length ? '<ul>' + (sol.scheme.nodes ?? []).map((n) => '<li><strong>' + (n.who === 'client' ? '【御社】' : n.who === 'team' ? '【COANA TOKYO】' : '') + esc(n.label) + '</strong>' + (n.sub ? '：' + esc(n.sub) : '') + '</li>').join('') + '</ul>' : '') +
            named(sol.scheme.points, 'h3') + paras(sol.scheme.note) : '')) +
          section(supportTitle, paras(sol.features_lead) + named(sol.features, 'h3') +
            (sol.scope && (sol.scope.groups ?? []).length ? '<h3>' + esc(sol.scope.title || T.scope) + '</h3>' + (sol.scope.groups ?? []).map((g) => '<h4>' + esc(g.name) + '</h4><ul>' + (g.items ?? []).map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>').join('') : '') + paras(sol.scope?.note) +
            (sol.plans && (sol.plans.items ?? []).length ? '<h3>' + esc(sol.plans.title || T.plans) + '</h3>' + (sol.plans.items ?? []).map((pl) => '<h4>' + esc(pl.name) + (pl.tag ? '（' + esc(pl.tag) + '）' : '') + '</h4>' + paras(pl.text) +
              ((pl.includes ?? []).length ? '<ul>' + (pl.includes ?? []).map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>' : '') + (pl.best_for ? '<p>' + esc(T.bestFor) + '：' + esc(pl.best_for) + '</p>' : '')).join('') + paras(sol.plans.note) : '') +
            ((sol.tools ?? []).length ? '<p>' + esc(T.tools) + '：' + esc((sol.tools ?? []).join('、')) + '</p>' + paras(sol.tools_note) : '')) +
          section(sol.scenarios?.title || T.scenarios, (sol.scenarios && (sol.scenarios.items ?? []).length ? paras(sol.scenarios.lead) + (sol.scenarios.items ?? []).map((sc) => '<h3>' + esc(sc.name) + (sc.tag ? '（' + esc(sc.tag) + '）' : '') + '</h3>' + (sc.before ? '<p>' + T.before + '：' + esc(sc.before) + '</p>' : '') + (sc.text ? '<p>' + T.after + '：' + esc(sc.text) + '</p>' : '')).join('') + paras(sol.scenarios.note) : '')) +
          section(sol.steps_title || T.flow, ((sol.flow ?? []).length ? '<ol>' + (sol.flow ?? []).map((st) => '<li><strong>' + esc(st.name) + '</strong>' + (st.text ? ' ' + esc(st.text) : '') + '</li>').join('') + '</ol>' + paras(sol.flow_note) : '')) +
          ((sol.faqs ?? []).length ? '<section><h2>' + esc(sol.faq_title || T.faq) + '</h2><dl>' + (sol.faqs ?? []).map((f) => '<dt>' + esc(f.q) + '</dt><dd>' + esc(f.a) + '</dd>').join('') + '</dl></section>' : '') +
          '<p>' + anchor('/contact', T.contact) + ' ' + anchor('/services', T.list) + (pair ? ' ' + anchor('/services/' + pair.slug, T.english) : '') + '</p>'
      }
      const mdList = (items: string[] | undefined) => (items ?? []).map((i) => '- ' + i).join('\n')
      const solutionMarkdown = (sol: Solution): string => {
        const T = SOL_LABELS[solLang(sol)]
        const url = SITE + '/services/' + sol.slug
        const block = (title: string | undefined, body: string) => (body.trim() ? '### ' + title + '\n\n' + body.trim() + '\n\n' : '')
        return '## ' + (sol.nav_label || sol.title) + '\n\n' + 'URL: ' + url + '\n\n' + (sol.title !== sol.nav_label ? sol.title + '\n\n' : '') + String(sol.description || sol.lead || '') + '\n\n' +
          block(sol.problems_title || T.problems, mdList(sol.problems)) +
          block(sol.scheme?.title || T.scheme, (sol.scheme?.lead ? sol.scheme.lead + '\n\n' : '') + (relayFlow(sol.scheme).length ? relayFlow(sol.scheme).map((t, i) => (i + 1) + '. ' + t).join('\n') + '\n' : '') + (sol.scheme?.nodes ?? []).map((n) => '- ' + (n.who === 'client' ? '（御社）' : n.who === 'team' ? '（COANA TOKYO）' : '') + n.label + (n.sub ? '：' + n.sub : '')).join('\n') + '\n' + (sol.scheme?.points ?? []).map((pt) => '- ' + pt.name + (pt.text ? '：' + pt.text : '')).join('\n') + (sol.scheme?.note ? '\n\n' + sol.scheme.note : '')) +
          block(sol.features_title && sol.features_title !== '支援内容' ? sol.features_title : T.support, (sol.features ?? []).map((f) => '- ' + f.name + (f.text ? '：' + f.text : '')).join('\n') +
            ((sol.scope?.groups ?? []).length ? '\n\n' + (sol.scope?.title || T.scope) + '：\n' + (sol.scope?.groups ?? []).map((g) => '- ' + g.name + '：' + (g.items ?? []).join('、')).join('\n') : '') + (sol.scope?.note ? '\n\n' + sol.scope.note : '') +
            ((sol.plans?.items ?? []).length ? '\n\n' + (sol.plans?.title || T.plans) + '：\n' + (sol.plans?.items ?? []).map((pl) => '- ' + pl.name + (pl.tag ? '（' + pl.tag + '）' : '') + (pl.text ? '：' + pl.text : '') + ((pl.includes ?? []).length ? '（' + (pl.includes ?? []).join('、') + '）' : '')).join('\n') : '') +
            ((sol.tools ?? []).length ? '\n\n' + T.tools + '：' + (sol.tools ?? []).join('、') : '')) +
          block(sol.scenarios?.title || T.scenarios, (sol.scenarios?.lead ? sol.scenarios.lead + '\n\n' : '') + (sol.scenarios?.items ?? []).map((sc) => '- ' + sc.name + (sc.tag ? '（' + sc.tag + '）' : '') + (sc.before ? ' ' + T.before + '：' + sc.before : '') + (sc.text ? ' → ' + T.after + '：' + sc.text : '')).join('\n')) +
          block(sol.steps_title || T.flow, (sol.flow ?? []).map((st, i) => (i + 1) + '. ' + st.name + (st.text ? '：' + st.text : '')).join('\n') + (sol.flow_note ? '\n\n' + sol.flow_note : '')) +
          block(sol.faq_title || T.faq, (sol.faqs ?? []).map((f) => '- Q. ' + f.q + '\n  A. ' + f.a).join('\n'))
      }
      // クローラ向けのヘッダー・フッター。英語ページでは英語の表記にする（ページ内の言語を揃える）
      const englishPage = solutionList.find((sol) => sol.lang === 'en')
      const fallbackHeader = (lang: 'ja' | 'en') => lang === 'en'
        ? '<header>' + anchor('/', 'COANA TOKYO LLC') + '<nav aria-label="Main navigation">' +
          [['/', 'Home (Japanese)'], ['/about', 'About us (Japanese)'], ['/services', 'Services (Japanese)'], ['/contact', 'Contact']].map(([href, text]) => anchor(href, text)).join(' ') + '</nav></header>'
        : '<header>' + anchor('/', String(settings.company_name || 'COANA TOKYO')) + '<nav aria-label="メインナビゲーション">' +
          [['/', 'ホーム'], ['/about', '会社概要'], ['/services', 'サービス'], ['/topics', 'トピックス'], ['/contact', 'お問い合わせ']].map(([href, text]) => anchor(href, text)).join(' ') + '</nav></header>'
      const fallbackFooter = (lang: 'ja' | 'en') => lang === 'en'
        ? '<footer><p>COANA TOKYO LLC</p><address>3F, 1-3-3 Kita-Aoyama, Minato-ku, Tokyo 107-0061, Japan</address><nav aria-label="Footer">' +
          anchor('/services/startup-support', 'Startup support (Japanese)') + ' ' + anchor('/services', 'All services (Japanese)') + ' ' + anchor('/privacy', 'Privacy policy (Japanese)') + '</nav></footer>'
        : '<footer><p>' + esc(settings.company_name) + '</p><address>' + esc(settings.postal_code) + ' ' + esc(settings.address) + '</address><nav aria-label="フッター">' +
          anchor('/services#backoffice', 'バックオフィス支援') + ' ' + anchor('/services#marketing', 'マーケティング支援') + ' ' + solutionList.filter((sol) => !sol.hidden).map((sol) => anchor('/services/' + sol.slug, sol.nav_label || sol.title)).join(' ') +
          (englishPage ? ' ' + anchor('/services/' + englishPage.slug, 'Startup support in English') : '') + ' ' + anchor('/privacy', 'プライバシーポリシー') + '</nav></footer>'
      const withFallback = (html: string, pagePath: string, lang: 'ja' | 'en' = 'ja') => html.replace('<div id="root"></div>', () =>
        '<div id="root"><div class="seo-fallback" style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);border:0">' +
        fallbackHeader(lang) + '<main>' + fallbackMain(pagePath) + '</main>' + fallbackFooter(lang) + '</div></div>')

      // Cloudflare の Email Obfuscation（Scrape Shield）は HTML 内の mailto やメールアドレスを
      // /cdn-cgi/l/email-protection に書き換え、クローラーにはそのURLが 404 になる。
      // email_off で囲んだ範囲は書き換えの対象外になる（表示・動作は変わらない）
      const emailOff = (html: string) => html
        .replace(/(<html\b[^>]*>)/, '$1<!--email_off-->')
        .replace(/<\/html>\s*$/, '<!--/email_off--></html>\n')

      for (const page of pages) {
        const file = page.path === '/' ? shellPath : path.join(outDir, page.path.slice(1) + '.html')
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, emailOff(withFallback(render(shell, page, defaultDescription, defaultImage), page.path, page.lang === 'en' ? 'en' : 'ja')))
      }

      // 存在しないURLは 404 を返す（画像の取り違えキャッシュ対策を兼ねる）
      const notFound = render(shell, { path: '/404', title: 'ページが見つかりません' + SUFFIX, description: 'お探しのページは見つかりませんでした。URLが変わったか、ページが削除された可能性があります。トップページやサービス一覧からお探しください。' }, defaultDescription, defaultImage)
        .replace(/\s*<link\s+rel="canonical"[^>]*>/, '')
        .replace(/<meta\s+name="robots"[^>]*>/, '<meta name="robots" content="noindex" />')
      fs.writeFileSync(path.join(outDir, '404.html'), emailOff(notFound))

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
        ...pages.map((page) => '  <url><loc>' + SITE + page.path + '</loc>' + (page.lastmod ? '<lastmod>' + page.lastmod + '</lastmod>' : '') +
          (page.alternates ?? []).map((alt) => '<xhtml:link rel="alternate" hreflang="' + escapeXml(alt.hreflang) + '" href="' + escapeXml(alt.href) + '" />').join('') +
          (page.image ? '<image:image><image:loc>' + escapeXml(page.image) + '</image:loc></image:image>' : '') + '</url>'),
        '</urlset>',
        '',
      ].join('\n')
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap)

      feedItems.sort((a, b) => (a.date < b.date ? 1 : -1))
      const rss = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        '    <title>COANA TOKYO トピックス</title>',
        '    <link>' + SITE + '/topics</link>',
        '    <description>' + escapeXml(defaultDescription) + '</description>',
        '    <language>ja</language>',
        '    <atom:link href="' + SITE + '/feed.xml" rel="self" type="application/rss+xml" />',
        ...feedItems.map((item) => '    <item><title>' + escapeXml(item.title) + '</title><link>' + item.url + '</link><guid>' + item.url + '</guid><pubDate>' + new Date(item.date + 'T00:00:00+09:00').toUTCString() + '</pubDate><description>' + escapeXml(item.description) + '</description></item>'),
        '  </channel>',
        '</rss>',
        '',
      ].join('\n')
      fs.writeFileSync(path.join(outDir, 'feed.xml'), rss)

      const llms = [
        '# ' + (settings.company_name || 'COANA TOKYO合同会社'),
        '',
        '> ' + defaultDescription,
        '',
        '所在地: ' + address + ' / メール: ' + settings.email,
        '',
        '対象: 中小企業・小規模事業者・個人事業主・これから起業する方（日本全国、オンライン対応）。外国人の方の日本での創業支援は英語で対応。',
        '料金: 支援内容と業務範囲に応じた個別お見積もり。ご相談・お見積もりは無料。',
        '注意: 税務申告・税務相談、社会保険・労働保険の手続き、登記、許認可申請、法律相談など、法令で士業の独占業務と定められた業務は行わず、提携する専門家を紹介する。',
        '',
        '## ページ',
        ...pages.filter((p) => p.type !== 'article' && !p.path.startsWith('/services/')).map((p) => '- [' + stripHtml(p.title.replace(SUFFIX, '')) + '](' + SITE + p.path + '): ' + (p.description || defaultDescription)),
        '',
        '## サービス（詳細ページ）',
        ...solutionList.map((sol) => '- [' + (sol.nav_label || sol.title) + '](' + SITE + '/services/' + sol.slug + '): ' + String(sol.description || sol.lead || '') + (sol.lang === 'en' ? ' (English page)' : '')),
        '',
        '## サービス一覧',
        ...['backoffice', 'marketing'].flatMap((key) => ((services[key]?.items ?? []) as { name: string; text: string }[]).map((item) => '- ' + item.name + ': ' + item.text)),
        '',
        '## トピックス',
        ...feedItems.map((item) => '- [' + item.title + '](' + item.url + ') (' + item.date + ')'),
        '',
        '## 詳細版',
        '- [llms-full.txt](' + SITE + '/llms-full.txt): 各サービスの支援内容・業務一覧・プラン例・FAQ を含む全文',
        '',
      ].join('\n')
      fs.writeFileSync(path.join(outDir, 'llms.txt'), llms)

      const companyRows = ((about.company ?? []) as { label: string; value: string }[]).map((row) => '- ' + row.label + ': ' + String(row.value).replace(/\n/g, ' / '))
      const llmsFull = [
        '# ' + (settings.company_name || 'COANA TOKYO合同会社') + ' — サービス詳細（llms-full.txt）',
        '',
        '> ' + defaultDescription,
        '',
        '## 会社情報',
        ...companyRows,
        '- お問い合わせ: ' + SITE + '/contact（メール: ' + settings.email + '）',
        '',
        '## 代表メッセージ',
        ...((about.message ?? []) as string[]).map((t) => String(t).replace(/\n/g, ' ')),
        '',
        '## 提供できないこと（法令上の制限）',
        '税理士法・社会保険労務士法・行政書士法・司法書士法・弁護士法などにより、税務申告・税務相談、社会保険・労働保険の手続き代行、登記、許認可申請、在留資格の申請、法律相談・契約書の作成などの士業の独占業務は行わず、必要に応じて提携する専門家を紹介する。',
        '',
        '# サービス詳細',
        '',
        ...solutionList.map(solutionMarkdown),
        '## よくあるご質問（全体）',
        ...faqs.map((f) => '- Q. ' + f.q + '\n  A. ' + f.a),
        '',
      ].join('\n')
      fs.writeFileSync(path.join(outDir, 'llms-full.txt'), llmsFull)

      // ── サポートチャットの知識データ（/chat-knowledge.json）。サイトの全コンテンツから自動で作るので、
      //    サイトを更新すればチャットの知識も自動で最新になる。AI の回答（functions/api/chat.ts）と、
      //    AI が使えないときのキーワード検索（src/chat）の両方がこのデータだけを根拠にする。
      type Chunk = { id: string; t: string; u: string; k: string; x: string; a?: string[] }
      const chunks: Chunk[] = []
      const clean = (value: unknown) => stripHtml(String(value ?? ''))
        .replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim()
      const addChunk = (k: string, t: string, u: string, text: unknown, ask?: string[]) => {
        const x = clean(text)
        if (!x) return
        // 長い文章は 500 字前後で区切る（検索とAIへの受け渡しの単位）
        const parts = x.length <= 560 ? [x] : x.split(/(?<=。)\n?|\n/).reduce<string[]>((acc, line) => {
          if (!line.trim()) return acc
          if (!acc.length || (acc[acc.length - 1] + line).length > 500) acc.push(line.trim())
          else acc[acc.length - 1] += line.trim()
          return acc
        }, [])
        parts.forEach((part, i) => chunks.push({ id: k + '-' + chunks.length, t: parts.length > 1 ? t + '（' + (i + 1) + '）' : t, u, k, x: part, ...(ask?.length ? { a: ask } : {}) }))
      }
      const list = (items: unknown[] | undefined, sep = '、') => (items ?? []).map((v) => clean(v)).filter(Boolean).join(sep)
      // 会社
      addChunk('company', '会社概要', '/about', companyRows.join('\n') + '\nお問い合わせ: お問い合わせフォーム（/contact）、メール（' + settings.email + '）' + (settings.line_url ? '、公式LINE' : '') + '。')
      addChunk('company', '代表メッセージ', '/about', [about.message_heading, ...((about.message ?? []) as string[])].join('\n'))
      addChunk('company', '代表プロフィール', '/about', [String(about.profile_role ?? '') + ' ' + String(about.profile_name ?? ''), ...((about.profile ?? []) as string[])].join('\n'))
      addChunk('policy', '料金・お見積もり', '/services', String(services.pricing ?? '') + '\n具体的な金額はサイトに掲載していません。業務の内容と量を伺ってお見積もりします。')
      addChunk('policy', 'ご利用の流れ', '/services', 'ご相談からご契約までの流れ：' + list(services.flow as string[], ' → ') + '。ご相談・お見積もりは無料です。')
      addChunk('policy', '対応エリア・対応言語', '/about', '全国に対応しています（オンラインでのご相談・支援）。所在地は' + address + '。英語でのご相談は創業支援（英語）で対応しています。')
      addChunk('policy', '士業の独占業務について', '/services', '税務申告・税務相談、社会保険・労働保険の手続き代行、登記、許認可申請、在留資格の申請、法律相談・契約書の作成などの士業の独占業務は行いません。必要に応じて提携する専門家（税理士・社労士・行政書士・司法書士・弁護士など）を紹介します。')
      // 公式の補足知識（content/chatbot/knowledge.md。CMS「サポートチャットの補足知識」）：読み方・略歴の補足・サービスの補足など。
      //    「## 見出し」ごとに1つの知識。「ページ：」は案内するページ。【聞かれたときのみ】の見出しは「きっかけの言葉：」を a に持ち、
      //    その言葉が質問に含まれるときだけ使う（src/chat/search.ts）
      const officialPath = path.resolve(__dirname, 'content/chatbot/knowledge.md')
      if (fs.existsSync(officialPath)) {
        const md = fs.readFileSync(officialPath, 'utf8').replace(/^---[\s\S]*?\n---\n/, '')
        for (const section of md.split(/\n(?=## )/).slice(1)) {
          const title = (section.match(/^##\s+(.+)/)?.[1] ?? '').trim()
          const lines = section.replace(/^##\s+.+\n?/, '').split('\n')
          const meta = (label: string) => lines.find((l) => l.startsWith(label + '：'))?.slice(label.length + 1).trim()
          const body = lines.filter((l) => !/^(ページ|きっかけの言葉)：/.test(l)).join('\n')
          const askOnly = title.startsWith('【聞かれたときのみ】')
          const ask = askOnly ? (meta('きっかけの言葉') ?? '').split(/[、,]/).map((w) => w.trim()).filter(Boolean) : undefined
          if (askOnly && !ask?.length) throw new Error('knowledge.md：【聞かれたときのみ】「' + title + '」に「きっかけの言葉：」がありません')
          addChunk('official', title, meta('ページ') || '/about', body, ask)
        }
      }
      // サービス一覧・ツール・FAQ（トップ）
      for (const key of ['backoffice', 'marketing'] as const) {
        const group = services[key] || {}
        addChunk('service', String(group.title ?? ''), '/services#' + key, String(group.lead ?? '') + '\n' + ((group.items ?? []) as { name: string; text: string }[]).map((item) => item.name + '：' + item.text).join('\n'))
      }
      addChunk('tools', String(home.tools_title ?? '対応ツール'), '/', list(((home.tools ?? []) as { name: string; category?: string }[]).map((tool) => tool.name + (tool.category ? '（' + tool.category + '）' : ''))) + '。' + String(home.tools_note ?? ''))
      addChunk('strength', String(home.strengths_title ?? '選ばれる理由'), '/', ((home.strengths ?? []) as { title: string; text: string }[]).map((st) => st.title + '：' + st.text).join('\n'))
      for (const f of faqs) addChunk('faq', 'Q. ' + f.q, '/', 'Q. ' + f.q + '\nA. ' + f.a)
      // サービス別ページ
      for (const sol of solutionList) {
        if (sol.hidden) continue
        const u = '/services/' + sol.slug
        const name = sol.nav_label || sol.title
        addChunk('lp', name + '：概要', u, [sol.title, String(sol.catch ?? '').replace(/\*\*/g, '').replace(/\n/g, ''), sol.lead, sol.description].filter(Boolean).join('\n'))
        if (sol.problems?.length) addChunk('lp', name + '：こんなお悩みに', u, list(sol.problems, '\n'))
        if (sol.scheme) addChunk('lp', name + '：支援の仕組み', u, [sol.scheme.title, sol.scheme.lead, ...relayFlow(sol.scheme), ...(sol.scheme.nodes ?? []).filter((n) => n.who).map((n) => (n.who === 'client' ? '御社：' : 'COANA TOKYO：') + n.label + '（' + (n.detail || n.sub || '') + '）'), ...(sol.scheme.points ?? []).map((pt) => pt.name + '：' + (pt.text ?? '')), sol.scheme.note].filter(Boolean).join('\n'))
        if (sol.features?.length) addChunk('lp', name + '：支援内容', u, [sol.features_lead, ...sol.features.map((ft) => ft.name + '：' + (ft.text ?? ''))].filter(Boolean).join('\n'))
        if (sol.tools?.length) addChunk('lp', name + '：対応ツール', u, list(sol.tools) + '。' + (sol.tools_note ?? ''))
        if (sol.scope?.groups?.length) addChunk('lp', name + '：ご依頼いただける業務', u, sol.scope.groups.map((g) => g.name + '：' + list(g.items)).join('\n') + '\n' + (sol.scope.note ?? ''))
        for (const plan of sol.plans?.items ?? []) addChunk('lp', name + '：プラン例「' + plan.name + '」', u, [plan.name + (plan.tag ? '（' + plan.tag + '）' : ''), plan.text, plan.includes?.length ? '含まれるもの：' + list(plan.includes) : '', plan.best_for ? 'こんな方に：' + plan.best_for : '', sol.plans?.note].filter(Boolean).join('\n'))
        for (const sc of sol.scenarios?.items ?? []) addChunk('lp', name + '：ご利用イメージ「' + sc.name + '」', u, [sc.name, sc.before ? 'Before：' + sc.before : '', sc.text ? 'After：' + sc.text : ''].filter(Boolean).join('\n'))
        if (sol.flow?.length) addChunk('lp', name + '：ご利用までの流れ', u, sol.flow.map((st, i) => (i + 1) + '. ' + st.name + (st.text ? '：' + st.text : '')).join('\n') + '\n' + (sol.flow_note ?? ''))
        for (const f of sol.faqs ?? []) addChunk('faq', name + '：Q. ' + f.q, u, 'Q. ' + f.q + '\nA. ' + f.a)
      }
      // トピックス（セミナー・コラム）：見出しと要点
      if (fs.existsSync(topicsDir)) {
        for (const item of sortedTopics) {
          const slug = item.url.replace(SITE + '/topics/', '')
          const raw = fs.readFileSync(path.join(topicsDir, slug + '.md'), 'utf8')
          const body = raw.replace(/^---[\s\S]*?\n---/, '').replace(/<figure[\s\S]*?<\/figure>/g, '').replace(/<[^>]+>/g, '')
          const headings = (body.match(/^#{2,3}\s+.+$/gm) ?? []).map((h) => h.replace(/^#+\s+/, ''))
          addChunk('topic', item.title, '/topics/' + slug, item.date + ' ' + item.title + '\n' + item.description + (headings.length ? '\n主な内容：' + headings.slice(0, 8).join('／') : ''))
        }
      }
      // プライバシーポリシー（見出しごと）
      for (const section of String(privacy.body ?? '').split(/\n(?=## )/)) {
        const title = (section.match(/^##\s+(.+)/)?.[1] ?? 'プライバシーポリシー').trim()
        addChunk('privacy', 'プライバシーポリシー：' + title, '/privacy', section.replace(/^##\s+.+\n?/, ''))
      }
      const knowledge = { generated: new Date().toISOString(), site: SITE, chunks }
      fs.writeFileSync(path.join(outDir, 'chat-knowledge.json'), JSON.stringify(knowledge))
    },
  }
}
