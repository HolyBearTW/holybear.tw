// Cloudflare Worker 程式碼
// 解決 VitePress SPA 路由與子域名的問題 - 直接代理策略

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
            pathname.startsWith('/vp-icons.css') ||
            pathname.startsWith('/fonts/') ||
            pathname.startsWith('/image/') ||
            pathname.startsWith('/music/') ||
            pathname.startsWith('/video/') ||
            pathname === '/favicon.ico' ||
            pathname === '/logo.png' ||
            pathname === '/blog_no_image.svg' ||
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
            pathname.endsWith('.mp4')
        ) {
            // 靜態資源直接從主域名根路徑取得
            targetUrl = `https://holybear.tw${pathname}${search}`;
        } else if (pathname === '/' || pathname === '') {
            // 對於部落格根路徑，直接指向部落格的 index 頁面
            targetUrl = `https://holybear.tw/blog/${search}`;
        } else {
            // 其他 HTML 頁面和路由從 /blog 路徑取得
            targetUrl = `https://holybear.tw/blog${pathname}${search}`;
        }
        
        // 創建新請求
        const newRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body
        });
        
        // 獲取並直接返回回應，不修改內容
        const response = await fetch(newRequest);
        
        // 設定正確的 CORS 標頭
        const newResponse = new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
        });
        
        // 添加 CORS 標頭以支援跨域資源
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
        
        return newResponse;
    }
    
    // 對於非 blog.holybear.tw 的請求，直接轉發
    return fetch(request);
}
