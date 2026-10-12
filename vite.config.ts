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
 * SEO：各ページ・各トピックス記事ごとに、タイトル・説明文・OGP・構造化データ（JSON-LD）を埋め込んだ HTML を書き出す。
 * あわせて sitemap.xml、RSS（feed.xml）、llms.txt、404.html を生成する。
 * 会社情報・サービス名・FAQ は content/ の JSON（CMSで編集する内容）から読み込む。
 */
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

      // ファビコン・スマホ用アイコン・SNS共有画像は CMS（content/settings.json）の設定を優先する
      const defaultImage = settings.og_image ? absoluteUrl(String(settings.og_image)) : builtImage
      const faviconHref = String(settings.favicon || '/favicon.svg')
      const touchIconHref = String(settings.apple_touch_icon || '/apple-touch-icon.png')
      const faviconType = /\.svg$/i.test(faviconHref) ? 'image/svg+xml' : /\.png$/i.test(faviconHref) ? 'image/png' : /\.ico$/i.test(faviconHref) ? 'image/x-icon' : ''
      let shell = builtShell.replace(/\s*<link\s+rel="(?:icon|apple-touch-icon)"[^>]*>/g, '')
      shell = shell.replace('</head>', () => '    <link rel="icon" href="' + escapeAttr(faviconHref) + '"' + (faviconType ? ' type="' + faviconType + '"' : '') + ' />\n    ' + (faviconHref !== '/favicon.ico' ? '<link rel="icon" href="/favicon.ico" sizes="any" />\n    ' : '') + '<link rel="apple-touch-icon" href="' + escapeAttr(touchIconHref) + '" />\n  </head>')

      // 住所を都道府県・市区町村・それ以降に分ける（構造化データ用）
      const address: string = String(settings.address || '')
      const regionMatch = address.match(/^(東京都|北海道|(?:大阪|京都)府|.{2,3}県)/)
      const region = regionMatch ? regionMatch[1] : ''
      const rest = address.slice(region.length)
      const localityMatch = rest.match(/^(.+?[市区町村])/)
      const locality = localityMatch ? localityMatch[1] : ''
      const street = rest.slice(locality.length)

      const orgId = SITE + '/#organization'
      const organization = {
        '@type': ['Organization', 'ProfessionalService'],
        '@id': orgId,
        name: settings.company_name || 'COANA TOKYO合同会社',
        alternateName: 'COANA TOKYO',
        url: SITE,
        sameAs: settings.same_as || ['https://www.facebook.com/profile.php?id=61589876101798', 'https://maps.google.com/?cid=15984393387638365667'],
        logo: SITE + '/apple-touch-icon.png',
        image: defaultImage,
        description: defaultDescription,
        email: settings.email,
        address: { '@type': 'PostalAddress', postalCode: String(settings.postal_code || '').replace(/^〒/, ''), addressRegion: region, addressLocality: locality, streetAddress: street, addressCountry: 'JP' },
        areaServed: { '@type': 'Country', name: '日本' },
        founder: { '@type': 'Person', name: about.profile_name, jobTitle: about.profile_role },
        foundingDate: '2025-10',
        knowsAbout: ['経理代行・経理業務の改善', 'クラウド会計・ITツール導入支援', 'バックオフィス代行・DX支援', '創業支援', 'ERPの導入', 'グループウェアの導入', '営業・販路開拓支援', 'セミナー・イベント開催支援', 'SNS運用支援・運用代行', 'Webサイト制作'],
        knowsLanguage: ['ja', 'en'],
        contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: settings.email, url: SITE + '/contact', availableLanguage: ['Japanese', 'English'], areaServed: 'JP' }],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'サービス',
          itemListElement: ['backoffice', 'marketing'].flatMap((key) => ((services[key]?.items ?? []) as { name: string; text: string }[]).map((item) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: item.name, description: item.text, provider: { '@id': orgId }, areaServed: 'JP' } }))),
        },
      }
      const website = { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE, name: 'COANA TOKYO', publisher: { '@id': orgId }, inLanguage: ['ja', 'en'] }
      const graph = (...items: object[]) => [{ '@context': 'https://schema.org', '@graph': [organization, website, ...items] }]
      const crumbs = (items: { name: string; url: string }[]) => ({ '@type': 'BreadcrumbList', itemListElement: items.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })) })
      const homeCrumb = { name: 'ホーム', url: SITE + '/' }

      const faqs = ((home.faqs ?? []) as { q: string; a: string }[]).filter((f) => f.q && f.a)
      const faqPage = faqs.length ? [{ '@type': 'FAQPage', mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []

      const pages: PageMeta[] = [
        { path: '/', title: homeTitle, description: '', preload: home.hero_image, jsonld: graph(...faqPage) },
        { path: '/about', crumb: '会社概要', title: '会社概要・代表メッセージ' + SUFFIX, description: '東京・港区のCOANA TOKYO合同会社の会社概要。中小企業・小規模事業者のバックオフィスとマーケティングを支える当社の考え方、代表メッセージ、代表プロフィール、会社情報をご紹介します。', jsonld: graph(crumbs([homeCrumb, { name: '会社概要', url: SITE + '/about' }])) },
        { path: '/services', crumb: 'サービス', title: 'サービス｜経理・バックオフィス改善、ITツール導入、マーケティング支援' + SUFFIX, description: '中小企業・小規模事業者に向けた、経理・業務フローの改善と実務代行、創業支援、会計・勤怠・販売管理などITツール・クラウドツールの導入支援、営業・セミナー・SNS・Webサイト制作のマーケティング支援。料金は個別お見積もり。', jsonld: graph(crumbs([homeCrumb, { name: 'サービス', url: SITE + '/services' }])) },
        { path: '/topics', crumb: 'トピックス', title: 'トピックス｜セミナー登壇・メディア掲載・お知らせ' + SUFFIX, description: 'セミナー登壇やメディア掲載など、COANA TOKYO合同会社の最新の活動をお知らせします。経理DXやクラウド会計に関する講座・記事もご紹介。', jsonld: graph(crumbs([homeCrumb, { name: 'トピックス', url: SITE + '/topics' }])) },
        { path: '/contact', crumb: 'お問い合わせ', title: 'お問い合わせ｜バックオフィス・マーケティングのご相談' + SUFFIX, description: '経理やバックオフィスの見直し、ITツール導入、集客・営業のご相談はこちらから。中小企業・小規模事業者の小さな困りごとでもお気軽に。内容を確認のうえ担当者よりご連絡いたします。', jsonld: graph(crumbs([homeCrumb, { name: 'お問い合わせ', url: SITE + '/contact' }])) },
        { path: '/privacy', crumb: 'プライバシーポリシー', title: 'プライバシーポリシー' + SUFFIX, description: 'COANA TOKYO合同会社のプライバシーポリシーです。', jsonld: graph(crumbs([homeCrumb, { name: 'プライバシーポリシー', url: SITE + '/privacy' }])) },
      ]

      // サービス別の専用ページ（content/solutions/*.json）
      type Named = { name: string; text?: string }
      type Solution = {
        slug: string; order?: number; nav_label?: string; title: string; seo_title?: string; description?: string; lead?: string; catch?: string; hero_image?: string
        lang?: 'ja' | 'en'; hidden?: boolean; english?: { slug?: string }
        hero_facts?: { value: string; label: string }[]
        target_title?: string; target?: Named[]
        problems_title?: string; problems?: string[]
        scheme?: { title?: string; lead?: string; center?: { label?: string; sub?: string }; nodes?: { label: string; sub?: string; sub2?: string }[]; points?: Named[]; note?: string }
        outcome_title?: string; outcome_lead?: string; outcomes?: { label: string; before: string; after: string }[]
        features_title?: string; features_lead?: string; features?: Named[]; tools?: string[]; tools_note?: string
        scope?: { title?: string; lead?: string; groups?: { name: string; items?: string[] }[]; note?: string }
        compare?: { title?: string; lead?: string; ours_label?: string; others_label?: string; rows?: { label: string; ours: string; others: string }[]; note?: string }
        plans?: { title?: string; lead?: string; items?: { name: string; tag?: string; text?: string; includes?: string[]; best_for?: string }[]; note?: string }
        reasons_title?: string; reasons?: Named[]
        scenarios?: { title?: string; lead?: string; items?: { name: string; tag?: string; before?: string; text?: string }[]; note?: string }
        flow_title?: string; flow?: Named[]; flow_note?: string; steps?: string[]
        message_title?: string; message?: string
        faq_title?: string; faqs?: { q: string; a: string }[]
      }
      // 日本語／英語ページで共通の見出し（src/SolutionPage.tsx の LABELS と対応）
      const SOL_LABELS = {
        ja: { home: 'ホーム', services: 'サービス', forYou: 'こんな方におすすめです', problems: 'こんなお悩みはありませんか', scheme: '支援の仕組み', outcomes: '支援後に、こう変わります', before: 'Before', after: 'After', support: '支援内容', tools: '対応ツールの例', scope: 'ご依頼いただける業務の例', compare: '一般的なサービスとの違い', ours: 'COANA TOKYO', others: '一般的なサービス', plans: 'ご利用プランの例', bestFor: 'こんな方に', reasons: 'COANA TOKYOが選ばれる理由', scenarios: 'ご利用イメージ', flow: 'ご利用までの流れ', message: '代表からのメッセージ', rep: '代表', faq: 'よくあるご質問', contact: 'お問い合わせ・ご相談はこちら（無料）', list: 'サービス一覧', english: 'English page', suffix: ' | COANA TOKYO合同会社' },
        en: { home: 'Home', services: 'Services', forYou: 'Who this is for', problems: 'Sound familiar?', scheme: 'How it works', outcomes: 'What changes', before: 'Before', after: 'After', support: 'What we do', tools: 'Tools we work with', scope: 'Examples of what you can ask us', compare: 'How we are different', ours: 'COANA TOKYO', others: 'Typical services', plans: 'Example plans', bestFor: 'Best for', reasons: 'Why COANA TOKYO', scenarios: 'Example situations', flow: 'How to get started', message: 'A message from our founder', rep: 'Founder', faq: 'FAQ', contact: 'Contact us (free consultation)', list: 'All services', english: 'Japanese page', suffix: ' | COANA TOKYO LLC' },
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
          preload: sol.hero_image || services.hero_image,
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
              areaServed: { '@type': 'Country', name: lang === 'en' ? 'Japan' : '日本' },
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
      const fallbackMain = (pagePath: string): string => {
        if (pagePath === '/') {
          const strengths = (home.strengths || []) as { title: string; heading: string; description: string }[]
          const faqItems = (home.faqs || []) as { q: string; a: string }[]
          return '<h1>' + esc(home.hero_line1) + esc(home.hero_line2) + '</h1>' + '<p>' + esc((home.hero_words || []).join('・')) + esc(home.hero_solve_text) + '</p>' +
            '<section><h2>' + esc(home.about_title) + '</h2>' + paras(home.about_text) + anchor('/about', '会社概要を見る') + '</section>' +
            '<section><h2>' + esc(home.services_title) + '</h2>' + paras(home.services_lead) + serviceSections + anchor('/services', 'サービスを詳しく見る') + '</section>' +
            '<section><h2>' + esc(home.strengths_title) + '</h2>' + strengths.map((st) => '<h3>' + esc(st.title) + '：' + esc(st.heading) + '</h3>' + paras(st.description)).join('') + '</section>' +
            '<section><h2>' + esc(home.faq_title) + '</h2><dl>' + faqItems.map((f) => '<dt>' + esc(f.q) + '</dt><dd>' + esc(f.a) + '</dd>').join('') + '</dl></section>' +
            '<section><h2>' + esc(home.topics_title) + '</h2>' + topicList(sortedTopics.slice(0, 5)) + anchor('/topics', 'トピックス一覧') + '</section>' +
            '<p>' + anchor('/contact', 'お問い合わせ・ご相談はこちら') + '</p>'
        }
        if (pagePath === '/about') {
          const rows = (about.company || []) as { label: string; value: string }[]
          return '<h1>会社概要</h1>' +
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
        if (pagePath === '/topics') return '<h1>トピックス</h1>' + topicList(sortedTopics)
        if (pagePath === '/contact') return '<h1>お問い合わせ</h1>' + paras(settings.contact_intro) + '<p>メール：' + esc(settings.email) + '</p>'
        if (pagePath === '/privacy') return '<h1>プライバシーポリシー</h1>'
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
        const flowItems: Named[] = (sol.flow ?? []).length ? (sol.flow ?? []) : (sol.steps ?? []).map((step) => ({ name: step }))
        return '<h1>' + esc(sol.title) + '</h1>' + (sol.catch ? '<p><strong>' + esc(sol.catch.replace(/\n/g, ' ')) + '</strong></p>' : '') + paras(sol.lead) +
          ((sol.hero_facts ?? []).length ? '<ul>' + (sol.hero_facts ?? []).map((f) => '<li>' + esc(f.value) + (f.label ? '：' + esc(f.label) : '') + '</li>').join('') + '</ul>' : '') +
          section(sol.target_title || T.forYou, named(sol.target, 'strong')) +
          section(sol.problems_title || T.problems, (sol.problems ?? []).length ? '<ul>' + (sol.problems ?? []).map((p) => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '') +
          section(sol.scheme?.title || T.scheme, (sol.scheme ? paras(sol.scheme.lead) +
            ((sol.scheme.nodes ?? []).length ? '<ul>' + (sol.scheme.nodes ?? []).map((n) => '<li><strong>' + esc(n.label) + '</strong>' + (n.sub ? '：' + esc(n.sub) : '') + (n.sub2 ? ' ' + esc(n.sub2) : '') + '</li>').join('') + '</ul>' : '') +
            named(sol.scheme.points, 'strong') + paras(sol.scheme.note) : '')) +
          section(sol.outcome_title || T.outcomes, (sol.outcomes ?? []).length ? paras(sol.outcome_lead) + '<ul>' + (sol.outcomes ?? []).map((o) => '<li><strong>' + esc(o.label) + '</strong> ' + T.before + '：' + esc(o.before) + ' → ' + T.after + '：' + esc(o.after) + '</li>').join('') + '</ul>' : '') +
          section(sol.features_title || T.support, paras(sol.features_lead) + named(sol.features, 'h3') +
            ((sol.tools ?? []).length ? '<p>' + esc(T.tools) + '：' + esc((sol.tools ?? []).join('、')) + '</p>' + paras(sol.tools_note) : '')) +
          section(sol.scope?.title || T.scope, (sol.scope ? paras(sol.scope.lead) + (sol.scope.groups ?? []).map((g) => '<h3>' + esc(g.name) + '</h3><ul>' + (g.items ?? []).map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>').join('') + paras(sol.scope.note) : '')) +
          section(sol.compare?.title || T.compare, (sol.compare && (sol.compare.rows ?? []).length ? paras(sol.compare.lead) + '<table><thead><tr><th></th><th>' + esc(sol.compare.ours_label || T.ours) + '</th><th>' + esc(sol.compare.others_label || T.others) + '</th></tr></thead><tbody>' +
            (sol.compare.rows ?? []).map((r) => '<tr><th>' + esc(r.label) + '</th><td>' + esc(r.ours) + '</td><td>' + esc(r.others) + '</td></tr>').join('') + '</tbody></table>' + paras(sol.compare.note) : '')) +
          section(sol.plans?.title || T.plans, (sol.plans && (sol.plans.items ?? []).length ? paras(sol.plans.lead) + (sol.plans.items ?? []).map((pl) => '<h3>' + esc(pl.name) + (pl.tag ? '（' + esc(pl.tag) + '）' : '') + '</h3>' + paras(pl.text) +
            ((pl.includes ?? []).length ? '<ul>' + (pl.includes ?? []).map((i) => '<li>' + esc(i) + '</li>').join('') + '</ul>' : '') + (pl.best_for ? '<p>' + esc(T.bestFor) + '：' + esc(pl.best_for) + '</p>' : '')).join('') + paras(sol.plans.note) : '')) +
          section(sol.reasons_title || T.reasons, named(sol.reasons, 'h3')) +
          section(sol.scenarios?.title || T.scenarios, (sol.scenarios && (sol.scenarios.items ?? []).length ? paras(sol.scenarios.lead) + (sol.scenarios.items ?? []).map((sc) => '<h3>' + esc(sc.name) + (sc.tag ? '（' + esc(sc.tag) + '）' : '') + '</h3>' + (sc.before ? '<p>' + T.before + '：' + esc(sc.before) + '</p>' : '') + paras(sc.text)).join('') + paras(sol.scenarios.note) : '')) +
          section(sol.flow_title || T.flow, (flowItems.length ? '<ol>' + flowItems.map((st) => '<li><strong>' + esc(st.name) + '</strong>' + (st.text ? ' ' + esc(st.text) : '') + '</li>').join('') + '</ol>' + paras(sol.flow_note) : '')) +
          section(sol.message_title || T.message, (sol.message ? paras(sol.message) + '<p>' + esc(settings.company_name) + ' ' + T.rep + ' ' + esc(solLang(sol) === 'en' ? about.profile_name_en || about.profile_name : about.profile_name) + '</p>' : '')) +
          ((sol.faqs ?? []).length ? '<section><h2>' + esc(sol.faq_title || T.faq) + '</h2><dl>' + (sol.faqs ?? []).map((f) => '<dt>' + esc(f.q) + '</dt><dd>' + esc(f.a) + '</dd>').join('') + '</dl></section>' : '') +
          '<p>' + anchor('/contact', T.contact) + ' ' + anchor('/services', T.list) + (pair ? ' ' + anchor('/services/' + pair.slug, T.english) : '') + '</p>'
      }
      const mdList = (items: string[] | undefined) => (items ?? []).map((i) => '- ' + i).join('\n')
      const solutionMarkdown = (sol: Solution): string => {
        const T = SOL_LABELS[solLang(sol)]
        const url = SITE + '/services/' + sol.slug
        const flowItems: Named[] = (sol.flow ?? []).length ? (sol.flow ?? []) : (sol.steps ?? []).map((step) => ({ name: step }))
        const block = (title: string | undefined, body: string) => (body.trim() ? '### ' + title + '\n\n' + body.trim() + '\n\n' : '')
        return '## ' + (sol.nav_label || sol.title) + '\n\n' + 'URL: ' + url + '\n\n' + (sol.title !== sol.nav_label ? sol.title + '\n\n' : '') + String(sol.description || sol.lead || '') + '\n\n' +
          block(sol.target_title || T.forYou, (sol.target ?? []).map((t) => '- ' + t.name + (t.text ? '：' + t.text : '')).join('\n')) +
          block(sol.problems_title || T.problems, mdList(sol.problems)) +
          block(sol.scheme?.title || T.scheme, (sol.scheme?.lead ? sol.scheme.lead + '\n\n' : '') + (sol.scheme?.nodes ?? []).map((n) => '- ' + n.label + (n.sub ? '：' + n.sub : '') + (n.sub2 ? ' ' + n.sub2 : '')).join('\n') + '\n' + (sol.scheme?.points ?? []).map((pt) => '- ' + pt.name + (pt.text ? '：' + pt.text : '')).join('\n') + (sol.scheme?.note ? '\n\n' + sol.scheme.note : '')) +
          block(sol.outcome_title || T.outcomes, (sol.outcomes ?? []).map((o) => '- ' + o.label + '：' + T.before + ' ' + o.before + ' → ' + T.after + ' ' + o.after).join('\n')) +
          block(sol.features_title || T.support, (sol.features ?? []).map((f) => '- ' + f.name + (f.text ? '：' + f.text : '')).join('\n') + ((sol.tools ?? []).length ? '\n\n' + T.tools + '：' + (sol.tools ?? []).join('、') : '')) +
          block(sol.scope?.title || T.scope, (sol.scope?.groups ?? []).map((g) => '- ' + g.name + '：' + (g.items ?? []).join('、')).join('\n') + (sol.scope?.note ? '\n\n' + sol.scope.note : '')) +
          block(sol.compare?.title || T.compare, (sol.compare?.rows ?? []).map((r) => '- ' + r.label + '：' + (sol.compare?.ours_label || T.ours) + '＝' + r.ours + '／' + (sol.compare?.others_label || T.others) + '＝' + r.others).join('\n')) +
          block(sol.plans?.title || T.plans, (sol.plans?.items ?? []).map((pl) => '- ' + pl.name + (pl.tag ? '（' + pl.tag + '）' : '') + (pl.text ? '：' + pl.text : '') + ((pl.includes ?? []).length ? '（' + (pl.includes ?? []).join('、') + '）' : '')).join('\n') + (sol.plans?.lead ? '\n\n' + sol.plans.lead : '')) +
          block(sol.reasons_title || T.reasons, (sol.reasons ?? []).map((r) => '- ' + r.name + (r.text ? '：' + r.text : '')).join('\n')) +
          block(sol.scenarios?.title || T.scenarios, (sol.scenarios?.lead ? sol.scenarios.lead + '\n\n' : '') + (sol.scenarios?.items ?? []).map((sc) => '- ' + sc.name + (sc.tag ? '（' + sc.tag + '）' : '') + (sc.before ? ' ' + T.before + '：' + sc.before : '') + (sc.text ? ' → ' + sc.text : '')).join('\n')) +
          block(sol.flow_title || T.flow, flowItems.map((st, i) => (i + 1) + '. ' + st.name + (st.text ? '：' + st.text : '')).join('\n') + (sol.flow_note ? '\n\n' + sol.flow_note : '')) +
          block(sol.faq_title || T.faq, (sol.faqs ?? []).map((f) => '- Q. ' + f.q + '\n  A. ' + f.a).join('\n'))
      }
      const fallbackHeader = '<header>' + anchor('/', String(settings.company_name || 'COANA TOKYO')) + '<nav aria-label="メインナビゲーション">' +
        [['/', 'ホーム'], ['/about', '会社概要'], ['/services', 'サービス'], ['/topics', 'トピックス'], ['/contact', 'お問い合わせ']].map(([href, text]) => anchor(href, text)).join(' ') + '</nav></header>'
      const fallbackFooter = '<footer><p>' + esc(settings.company_name) + '</p><address>' + esc(settings.postal_code) + ' ' + esc(settings.address) + '</address><nav aria-label="フッター">' +
        anchor('/services#backoffice', 'バックオフィス支援') + ' ' + anchor('/services#marketing', 'マーケティング支援') + ' ' + solutionList.filter((sol) => !sol.hidden).map((sol) => anchor('/services/' + sol.slug, sol.nav_label || sol.title)).join(' ') + ' ' + anchor('/privacy', 'プライバシーポリシー') + '</nav></footer>'
      const withFallback = (html: string, pagePath: string) => html.replace('<div id="root"></div>', () =>
        '<div id="root"><div class="seo-fallback" style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);border:0">' +
        fallbackHeader + '<main>' + fallbackMain(pagePath) + '</main>' + fallbackFooter + '</div></div>')

      for (const page of pages) {
        const file = page.path === '/' ? shellPath : path.join(outDir, page.path.slice(1) + '.html')
        fs.mkdirSync(path.dirname(file), { recursive: true })
        fs.writeFileSync(file, withFallback(render(shell, page, defaultDescription, defaultImage), page.path))
      }

      // 存在しないURLは 404 を返す（画像の取り違えキャッシュ対策を兼ねる）
      const notFound = render(shell, { path: '/404', title: 'ページが見つかりません' + SUFFIX, description: '' }, defaultDescription, defaultImage)
        .replace(/\s*<link\s+rel="canonical"[^>]*>/, '')
        .replace(/<meta\s+name="robots"[^>]*>/, '<meta name="robots" content="noindex" />')
      fs.writeFileSync(path.join(outDir, '404.html'), notFound)

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
    },
  }
}
