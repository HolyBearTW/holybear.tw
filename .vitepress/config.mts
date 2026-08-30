/* import { defineConfig } from 'vitepress' */
import { defineConfig } from '@lando/vitepress-theme-default-plus/config'
import { createLogger } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import locales from './locales/index.ts'
import gitMetaPlugin from './git-meta.ts'
import TelegramRoseBotDocsSidebar from './sidebars/Telegram-Rose-Bot-docs.sidebar.ts'
import VitepressBlogDocsSidebar from './sidebars/Vitepress-Blog-docs-sidebar.ts'
import SpoilerComponentDocsSidebar from './sidebars/spoiler-component-docs-sidebar.ts'

const viteLogger = createLogger()
const viteWarn = viteLogger.warn.bind(viteLogger)
const imageManifestPath = fileURLToPath(new URL('./image-optimization-manifest.json', import.meta.url))
const gitCommitHash = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
const gitCommitDate = new Intl.DateTimeFormat('sv-SE', {
    dateStyle: 'short',
    timeStyle: 'medium',
    hour12: false,
    timeZone: 'Asia/Taipei',
}).format(new Date(execFileSync('git', ['log', '-1', '--format=%cI'], { encoding: 'utf8' }).trim()))
const optimizedImageUrls: Record<string, string> = (() => {
    if (!existsSync(imageManifestPath)) return {}

    try {
        return JSON.parse(readFileSync(imageManifestPath, 'utf8'))
    } catch (error) {
        console.warn('無法讀取部署圖片對照表，將使用原圖：', error)
        return {}
    }
})()

