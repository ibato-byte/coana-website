import { defineConfig, type HtmlTagDescriptor, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
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
react(),
      tailwindcss(),
      figmaSiteConfiguration(siteConfiguration),
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
 * 各ページ・各トピックス記事ごとに、タイトル・説明文・OGP画像を埋め込んだ HTML を書き出す。
 * SNSで共有したときや検索結果に、そのページの内容が正しく表示されるようにする。
 * 例：dist/about.html、dist/topics/20260911-media.html（/about や /topics/20260911-media で配信される）
 * あわせて、全ページと公開中の記事を含む sitemap.xml を生成する。
 */
function coanaPageMeta(): Plugin {
  const SITE = 'https://coana.co.jp'
  const SUFFIX = ' | COANA TOKYO合同会社'
  let outDir = 'dist'

  type PageMeta = { path: string; title: string; description: string; image?: string; type?: string; lastmod?: string }

  const escapeAttr = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const absoluteUrl = (value: string) => (/^https?:\/\//.test(value) ? value : SITE + (value.startsWith('/') ? value : '/' + value))

  function setMeta(html: string, attr: 'name' | 'property', key: string, content: string) {
    const tag = '<meta ' + attr + '="' + key + '" content="' + escapeAttr(content) + '" />'
    const pattern = new RegExp('<meta\\s+' + attr + '="' + key.replace(/[.:]/g, '\\$&') + '"[^>]*>')
    return pattern.test(html) ? html.replace(pattern, () => tag) : html.replace('</head>', () => '    ' + tag + '\n  </head>')
  }

  function render(shell: string, page: PageMeta, defaultDescription: string, defaultImage: string) {
    const url = SITE + (page.path === '/' ? '/' : page.path)
    const description = page.description || defaultDescription
    const image = page.image || defaultImage
    let html = shell.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escapeAttr(page.title) + '</title>')
    html = setMeta(html, 'name', 'description', description)
    html = setMeta(html, 'property', 'og:type', page.type || 'website')
    html = setMeta(html, 'property', 'og:url', url)
    html = setMeta(html, 'property', 'og:title', page.title)
    html = setMeta(html, 'property', 'og:description', description)
    if (image) {
      html = setMeta(html, 'property', 'og:image', image)
      html = setMeta(html, 'name', 'twitter:card', 'summary_large_image')
      html = setMeta(html, 'name', 'twitter:image', image)
    }
    html = setMeta(html, 'name', 'twitter:title', page.title)
    html = setMeta(html, 'name', 'twitter:description', description)
    const canonical = '<link rel="canonical" href="' + escapeAttr(url) + '" />'
    html = /<link\s+rel="canonical"[^>]*>/.test(html)
      ? html.replace(/<link\s+rel="canonical"[^>]*>/, () => canonical)
      : html.replace('</head>', () => '    ' + canonical + '\n  </head>')
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
      const shell = fs.readFileSync(shellPath, 'utf8')
      const defaultDescription = (shell.match(/<meta\s+name="description"\s+content="([^"]*)"/) || [])[1] || ''
      const defaultImage = (shell.match(/<meta\s+property="og:image"\s+content="([^"]*)"/) || [])[1] || ''

      const pages: PageMeta[] = [
        { path: '/', title: (shell.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'COANA TOKYO合同会社', description: '' },
        { path: '/about', title: '会社概要' + SUFFIX, description: 'COANA TOKYO合同会社の会社概要。代表メッセージ、代表プロフィール、会社情報をご紹介します。' },
        { path: '/services', title: 'サービス' + SUFFIX, description: '中小企業・小規模事業者に向けた、経理・業務フローの改善、ITツール・クラウドツールの導入、実務代行などのバックオフィス支援と、営業・セミナー・SNS・Webサイト制作のマーケティング支援をご紹介します。' },
        { path: '/topics', title: 'トピックス' + SUFFIX, description: 'セミナー登壇やメディア掲載など、COANA TOKYO合同会社の最新の活動をお知らせします。' },
        { path: '/contact', title: 'お問い合わせ' + SUFFIX, description: '中小企業・小規模事業者のバックオフィスやマーケティングのお悩みは、こちらからお気軽にご相談ください。内容を確認のうえ、担当者よりご連絡いたします。' },
        { path: '/privacy', title: 'プライバシーポリシー' + SUFFIX, description: 'COANA TOKYO合同会社のプライバシーポリシーです。' },
      ]

      const topicsDir = path.resolve(__dirname, 'content/topics')
      if (fs.existsSync(topicsDir)) {
        for (const file of fs.readdirSync(topicsDir).filter((name) => name.endsWith('.md'))) {
          const raw = fs.readFileSync(path.join(topicsDir, file), 'utf8')
          const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
          const fm = (match ? parseYaml(match[1]) : {}) ?? {}
          if (fm.draft) continue
          const slug = file.replace(/\.md$/, '')
          const date = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : String(fm.date ?? '').slice(0, 10)
          pages.push({
            path: '/topics/' + slug,
            title: String(fm.title ?? slug) + SUFFIX,
            description: String(fm.summary ?? ''),
            image: fm.thumbnail ? absoluteUrl(String(fm.thumbnail)) : undefined,
            type: 'article',
            lastmod: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
          })
        }
      }

      for (const page of pages) {
        const file = page.path === '/' ? shellPath : path.join(outDir, page.path.slice(1) + '.html')
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, render(shell, page, defaultDescription, defaultImage))
      }

      const sitemap = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...pages.map((page) => '  <url><loc>' + SITE + page.path + '</loc>' + (page.lastmod ? '<lastmod>' + page.lastmod + '</lastmod>' : '') + '</url>'),
        '</urlset>',
        '',
      ].join('\n')
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap)
    },
  }
}
