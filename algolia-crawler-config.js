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
  
  // 🔥 增強的排除模式 - 避免重複索引和不需要的頁面
  exclusionPatterns: [
    "https://holybear.tw/$",                        // 排除首頁
    "https://holybear.tw/blog$",                    // 排除部落格首頁
    "https://holybear.tw/en/blog$",                 // 排除英文部落格首頁
    "https://holybear.tw/blog/",                    // 排除部落格首頁 (斜線版本)
    "https://holybear.tw/en/blog/",                 // 排除英文部落格首頁 (斜線版本)
    "https://holybear.tw/blog/index",               // 排除部落格索引頁
    "https://holybear.tw/en/blog/index",            // 排除英文部落格索引頁
    "https://holybear.tw/blog.html",                // 排除 .html 版本
    "https://holybear.tw/en/blog.html",             // 排除英文 .html 版本
    "https://holybear.tw/blog/index.html",          // 排除索引頁面 .html
    "https://holybear.tw/en/blog/index.html",       // 排除英文索引頁面 .html
    "https://holybear.tw/**/*.html",                // 排除所有 .html 檔案
    "https://holybear.tw/**/index.html",            // 排除所有 index.html
    "https://holybear.tw/sitemap.xml",              // 排除 sitemap.xml
    "https://holybear.tw/*.xml",                    // 排除所有 XML 檔案
    "https://holybear.tw/*.txt",                    // 排除 robots.txt 等
  ],
  
  actions: [
    {
      indexName: "holybear.tw",
      pathsToMatch: ["https://holybear.tw/**"],
      recordExtractor: ({ $, helpers, url }) => {
        
        // 🔥 簡潔的 URL 清理函數
        const cleanUrl = (urlStr) => {
          if (!urlStr) return urlStr;
          return urlStr
            .replace(/\.html$/, '')        // 移除 .html 後綴
            .replace(/\/index$/, '')       // 移除 /index
            .replace(/\/$/, '') || '/';    // 移除尾隨斜線，但保留根路徑
        };
        
        // *** 修正「Blog Not Supported in English」過濾邏輯的關鍵部分 ***
        // 優先從 .vp-doc 抓取內容，如果沒有再嘗試從 main 抓
        const mainContent = $(".vp-doc").text() || $("main").text();
        const exclusionText = "Blog Not Supported in English";

        // 如果內容包含指定文字，就跳過索引
        if (mainContent.includes(exclusionText)) {
          console.log(`[過濾] 頁面 ${url.href} 包含過濾字串，已跳過索引。`);
          return [];
        }

        // 提取頁面特定資訊 (從你提供的檔案中獲取)
        const pageCategory = $(".category").first().text().trim();
        const pageTags = $(".tag")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter((t) => t);
        const postTitle = $(".blog-post-title").text().trim();
        const postDate = $(".blog-post-date-in-content").text().trim();
        const pageDescription = (
          $('meta[name="description"]').attr("content") || ""
        ).trim();

        // 🔥 使用原始有效的 DocSearch helper 配置
        const records = helpers.docsearch({
          recordProps: {
            lvl1: [".vp-doc h1", ".content h1", "h1"],
            content: [".vp-doc p", ".vp-doc li", ".content p", ".content li"],
            lvl0: { selectors: "", defaultValue: "文章" },
            lvl2: [".vp-doc h2", ".content h2", "h2"],
            lvl3: [".vp-doc h3", ".content h3", "h3"],
            lvl4: [".vp-doc h4", ".content h4", "h4"],
            lvl5: [".vp-doc h5", ".content h5", "h5"],
            // 加入 category 和 tag 支援
            category: { selector: ".category", global: true },
            tag: { selector: ".tag", global: true },
            tags: { selector: ".tag", global: true },
          },
          indexHeadings: true,
          aggregateContent: true,
          recordVersion: "v3",
        });

        // 🔥 簡化的後處理邏輯 - 回到原始有效版本
        return records.map((record) => {
          const newRecord = { ...record };

          // 🔥 清理 URL 路徑
          if (newRecord.url) {
            newRecord.url = cleanUrl(newRecord.url);
          }
          if (newRecord.url_without_anchor) {
            newRecord.url_without_anchor = cleanUrl(newRecord.url_without_anchor);
          }

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
          if (mainContent) {
            // 🔥 過濾導航元素文字
            let cleanMainContent = mainContent.trim()
              .replace(/繁體中文\s*繁體中文\s*深色模式/g, '')
              .replace(/English\s*English\s*Dark\s*Mode/g, '')
              .replace(/繁體中文.*?深色模式/g, '')
              .replace(/English.*?Dark\s*Mode/g, '')
              .trim();
            newRecord.main_content = cleanMainContent;
          }
          if (pageDescription) newRecord.description = pageDescription;

          // 確保 content 不為 null 或嘗試從 description 填充
          if (!newRecord.content) {
            if (pageDescription) {
              newRecord.content = pageDescription;
            } else {
              // 後備方案，抓取 vp-doc 或 main 內容的前 200 字
              let fallbackContent = $(".vp-doc").text().trim() || $("main").text().trim() || "";
              
              // 🔥 過濾導航元素文字
              fallbackContent = fallbackContent
                .replace(/繁體中文\s*繁體中文\s*深色模式/g, '')
                .replace(/English\s*English\s*Dark\s*Mode/g, '')
                .replace(/繁體中文.*?深色模式/g, '')
                .replace(/English.*?Dark\s*Mode/g, '')
                .trim();
              
              newRecord.content = fallbackContent.substring(0, 200);
            }
          }

          return newRecord;
        });
      },
    },
  ],

  // 🔥 回到原始有效的索引設定
  initialIndexSettings: {
    "holybear.tw": {
      attributesForFaceting: ["type", "lang", "category", "tag", "tags"],
      searchableAttributes: [
        "unordered(post_title)",
        "post_date",
        "description",
        "main_content",
        "unordered(hierarchy_radio_camel.lvl0)",
        "unordered(hierarchy_radio.lvl0)",
        "unordered(hierarchy_radio_camel.lvl1)",
        "unordered(hierarchy_radio.lvl1)",
        "unordered(hierarchy_radio_camel.lvl2)",
        "unordered(hierarchy_radio.lvl2)",
        "unordered(hierarchy_radio_camel.lvl3)",
        "unordered(hierarchy.lvl3)",
        "unordered(hierarchy_radio_camel.lvl4)",
        "unordered(hierarchy_radio.lvl4)",
        "unordered(hierarchy_radio_camel.lvl5)",
        "unordered(hierarchy_radio.lvl5)",
        "unordered(hierarchy_radio_camel.lvl6)",
        "unordered(hierarchy_radio.lvl6)",
        "unordered(hierarchy_camel.lvl0)",
        "unordered(hierarchy.lvl0)",
        "unordered(hierarchy_camel.lvl1)",
        "unordered(hierarchy.lvl1)",
        "unordered(hierarchy_camel.lvl2)",
        "unordered(hierarchy.lvl2)",
        "unordered(hierarchy_camel.lvl3)",
        "unordered(hierarchy.lvl3)",
        "unordered(hierarchy_camel.lvl4)",
        "unordered(hierarchy.lvl4)",
        "unordered(hierarchy_camel.lvl5)",
        "unordered(hierarchy.lvl5)",
        "unordered(hierarchy_camel.lvl6)",
        "unordered(hierarchy.lvl6)",
        "category",
        "tag",
        "tags",
        "content",
      ],
      attributesToRetrieve: [
        "hierarchy",
        "content",
        "anchor",
        "url",
        "url_without_anchor",
        "type",
        "category",
        "tag",
        "tags",
        "post_title",
        "post_date",
        "description",
        "title",
      ],
      attributesToHighlight: [
        "hierarchy",
        "hierarchy_camel",
        "content",
        "category",
        "tag",
        "tags",
        "post_title",
        "post_date",
        "main_content",
        "description",
      ],
      attributesToSnippet: ["content:30", "main_content:30", "description:30"],
      camelCaseAttributes: ["hierarchy", "hierarchy_radio", "content"],
      distinct: true,
      attributeForDistinct: "url",
      customRanking: [
        "desc(weight.pageRank)",
        "desc(weight.level)",
        "asc(weight.position)",
      ],
      ranking: [
        "words",
        "filters",
        "typo",
        "attribute",
        "proximity",
        "exact",
        "custom",
      ],
      highlightPreTag: '<span class="algolia-docsearch-suggestion--highlight">',
      highlightPostTag: "</span>",
      minWordSizefor1Typo: 3,
      minWordSizefor2Typos: 7,
      allowTyposOnNumericTokens: false,
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