const getOptimizedImageUrl = (sourceUrl: string | null) => {
    if (!sourceUrl || !sourceUrl.startsWith('/')) return null
    const suffixIndex = sourceUrl.search(/[?#]/)
    const path = suffixIndex === -1 ? sourceUrl : sourceUrl.slice(0, suffixIndex)
    const suffix = suffixIndex === -1 ? '' : sourceUrl.slice(suffixIndex)

    try {
        const optimizedPath = optimizedImageUrls[decodeURI(path)]
        return optimizedPath ? `${optimizedPath}${suffix}` : null
    } catch {
        return null
    }
}

const escapeHtmlAttribute = (value: string) => value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')

const wrapWithOptimizedSource = (imageHtml: string, sourceUrl: string | null) => {
    const optimizedUrl = getOptimizedImageUrl(sourceUrl)
    if (!optimizedUrl) return imageHtml
    return `<picture style="display: contents"><source type="image/webp" srcset="${escapeHtmlAttribute(optimizedUrl)}">${imageHtml}</picture>`
}

viteLogger.warn = (message, options) => {
    const normalizedMessage = message.replaceAll('\\', '/')
    const isBrokenTimeagoSourceMap =
        normalizedMessage.includes('Sourcemap for') &&
        normalizedMessage.includes('/node_modules/timeago.js/')

    if (normalizedMessage.includes('Something has shimmed') || isBrokenTimeagoSourceMap) return
    viteWarn(message, options)
}

const config = defineConfig({
    ignoreDeadLinks: true,
    title: '聖小熊的秘密基地',
    base: '/',
    lang: 'zh-TW',
    locales: locales.locales,
    srcExclude: [
        'README.md',
        'README_en.md',
        'test.md',
        '.vitepress/**/*.md',
        'zh_TW/**/*.md'
    ],
    sitemap: {
        hostname: 'https://holybear.tw'
    },
    robots: {
        allowAll: false,
        sitemap: 'https://holybear.tw/sitemap.xml',
        policies: [
            { userAgent: 'Amazonbot', disallow: '/' },
            { userAgent: 'Applebot-Extended', disallow: '/' },
            { userAgent: 'Bytespider', disallow: '/' },
            { userAgent: 'CCBot', disallow: '/' },
            { userAgent: 'ClaudeBot', disallow: '/' },
            { userAgent: 'Google-Extended', disallow: '/' },
            { userAgent: 'GPTBot', disallow: '/' },
            { userAgent: 'meta-externalagent', disallow: '/' },
            { userAgent: '*', disallow: '/video/maple.mp4' }
        ]
    },
    // 啟用 cleanUrls，移除路由中的 .html 後綴
    cleanUrls: true,
    markdown: {
        config(md) {
            const addDeferredImageAttributes = (html: string) => html.replace(/<img\b[^>]*>/gi, (tag) => {
                let optimizedTag = tag
                if (!/\bloading\s*=/i.test(optimizedTag)) {
                    optimizedTag = optimizedTag.replace(/^<img\b/i, '<img loading="lazy"')
                }
                if (!/\bdecoding\s*=/i.test(optimizedTag)) {
                    optimizedTag = optimizedTag.replace(/^<img\b/i, '<img decoding="async"')
                }
                return optimizedTag
            })

            const renderImage = md.renderer.rules.image
            md.renderer.rules.image = (tokens, index, options, env, self) => {
                tokens[index].attrSet('loading', 'lazy')
                tokens[index].attrSet('decoding', 'async')
                const imageHtml = renderImage
                    ? renderImage(tokens, index, options, env, self)
                    : self.renderToken(tokens, index, options)
                return wrapWithOptimizedSource(imageHtml, tokens[index].attrGet('src'))
            }

            for (const ruleName of ['html_block', 'html_inline'] as const) {
                const renderHtml = md.renderer.rules[ruleName]
                md.renderer.rules[ruleName] = (tokens, index, options, env, self) => {
                    const html = renderHtml
                        ? renderHtml(tokens, index, options, env, self)
                        : tokens[index].content
                    const deferredHtml = addDeferredImageAttributes(html)
                    if (/<picture\b/i.test(deferredHtml)) return deferredHtml
                    return deferredHtml.replace(/<img\b[^>]*>/gi, (imageTag) => {
                        const sourceMatch = imageTag.match(/\ssrc\s*=\s*(["'])(.*?)\1/i)
                        return wrapWithOptimizedSource(imageTag, sourceMatch?.[2] ?? null)
                    })
                }
            }
        }
    },
    appearance: 'dark',
    head: [
        ['meta', { name: 'theme-color', content: '#00FFEE' }],
        ['link', { rel: 'alternate', type: 'application/rss+xml', title: '聖小熊的秘密基地', href: 'https://holybear.tw/rss.xml' }],
        ['script', {}, `(() => {
            const root = document.documentElement;
            const savedAppearance = localStorage.getItem('vitepress-theme-appearance');
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const shouldUseDark = savedAppearance === 'light'
                ? false
                : savedAppearance === 'auto'
                    ? prefersDark
                    : true;
            root.classList.toggle('dark', shouldUseDark);
        })()`],
        // Favicon 完整配置 - 使用透明 PNG/ICO，降低 Google 抓到不透明備案的機率
        ['link', { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/favicon.png?v=20260816-face-cutout' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/favicon-192.png?v=20260816-face-cutout' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96.png?v=20260816-face-cutout' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48.png?v=20260816-face-cutout' }],
        ['link', { rel: 'shortcut icon', href: '/favicon.ico?v=20260816-face-cutout' }],
        ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/favicon.png?v=20260816-face-cutout' }],

        ['meta', { name: 'msapplication-TileColor', content: '#00FFEE' }],
        ['meta', { name: 'msapplication-TileImage', content: '/favicon.png?v=20260816-face-cutout' }],
        ['meta', { name: 'description', content: '聖小熊的個人網站，展示 HyperOS 模組作品與楓之谷戰力分析工具，分享技術筆記、開發心得與開源創作。' }],
        ['meta', { name: 'keywords', content: '聖小熊, HolyBear, HyperOS, 模組, Mod, MIUI, Android, GitHub, 技術部落格, Blog' }],
        
        // 靜態 OG 標籤 - 做為備用，動態邏輯會覆蓋它
        ['meta', { property: 'og:site_name', content: '聖小熊的秘密基地' }],
        
        // Twitter Card
        ['meta', { name: 'twitter:card', content: 'summary' }],
        ['meta', { name: 'twitter:image', content: '/logo.png' }],
        
        // Nexon Analytics
        ['script', { type: 'text/javascript', src: 'https://openapi.nexon.com/js/analytics.js?app_id=245469', async: '' }]
    ],
    vite: {
        define: {
            __GIT_COMMIT_HASH__: JSON.stringify(gitCommitHash),
            __GIT_COMMIT_DATE__: JSON.stringify(gitCommitDate),
        },
        // Vite 8 can transform React JSX/TSX through OXC directly. The embedded
        // MapleStory app intentionally remounts through its Vue wrapper, so a
        // site-wide React Refresh preamble is unnecessary and conflicts with
        // system-level content-script shims such as AdGuard's localhost filter.
        oxc: {
            jsx: {
                runtime: 'automatic',
                importSource: 'react',
                refresh: false,
            },
        },
        server: {
            host: true,
            hmr: {
                // 如果只針對 Vite 中的 React 禁用 HMR (這樣 @vitejs/plugin-react 就不會載入 refresh-runtime)
                // 這不會影響 Vue 的 HMR
                overlay: false
            },
            fs: {
                // 嚴格限制可訪問的目錄
                allow: ['.'],
                // 明確拒絕訪問敏感目錄
                deny: ['.env', '.env.*', '*.{pem,crt,key}', 'node_modules/**']
            },
            // 增加 CORS 限制
            cors: true,
        },
        plugins: [
            gitMetaPlugin(),
        ],
        // 只過濾已知且無影響的第三方套件警告，其餘 Vite 警告仍正常顯示。
        customLogger: viteLogger,
        resolve: {
            alias: [
                {
                    // VitePress/theme-default-plus still resolves this internal module at compile time.
                    // Keeping the path alias does not enable the removed Algolia search provider.
                    find: /^.*\/VPAlgoliaSearchBox\.vue$/,
                    replacement: fileURLToPath(new URL('../node_modules/vitepress/dist/client/theme-default/components/VPAlgoliaSearchBox.vue', import.meta.url))
                },
                {
                    find: /^.*\/VPNavScreenTranslations\.vue$/,
                    replacement: fileURLToPath(new URL('./theme/MobileNavScreenTranslations.vue', import.meta.url))
                },
                {
                    find: '@maplecombat',
                    replacement: fileURLToPath(new URL('./theme/maplestory/maplecombat-full', import.meta.url))
                },
                { find: 'react', replacement: fileURLToPath(new URL('../node_modules/react', import.meta.url)) },
                { find: 'react-dom', replacement: fileURLToPath(new URL('../node_modules/react-dom', import.meta.url)) },
            ],
            dedupe: ['react', 'react-dom'],
        },
        optimizeDeps: {
            include: [
                'react', 
                'react-dom', 
                'react-dom/client',
                'lucide-react',
                'lucide-vue-next',
                'markdown-it',
                'medium-zoom',
                'opencc-js',
                'recharts',
                'border-beam',
                '@google/generative-ai',
                'animejs',
                'firebase/app',
                'firebase/firestore',
                'swiper/modules',
                'swiper/vue',
                'three',
                'three/examples/jsm/misc/GPUComputationRenderer.js',
                'timeago.js'
            ],
        },
    },   
    // ✨ START: 整合所有 OG 標籤的最終邏輯 (SEO 修正版) ✨
    transformHead({ pageData, head }) {
            const { frontmatter, relativePath } = pageData;

            // 即使是首頁也要處理
            if (relativePath == null) return head;

            // --- 常數與路徑正規化 ---
            const siteUrl = 'https://holybear.tw'; // 修正：移除結尾斜槓，保持一致性
            const normalizedPath = ('/' + String(relativePath).replace(/\\/g, '/'))
                .replace(/\.md$/, '')
                .replace(/\/index$/, '/')
                .replace(/\.html$/, '');
            
            // 確保網址組合時不會出現雙斜槓 //
            const pageUrl = normalizedPath === '/' ? siteUrl + '/' : siteUrl + normalizedPath;

            // --- 1. 取得預設值 ---
            const defaultTitle = head.find(tag => tag[1]?.property === 'og:title')?.[1].content || '';
            const defaultDesc = head.find(tag => tag[1]?.name === 'description')?.[1].content || '';
            // 修正：預設圖片使用網站 Logo (logo.png)
            const defaultImage = head.find(tag => tag[1]?.property === 'og:image')?.[1].content || 'https://holybear.tw/logo.png';

            const pageTitle = frontmatter.title || defaultTitle;
            const pageDescription = frontmatter.description || defaultDesc;
            const imageWidth = Number(frontmatter.imageWidth);
            const imageHeight = Number(frontmatter.imageHeight);
            const twitterCard = frontmatter.twitterCard || 'summary';
            
            // 圖片路徑處理
            let pageImage = defaultImage;
            if (frontmatter.image) {
                if (frontmatter.image.startsWith('http')) {
                    pageImage = frontmatter.image;
                } else {
                    // 確保圖片路徑正確拼接
                    pageImage = `${siteUrl}${frontmatter.image.startsWith('/') ? '' : '/'}${frontmatter.image}`;
                }
            }

            // --- 2. 決定頁面類型 ---
            // 修正：將英文首頁也視為首頁，以防止 Google 誤判
            const isHomePage = normalizedPath === '/' || normalizedPath === '' || normalizedPath === '/en/';
            const isBlogIndex = normalizedPath === '/blog/' || normalizedPath === '/en/blog/';
            const isArticle = !isBlogIndex && (normalizedPath.startsWith('/blog/') || normalizedPath.startsWith('/en/blog/'));
            const pageType = isArticle ? 'article' : 'website';

            // --- 3. 移除 head 中舊的 OG / canonical / JSON-LD，確保乾淨 ---
            const cleanHead = head.filter(tag =>
                !(tag[0] === 'link' && tag[1]?.rel === 'canonical') &&
                !(tag[1]?.property?.startsWith('og:')) &&
                !(tag[1]?.type === 'application/ld+json') && // 移除所有舊的 JSON-LD
                !(tag[1]?.name === 'x-page-image') &&
                !(tag[1]?.name === 'twitter:image') &&
                !(tag[1]?.name === 'twitter:card') // 確保移除舊的 card 設定
            );

            // --- 4. 加入正確的 canonical 與 OG 標籤 ---
            cleanHead.push(['link', { rel: 'canonical', href: pageUrl }]);
            cleanHead.push(['meta', { property: 'og:title', content: pageTitle }]);
            cleanHead.push(['meta', { property: 'og:description', content: pageDescription }]);
            cleanHead.push(['meta', { property: 'og:image', content: pageImage }]);
            if (Number.isFinite(imageWidth) && imageWidth > 0) {
                cleanHead.push(['meta', { property: 'og:image:width', content: String(imageWidth) }]);
            }
            if (Number.isFinite(imageHeight) && imageHeight > 0) {
                cleanHead.push(['meta', { property: 'og:image:height', content: String(imageHeight) }]);
            }
            cleanHead.push(['meta', { property: 'og:type', content: pageType }]);
            cleanHead.push(['meta', { property: 'og:url', content: pageUrl }]);
            
            // 強制設定為 summary (小圖模式)，若是 summary_large_image 則會變大圖
            cleanHead.push(['meta', { name: 'twitter:card', content: twitterCard }]);

            // 【關鍵修正】強制統一 Site Name，不論語系
            const globalSiteName = '聖小熊的秘密基地';
            const siteLogo = `${siteUrl}/favicon.png`;
            cleanHead.push(['meta', { property: 'og:site_name', content: globalSiteName }]);
            
            cleanHead.push(['meta', { name: 'twitter:image', content: pageImage }]);
            cleanHead.push(['meta', { name: 'x-page-image', content: pageImage }]);

            // --- 5. 根據頁面類型添加正確的 JSON-LD 結構化資料 ---
            if (isArticle) {
                // 檢測當前語言
                const isEnglish = relativePath.startsWith('en/') || (frontmatter.lang && frontmatter.lang.startsWith('en'));

                // 載入作者資料
                let authorInfo = {
                     "@type": "Person",
                     "name": "聖小熊",
                     "url": siteUrl
                };
                
                try {
                    const authorsData = require('./authorsData.js').default;
                    const authorLogin = Object.keys(authorsData).find(login => {
                        const author = authorsData[login];
                        const authorIdentifier = frontmatter.author || '聖小熊';
                        return authorIdentifier === login ||
                            authorIdentifier === author.name ||
                            authorIdentifier === author.name_en ||
                            authorIdentifier === author.displayName;
                    });
                    if (authorLogin && authorsData[authorLogin]) {
                        const author = authorsData[authorLogin];
                         authorInfo = {
                            "@type": "Person",
                            "name": isEnglish && author.name_en ? author.name_en : author.name,
                            "url": author.url
                        };
                    }
                } catch (e) {
                    console.warn('Authors data not found, using default.');
                }

                // 文章頁面 Schema
                const articleSchema: any = {
                    "@context": "https://schema.org",
                    "@type": "Article",
                    "headline": pageTitle,
                    "description": pageDescription,
                    "image": pageImage,
                    "url": pageUrl,
                    "author": authorInfo,
                    "publisher": {
                        "@type": "Organization",
                        "name": globalSiteName, // 強制使用統一名稱
                        "url": siteUrl,
                        "logo": {
                            "@type": "ImageObject",
                            "url": siteLogo,
                            "width": 512,
                            "height": 512
                        }
                    }
                };

                if (frontmatter.date) {
                    articleSchema.datePublished = frontmatter.date;
                }

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(articleSchema)]);
            
            } else if (isBlogIndex) {
                const blogSchema = {
                    "@context": "https://schema.org",
                    "@type": "Blog",
                    "name": pageTitle,
                    "url": pageUrl,
                    "description": pageDescription,
                    "isPartOf": {
                        "@type": "WebSite",
                        "name": globalSiteName,
                        "url": siteUrl
                    }
                };

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(blogSchema)]);
            } else if (isHomePage) {
                // 【關鍵修正】首頁 Schema 極簡化，移除語系判斷與多餘作者資訊
                // 給 Google 最強烈的單一信號
                const websiteSchema = {
                    "@context": "https://schema.org",
                    "@type": "WebSite",
                    "name": globalSiteName, // 聖小熊的秘密基地
                    "url": siteUrl,
                    "logo": {
                        "@type": "ImageObject",
                        "url": siteLogo,
                        "width": 512,
                        "height": 512
                    },
                    "description": "聖小熊的個人網站，展示 HyperOS 模組作品與楓之谷戰力分析工具，分享技術筆記、開發心得與開源創作。",
                    "publisher": {
                         "@type": "Person",
                         "name": "聖小熊",
                         "url": siteUrl,
                         "image": siteLogo
                    }
                };

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(websiteSchema)]);
            } else {
                // 一般頁面 Schema
                const webpageSchema = {
                    "@context": "https://schema.org",
                    "@type": "WebPage",
                    "name": pageTitle,
                    "url": pageUrl,
                    "description": pageDescription,
                    "isPartOf": {
                        "@type": "WebSite",
                        "name": globalSiteName, // 強制統一
                        "url": siteUrl
                    }
                };

                cleanHead.push(['script', { type: 'application/ld+json' }, JSON.stringify(webpageSchema)]);
            }

            cleanHead.push(['link', {
                rel: 'preload',
                href: '/holybear.png',
                as: 'image',
                type: 'image/png'
            }]);

            return cleanHead;
    },
    // ✨ END: SEO 修正完成 ✨

        themeConfig: {
        logo: '/favicon.png?v=20260816-face-cutout',
        contributors: false,
        outline: {
            level: [2, 3], // 默認顯示 H2 和 H3 標題
        },
        sidebar: {
            '/docs/Telegram-Rose-Bot.md': TelegramRoseBotDocsSidebar,
            '/docs/Vitepress-Blog.md': VitepressBlogDocsSidebar,
            '/docs/spoiler-component.md': SpoilerComponentDocsSidebar
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/HolyBearTW' },
            { icon: 'telegram', link: 'https://t.me/HolyBearTW' }
        ],
    },

    transformPageData(pageData) {
        // 1. 處理 docs/ 底下的文章排版
        if (pageData.relativePath?.startsWith('docs/')) {
            pageData.frontmatter = pageData.frontmatter || {};
            pageData.frontmatter.pageClass = 'custom-footer-layout';
        }

        // 2. Blog 首頁是 Fuwari PoC 的全寬 page layout；文章頁維持原本文件側欄。
        if (pageData.relativePath === 'blog/index.md' || pageData.relativePath === 'en/blog/index.md') {
            pageData.frontmatter = pageData.frontmatter || {};
            pageData.frontmatter.aside = false;
            pageData.frontmatter.sidebar = false;
        } else if (pageData.relativePath?.startsWith('blog/') || pageData.relativePath?.startsWith('en/blog/')) {
            pageData.frontmatter = pageData.frontmatter || {};
            pageData.frontmatter.layout = 'fuwari-post';
            pageData.frontmatter.aside = true;
            pageData.frontmatter.sidebar = false;
        }

        return pageData;
    },

    transformHtml: (code, id, { pageData }) => {
        // 1. 處理 canonicalUrl
        if (id.endsWith('.html')) {
            const canonicalUrl = pageData?.frontmatter?.canonicalUrl || '';
            if (canonicalUrl) {
                pageData.frontmatter.canonicalUrl = canonicalUrl.replace(/\.html$/, '');
            }
        }
        
        // 2. 清理 HTML body class
        // 避免構建環境或快取導致 theme-christmas 等主題 class 被寫入靜態檔案
        if (id.endsWith('.html')) {
            return code.replace(/(<body[^>]*class=")([^"]*)(")/, (match, prefix, classList, suffix) => {
                // 過濾掉所有 theme- 開頭的 class
                const newClassList = classList.split(' ')
                    .filter(c => !c.startsWith('theme-'))
                    .join(' ');
                return `${prefix}${newClassList}${suffix}`;
            });
        }
    },
})

export default config
