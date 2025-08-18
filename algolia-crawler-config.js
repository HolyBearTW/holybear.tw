new Crawler({
  appId: "DO73KQBN99",
  apiKey: "366bffc838e72b5deeaa53539a41ec13",
  maxUrls: null,
  indexPrefix: "",
  rateLimit: 8,
  renderJavaScript: true,
  startUrls: ["https://holybear.tw"],
  discoveryPatterns: ["https://holybear.tw/**"],
  schedule: "at 09:18 on Sunday",
  maxDepth: 10,
  sitemaps: ["https://holybear.tw/sitemap.xml"],
  
  // 🔥 修正後的排除模式 - 避免 .html 重複和不需要的頁面
  exclusionPatterns: [
    "https://holybear.tw/$",                        // 🔥 排除首頁
    "https://holybear.tw/blog$",                    // 🔥 排除部落格首頁
    "https://holybear.tw/en/blog$",                 // 🔥 排除英文部落格首頁
    "https://holybear.tw/blog/",                    // 🔥 排除部落格首頁 (斜線版本)
    "https://holybear.tw/en/blog/",                 // 🔥 排除英文部落格首頁 (斜線版本)
    "https://holybear.tw/blog/index",               // 🔥 排除部落格索引頁
    "https://holybear.tw/en/blog/index",            // 🔥 排除英文部落格索引頁
    "https://holybear.tw/blog.html",                // 排除 .html 版本
    "https://holybear.tw/en/blog.html",             // 排除英文 .html 版本
    "https://holybear.tw/blog/index.html",          // 排除索引頁面 .html
    "https://holybear.tw/en/blog/index.html",       // 排除英文索引頁面 .html
    "https://holybear.tw/**/*.html",                // 🔥 排除所有 .html 檔案
    "https://holybear.tw/**/index.html",            // 🔥 排除所有 index.html
    "https://holybear.tw/*/",                       // 🔥 排除以斜線結尾的 URL
    "https://holybear.tw/sitemap.xml",              // 🔥 排除 sitemap.xml
    "https://holybear.tw/*.xml",                    // 🔥 排除所有 XML 檔案
    "https://holybear.tw/*.txt",                    // 🔥 排除 robots.txt 等
  ],
  
  actions: [
    {
      indexName: "holybear.tw",
      pathsToMatch: ["https://holybear.tw/**"],
      recordExtractor: ({ $, helpers, url }) => {
        
        // 🔥 URL 正規化函數 - 確保搜尋結果有完整 URL
        const normalizeUrl = (urlStr) => {
          if (!urlStr) return '';
          
          let normalizedPath = urlStr;
          
          // 如果是完整 URL，提取路徑部分
          if (normalizedPath.startsWith('https://holybear.tw')) {
            normalizedPath = normalizedPath.replace('https://holybear.tw', '');
          }
          
          // 確保以 / 開頭
          if (!normalizedPath.startsWith('/')) {
            normalizedPath = '/' + normalizedPath;
          }
          
          // 清理路徑
          normalizedPath = normalizedPath
            .replace(/\.html$/, '')        // 移除 .html 後綴
            .replace(/\/index$/, '')       // 移除 /index
            .replace(/\/$/, '') || '/';    // 移除尾隨斜線，但保留根路徑
          
          // 返回完整 URL 供搜尋結果使用
          return `https://holybear.tw${normalizedPath}`;
        };

        // 正規化當前 URL - 確保返回完整 URL
        const normalizedUrl = normalizeUrl(url.href);
        
        // 🔥 額外的頁面過濾邏輯 - 確保不索引特定頁面
        const excludeUrls = [
          'https://holybear.tw',
          'https://holybear.tw/',
          'https://holybear.tw/blog',
          'https://holybear.tw/blog/',
          'https://holybear.tw/blog/index',
          'https://holybear.tw/en/blog',
          'https://holybear.tw/en/blog/',
          'https://holybear.tw/en/blog/index',
          'https://holybear.tw/sitemap.xml'
        ];
        
        if (excludeUrls.includes(url.href) || excludeUrls.includes(normalizedUrl)) {
          console.log(`[過濾] 頁面 ${url.href} 為排除的首頁/索引頁，已跳過索引。`);
          return [];
        }
        
        // *** 修正「Blog Not Supported in English」過濾邏輯的關鍵部分 ***
        // 優先從 .vp-doc 抓取內容，如果沒有再嘗試從 main 抓
        const mainContent = $(".vp-doc").text() || $("main").text();
        const exclusionText = "Blog Not Supported in English";

        // 如果內容包含指定文字，就跳過索引
        if (mainContent.includes(exclusionText)) {
          console.log(`[過濾] 頁面 ${url.href} 包含過濾字串，已跳過索引。`);
          return [];
        }

        // 提取頁面特定資訊
        const pageCategory = $(".category").first().text().trim();
        const pageTags = $(".tag")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((t) => t);
        const postTitle = $(".blog-post-title").text().trim() || $("h1").first().text().trim();
        const postDate = $(".blog-post-date-in-content").text().trim();
        const pageDescription = (
          $('meta[name="description"]').attr("content") || ""
        ).trim();

        // 🔥 使用 DocSearch helper 提取核心紀錄
        const records = helpers.docsearch({
          recordProps: {
            lvl0: { selectors: "", defaultValue: "文章" },
            lvl1: [".vp-doc h1", ".content h1", "h1"],
            lvl2: [".vp-doc h2", ".content h2", "h2"],
            lvl3: [".vp-doc h3", ".content h3", "h3"],
            lvl4: [".vp-doc h4", ".content h4", "h4"],
            lvl5: [".vp-doc h5", ".content h5", "h5"],
            content: [
              ".vp-doc p", 
              ".vp-doc li", 
              ".content p", 
              ".content li",
              ".vp-doc div",
              ".content div"
            ],
            // 🔥 加入 category 和 tag 支援
            category: { selector: ".category", global: true },
            tag: { selector: ".tag", global: true },
            tags: { selector: ".tag", global: true },
          },
          indexHeadings: true,
          aggregateContent: true,
          recordVersion: "v3",
        });

        // 🔥 後處理每個紀錄，確保屬性完整和 URL 正規化
        return records.map((record) => {
          const newRecord = { ...record };

          // 🔥 URL 正規化 - 確保所有 URL 都是完整的絕對 URL
          newRecord.url = normalizeUrl(newRecord.url || url.href);
          newRecord.url_without_anchor = normalizeUrl(
            newRecord.url_without_anchor || url.href
          );

          // 確保 category 和 tag 資訊
          if (!newRecord.category || newRecord.category.length === 0) {
            newRecord.category = pageCategory ? [pageCategory] : [];
          }
          if (!newRecord.tag || newRecord.tag.length === 0) {
            newRecord.tag = pageTags.filter((tag) => tag.length > 0);
          }
          newRecord.tags = newRecord.tag; // 確保 tags 與 tag 同步

          // 添加額外屬性
          if (postTitle) newRecord.post_title = postTitle;
          if (postDate) newRecord.post_date = postDate;
          if (mainContent) newRecord.main_content = mainContent.trim().substring(0, 500);
          if (pageDescription) newRecord.description = pageDescription;

          // 🔥 確保 content 不為空
          if (!newRecord.content || newRecord.content.trim() === '') {
            if (pageDescription) {
              newRecord.content = pageDescription;
            } else if (mainContent) {
              newRecord.content = mainContent.trim().substring(0, 200);
            } else {
              newRecord.content = postTitle || "無內容";
            }
          }

          // 🔥 添加語言標識
          if (url.href.includes('/en/')) {
            newRecord.lang = 'en';
            newRecord.language = 'English';
          } else {
            newRecord.lang = 'zh-TW';
            newRecord.language = '繁體中文';
          }

          // 🔥 添加頁面類型
          if (url.href.includes('/blog/')) {
            newRecord.type = 'blog';
          } else if (url.href.includes('/Mod')) {
            newRecord.type = 'mod';
          } else {
            newRecord.type = 'page';
          }

          return newRecord;
        });
      },
    },
  ],

  // 🔥 修正後的索引設定
  initialIndexSettings: {
    "holybear.tw": {  // 🔥 修正：使用正確的索引名稱
      // 🔥 設定可篩選的屬性
      attributesForFaceting: [
        "type", 
        "lang", 
        "language",
        "category", 
        "tag", 
        "tags"
      ],
      
      // 🔥 搜尋優先順序設定
      searchableAttributes: [
        "unordered(post_title)",           // 文章標題 (最高優先級)
        "unordered(hierarchy.lvl1)",       // H1 標題
        "unordered(hierarchy.lvl2)",       // H2 標題
        "description",                     // 頁面描述
        "content",                        // 內容
        "main_content",                   // 主要內容
        "unordered(hierarchy.lvl3)",       // H3 標題
        "unordered(hierarchy.lvl4)",       // H4-H6 標題
        "unordered(hierarchy.lvl5)",
        "unordered(hierarchy.lvl6)",
        "category",                       // 分類
        "tag",                           // 標籤
        "tags",                          // 標籤 (複數)
        "post_date",                     // 發布日期
      ],
      
      // 🔥 回傳的屬性
      attributesToRetrieve: [
        "hierarchy",
        "content", 
        "anchor",
        "url",
        "url_without_anchor",
        "type",
        "lang",
        "language",
        "category",
        "tag", 
        "tags",
        "post_title",
        "post_date",
        "description",
        "main_content"
      ],
      
      // 🔥 高亮顯示的屬性
      attributesToHighlight: [
        "hierarchy",
        "content",
        "post_title", 
        "description",
        "main_content",
        "category",
        "tag",
        "tags"
      ],
      
      // 🔥 摘要顯示的屬性
      attributesToSnippet: [
        "content:30", 
        "main_content:30", 
        "description:30"
      ],
      
      // 🔥 駝峰命名的屬性
      camelCaseAttributes: [
        "hierarchy", 
        "content"
      ],
      
      // 🔥 去重設定 - 根據 URL 去重
      distinct: true,
      attributeForDistinct: "url",
      
      // 🔥 自定義排名 - 優先顯示較短、較相關的 URL
      customRanking: [
        "asc(url)",                    // URL 較短的優先 (避免 .html 重複)
        "desc(weight.pageRank)",       // 頁面權重
        "desc(weight.level)",          // 標題層級
        "asc(weight.position)",        // 位置順序
      ],
      
      // 🔥 排名演算法
      ranking: [
        "words",
        "filters", 
        "typo",
        "attribute",
        "proximity",
        "exact",
        "custom",
      ],
      
      // 🔥 高亮標籤
      highlightPreTag: '<span class="algolia-docsearch-suggestion--highlight">',
      highlightPostTag: "</span>",
      
      // 🔥 錯字容忍設定
      minWordSizefor1Typo: 3,
      minWordSizefor2Typos: 7,
      allowTyposOnNumericTokens: false,
      
      // 🔥 搜尋優化設定
      minProximity: 1,
      ignorePlurals: true,
      advancedSyntax: true,
      attributeCriteriaComputedByMinProximity: true,
      removeWordsIfNoResults: "allOptional",
    },
  },
  
  ignoreCanonicalTo: false,
  safetyChecks: { 
    beforeIndexPublishing: { 
      maxLostRecordsPercentage: 90 
    } 
  },
});
