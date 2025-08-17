// Cloudflare Worker 程式碼 - 改進版
// 解決 VitePress SPA 路由與子域名的問題

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    
    // 只處理 blog.holybear.tw 的請求
    if (url.hostname === 'blog.holybear.tw') {
        const pathname = url.pathname;
        const search = url.search;
        
        let targetUrl;
        
        // 判斷請求類型並決定目標 URL
        if (
            // 靜態資源直接指向主域名根路徑
            pathname.startsWith('/assets/') ||
            pathname === '/vp-icons.css' ||
            pathname.startsWith('/fonts/') ||
            pathname.startsWith('/image/') ||
            pathname.startsWith('/music/') ||
            pathname.startsWith('/video/') ||
            pathname === '/favicon.ico' ||
            pathname === '/logo.png' ||
            pathname === '/blog_no_image.svg' ||
            pathname === '/icon_fire-outline.svg' ||
            pathname.startsWith('/MapleStory_cursor') ||
            pathname === '/hashmap.json' ||
            pathname === '/sitemap.xml' ||
            pathname.endsWith('.css') ||
            pathname.endsWith('.js') ||
            pathname.endsWith('.woff') ||
            pathname.endsWith('.woff2') ||
            pathname.endsWith('.png') ||
            pathname.endsWith('.jpg') ||
            pathname.endsWith('.jpeg') ||
            pathname.endsWith('.gif') ||
            pathname.endsWith('.svg') ||
            pathname.endsWith('.mp3') ||
            pathname.endsWith('.mp4') ||
            pathname.endsWith('.xml')
        ) {
            // 靜態資源直接從主域名根路徑取得
            targetUrl = `https://holybear.tw${pathname}${search}`;
        } else if (pathname === '/' || pathname === '') {
            // 對於部落格根路徑，指向部落格的 index.html
            targetUrl = `https://holybear.tw/blog/index.html${search}`;
        } else if (pathname.match(/^\/\d{4}-\d{2}-\d{2}/)) {
            // 部落格文章路徑 (例如 /2025-05-25, /2024-12-31, /2026-01-01)
            targetUrl = `https://holybear.tw/blog${pathname}.html${search}`;
        } else if (pathname === '/index' || pathname === '/index.html') {
            // 明確的 index 請求
            targetUrl = `https://holybear.tw/blog/index.html${search}`;
        } else {
            // 其他路徑，嘗試加上 .html 後綴
            const cleanPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
            // 如果路徑已經有 .html，就不要重複加
            if (cleanPath.endsWith('.html')) {
                targetUrl = `https://holybear.tw/blog${cleanPath}${search}`;
            } else {
                targetUrl = `https://holybear.tw/blog${cleanPath}.html${search}`;
            }
        }
        
        console.log(`Blog subdomain request: ${pathname} -> ${targetUrl}`);
        
        // 創建新請求
        const newRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body
        });
        
        try {
            // 獲取回應
            const response = await fetch(newRequest);
            
            // 如果第一次請求失敗且不是靜態資源，嘗試使用 blog 首頁作為 fallback
            if (!response.ok && !targetUrl.includes('assets') && !pathname.includes('.')) {
                console.log(`First attempt failed: ${targetUrl}, using blog index as fallback`);
                const fallbackRequest = new Request(`https://holybear.tw/blog/index.html${search}`, {
                    method: request.method,
                    headers: request.headers,
                    body: request.body
                });
                const fallbackResponse = await fetch(fallbackRequest);
                
                if (fallbackResponse.ok && fallbackResponse.headers.get('content-type')?.includes('text/html')) {
                    let html = await fallbackResponse.text();
                    html = processHtml(html);
                    
                    return new Response(html, {
                        status: 200, // 回傳 200 而不是 404
                        statusText: 'OK',
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8',
                            'Access-Control-Allow-Origin': '*',
                            'Cache-Control': 'public, max-age=300'
                        }
                    });
                }
            }
            
            // 如果是 HTML 內容，修正內部連結
            if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
                let html = await response.text();
                html = processHtml(html);
                
                return new Response(html, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Access-Control-Allow-Origin': '*',
                        'Cache-Control': response.headers.get('Cache-Control') || 'public, max-age=300'
                    }
                });
            }
            
            // 其他類型的回應，直接返回並添加 CORS 標頭
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: {
                    ...Object.fromEntries(response.headers),
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
            
        } catch (error) {
            console.error('Request failed:', error);
            return new Response('Internal Server Error', { status: 500 });
        }
    }
    
    // 對於非 blog.holybear.tw 的請求，直接轉發
    return fetch(request);
}

// HTML 處理函數
function processHtml(html) {
    // 修正部落格內部連結，移除多餘的 /blog 前綴
    html = html.replace(/href="\/blog\//g, 'href="/');
    html = html.replace(/href="\/blog"/g, 'href="/');
    
    // 修正部落格文章連結，加上 .html 後綴 (支援所有年份)
    html = html.replace(/href="\/(\d{4}-\d{2}-\d{2}[^"]*)"(?!\.html)/g, 'href="/$1.html"');
    
    // 修正回到主站的連結 - 更精確的正則表達式
    // 只有當 href="/" 後面不是數字或字母時才替換（避免影響文章連結）
    html = html.replace(/href="\/"(?![a-zA-Z0-9])/g, 'href="https://holybear.tw/"');
    
    // 修正資源路徑，確保指向正確的主域名
    html = html.replace(/src="\/assets\//g, 'src="https://holybear.tw/assets/');
    html = html.replace(/href="\/assets\//g, 'href="https://holybear.tw/assets/');
    html = html.replace(/src="\/vp-icons\.css"/g, 'src="https://holybear.tw/vp-icons.css"');
    
    // 修正其他可能的靜態資源路徑
    html = html.replace(/src="\/favicon\.ico"/g, 'src="https://holybear.tw/favicon.ico"');
    html = html.replace(/href="\/favicon\.ico"/g, 'href="https://holybear.tw/favicon.ico"');
    
    // 添加子域名標識和禁用 VitePress 客戶端路由的腳本
    html = html.replace(/<head([^>]*)>/i, `<head$1>
    <meta name="subdomain-mode" content="blog.holybear.tw">
    <script>
        // 完全禁用 VitePress 客戶端路由
        (function() {
            // 儘早執行，在 VitePress 初始化之前
            const disableVitePress = function() {
                // 刪除 VitePress 相關的全域變數
                if (window.__VP_HASH_MAP) delete window.__VP_HASH_MAP;
                if (window.__VP_SITE_DATA) delete window.__VP_SITE_DATA;
                
                // 覆蓋 history API
                const noop = function() { return; };
                history.pushState = noop;
                history.replaceState = noop;
                
                // 攔截所有連結點擊
                document.addEventListener('click', function(e) {
                    const link = e.target.closest('a');
                    if (link && link.href && !link.href.startsWith('http://') && !link.href.startsWith('https://')) {
                        e.preventDefault();
                        window.location.href = link.href;
                    }
                }, true);
                
                // 阻止 popstate 事件
                window.addEventListener('popstate', function(e) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    window.location.reload();
                }, true);
            };
            
            // 立即執行一次
            disableVitePress();
            
            // DOM 載入完成後再執行一次
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', disableVitePress);
            } else {
                disableVitePress();
            }
            
            // 確保在所有腳本載入後再執行一次
            window.addEventListener('load', disableVitePress);
        })();
    </script>`);
    
    return html;
}
