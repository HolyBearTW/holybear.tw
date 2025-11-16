new Crawler({
  rateLimit: 8,
  startUrls: ["https://holybear.tw"],
  discoveryPatterns: ["https://holybear.tw/**"],
  maxUrls: null,
  indexPrefix: "",
  renderJavaScript: true,
  schedule: "at 09:18 on Sunday",
  maxDepth: 10,
  sitemaps: ["https://holybear.tw/sitemap.xml"],
  exclusionPatterns: [
    "https://holybear.tw/**/*.html",
    "https://holybear.tw/$",
    "https://holybear.tw/blog/index",
    "https://holybear.tw/en/blog/index",
    "https://holybear.tw/blog.html",
    "https://holybear.tw/en/blog.html",
    "https://holybear.tw/blog/index.html",
    "https://holybear.tw/en/blog/index.html",
    "https://holybear.tw/sitemap.xml",
    "https://holybear.tw/*.xml",
    "https://holybear.tw/*.txt",
  ],
  actions: [
    {
      indexName: "holybear.tw",
      pathsToMatch: ["https://holybear.tw/**"],
      recordExtractor: ({ $, helpers, url }) => {
        const firstH2 = $(".vp-doc h2").first();
        if (firstH2.length > 0 && firstH2.prev("p").length === 0) {
          firstH2.before("<p></p>");
        }

        const cleanUrl = (urlStr) => {
          if (!urlStr) return urlStr;
          return (
            urlStr
              .replace(/\.html(#.*)?$/, "$1")
              .replace(/\/index(#.*)?$/, "$1")
              .replace(/\/$/, "") || "/"
          );
        };

        // 👇👇👇 修正點 1：將 cleanNavigationText 函數加回來 👇👇👇
        const cleanNavigationText = (text) => {
          if (!text || typeof text !== "string") return text;
          return text
            .replace(/繁體中文\s*繁體中文\s*深色模式/g, "")
            .replace(/English\s*English\s*Dark\s*Mode/g, "")
            .replace(/繁體中文.*?深色模式/g, "")
            .replace(/English.*?Dark\s*Mode/g, "")
            .trim();
        };

        const lang = url.href.includes("/en/") ? "en" : "zh-TW";
        const pageCategory = $(".category").first().text().trim();
        const pageTags = $(".tag")
          .map((_, el) => $(el).text().trim())
          .get()
          .filter(Boolean);
        const postTitle = $(".blog-post-title").text().trim();
        const postDate = $(".blog-post-date-in-content").text().trim();
        const pageDescription = (
          $('meta[name="description"]').attr("content") || ""
        ).trim();

        const records = helpers.docsearch({
          recordProps: {
            lvl0: { selectors: ".blog-post-title", defaultValue: "文章" },
            content: [".vp-doc p", ".vp-doc li"],
            lvl1: [".vp-doc h1"],
            lvl2: [".vp-doc h2"],
            lvl3: [".vp-doc h3"],
            lvl4: [".vp-doc h4"],
            lvl5: [".vp-doc h5"],
          },
          indexHeadings: true,
          aggregateContent: true,
          recordVersion: "v3",
        });

        return records.map((record) => {
          const newRecord = { ...record };
          newRecord.lang = lang;
          newRecord.post_title = postTitle;
          newRecord.post_date = postDate;
          newRecord.description = pageDescription;
          newRecord.category = pageCategory ? [pageCategory] : [];
          newRecord.tags = pageTags;
          newRecord.tag = pageTags;
          if (newRecord.url) {
            newRecord.url = cleanUrl(newRecord.url);
          }
          if (newRecord.url_without_anchor) {
            newRecord.url_without_anchor = cleanUrl(
              newRecord.url_without_anchor,
            );
          }

          // 👇👇👇 修正點 2：將完整的內容填充與文字過濾邏輯加回來 👇👇👇

          // 步驟 A：先過濾現有的 content 和 hierarchy
          if (newRecord.content) {
            newRecord.content = cleanNavigationText(newRecord.content);
          }
          if (newRecord.hierarchy) {
            Object.keys(newRecord.hierarchy).forEach((key) => {
              if (newRecord.hierarchy[key]) {
                newRecord.hierarchy[key] = cleanNavigationText(
                  newRecord.hierarchy[key],
                );
              }
            });
          }

          // 步驟 B：如果 content 為空，執行後備方案
          if (!newRecord.content) {
            // 優先使用頁面描述
            if (pageDescription) {
              newRecord.content = cleanNavigationText(pageDescription);
            } else {
              // 最終手段：抓取頁面前200字
              let fallbackContent =
                $(".vp-doc").text().trim() || $("main").text().trim() || "";
              fallbackContent = cleanNavigationText(fallbackContent);
              newRecord.content = fallbackContent.substring(0, 200);
            }
          }

          return newRecord;
        });
      },
    },
  ],
  initialIndexSettings: {
    "holybear.tw": {
      attributesForFaceting: ["type", "lang", "category", "tags", "tags"],
      searchableAttributes: [
        "unordered(hierarchy.lvl0)",
        "unordered(hierarchy.lvl1)",
        "unordered(hierarchy.lvl2)",
        "unordered(hierarchy.lvl3)",
        "unordered(post_title)",
        "unordered(content)",
        "unordered(description)",
        "unordered(category)",
        "unordered(tags)",
      ],
      attributesToHighlight: [
        "hierarchy",
        "post_title",
        "content",
        "description",
        "category",
        "tags",
      ],
      attributesToSnippet: ["content:20", "description:30"],
      distinct: true,
      attributeForDistinct: "url_without_anchor",
      attributesToRetrieve: [
        "hierarchy",
        "content",
        "anchor",
        "url",
        "url_without_anchor",
        "type",
        "lang",
        "category",
        "tags",
        "tags",
        "post_title",
        "post_date",
        "description",
      ],
      camelCaseAttributes: ["hierarchy", "content"],
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
    },
  },
  ignoreCanonicalTo: false,
  safetyChecks: { beforeIndexPublishing: { maxLostRecordsPercentage: 90 } },
});