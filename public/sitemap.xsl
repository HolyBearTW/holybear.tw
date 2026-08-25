<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  exclude-result-prefixes="sitemap">
  <xsl:output method="html" encoding="UTF-8" />

  <xsl:template match="/">
    <html lang="zh-TW">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>網站地圖｜聖小熊的秘密基地</title>
        <style>
          :root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #f6f8fa; color: #24292f; }
          main { width: min(1080px, calc(100% - 32px)); margin: 48px auto; }
          header { margin-bottom: 24px; }
          h1 { margin: 0 0 8px; font-size: clamp(28px, 5vw, 40px); }
          p { margin: 0; color: #57606a; }
          .back { display: inline-block; margin-bottom: 20px; color: #0969da; text-decoration: none; }
          .back:hover { text-decoration: underline; }
          .table-wrap { overflow-x: auto; border: 1px solid #d0d7de; border-radius: 12px; background: #fff; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 13px 16px; text-align: left; border-bottom: 1px solid #d8dee4; }
          th { background: #f6f8fa; color: #57606a; font-size: 13px; }
          tr:last-child td { border-bottom: 0; }
          td:first-child { word-break: break-all; }
          td:last-child { width: 190px; white-space: nowrap; color: #57606a; }
          td a { color: #0969da; text-decoration: none; }
          td a:hover { text-decoration: underline; }
          @media (prefers-color-scheme: dark) {
            body { background: #0d1117; color: #f0f6fc; }
            p, td:last-child, th { color: #8b949e; }
            .table-wrap { border-color: #30363d; background: #161b22; }
            th { background: #21262d; }
            th, td { border-color: #30363d; }
            .back, td a { color: #58a6ff; }
          }
          @media (max-width: 600px) {
            main { margin: 28px auto; }
            th, td { padding: 11px 12px; }
            td:last-child, th:last-child { display: none; }
          }
        </style>
      </head>
      <body>
        <main>
          <a class="back" href="/">← 返回首頁</a>
          <header>
            <h1>網站地圖</h1>
            <p>目前收錄 <xsl:value-of select="count(sitemap:urlset/sitemap:url)" /> 個公開頁面，供搜尋引擎與訪客查找內容。</p>
          </header>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>頁面網址</th><th>最後更新</th></tr>
              </thead>
              <tbody>
                <xsl:for-each select="sitemap:urlset/sitemap:url">
                  <xsl:sort select="sitemap:loc" />
                  <tr>
                    <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc" /></a></td>
                    <td>
                      <xsl:choose>
                        <xsl:when test="sitemap:lastmod"><xsl:value-of select="substring(sitemap:lastmod, 1, 10)" /></xsl:when>
                        <xsl:otherwise>—</xsl:otherwise>
                      </xsl:choose>
                    </td>
                  </tr>
                </xsl:for-each>
              </tbody>
            </table>
          </div>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
