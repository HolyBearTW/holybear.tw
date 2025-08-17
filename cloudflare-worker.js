// Cloudflare Worker 程式碼
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
        
        // 建構目標 URL - 所有請求都指向主域名的 /blog 路徑
        const targetUrl = `https://holybear.tw/blog${pathname}${search}`;
        
        // 創建新請求
        const newRequest = new Request(targetUrl, {
            method: request.method,
            headers: request.headers,
            body: request.body
        });
        
        // 獲取回應
        const response = await fetch(newRequest);
        
        // 如果是 HTML 文件且回應成功，進行內容替換
        if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
            let html = await response.text();
            
            // 修正所有絕對路徑，使其指向正確的子域名
            html = html.replace(/href="\/(?!\/)/g, 'href="https://blog.holybear.tw/');
            html = html.replace(/src="\/(?!\/)/g, 'src="https://holybear.tw/');
            html = html.replace(/"\/assets\//g, '"https://holybear.tw/assets/');
            html = html.replace(/"\/vp-icons\.css"/g, '"https://holybear.tw/vp-icons.css"');
            
            // 修正部落格內部連結
            html = html.replace(/href="https:\/\/blog\.holybear\.tw\/blog\//g, 'href="https://blog.holybear.tw/');
            
            // 創建新回應
            return new Response(html, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers
            });
        }
        
        // 對於非 HTML 檔案或錯誤回應，直接返回
        return response;
    }
    
    // 對於非 blog.holybear.tw 的請求，直接轉發
    return fetch(request);
}
