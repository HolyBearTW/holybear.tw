// @vitest-environment jsdom
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AiAnalysisPanel from '../../.vitepress/theme/maplestory/components/AiAnalysisPanel';

function renderPanel(field: 'aiAnalysis' | 'error', source: string): HTMLElement {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(<AiAnalysisPanel
    aiResultRef={{ current: null }}
    analyzing={false}
    aiAnalysis={field === 'aiAnalysis' ? source : null}
    error={field === 'error' ? `AI\n\n${source}` : null}
    isHighScore={false}
    elapsedTime={0}
    progressMessage=""
    handleAiAnalyze={vi.fn()}
    geminiModel="gemini-2.5-flash"
    setShowKeySettings={vi.fn()}
    setDropRateWarningData={vi.fn()}
  />);
  return container.querySelector(field === 'error' ? '.maple-ai-error' : '.maple-ai-markdown')!;
}

describe.each(['aiAnalysis', 'error'] as const)('%s Markdown security', (field) => {
  it('preserves headings, bold, lists, tables and ordinary links', () => {
    const result = renderPanel(field, '# 報告\n\n**重點**\n\n- 清單\n\n| 欄位 | 數值 |\n| --- | --- |\n| A | 1 |\n\n[說明](https://example.com/help)');
    expect(result.querySelector('strong')?.textContent).toBe('重點');
    expect(result.querySelector('li')?.textContent).toBe('清單');
    expect(result.querySelector('table td')?.textContent).toBe('A');
    expect(result.querySelector('a')?.getAttribute('href')).toBe('https://example.com/help');
    expect(result.querySelector('h1')).not.toBeNull();
  });

  it.each([
    '<img src=x onerror="fetch(\'/steal?key=\'+localStorage.getItem(\'gemini_api_key\'))">',
    '<svg onload="alert(1)"><a xlink:href="javascript:alert(1)">click</a></svg>',
    '<iframe srcdoc="<script>alert(1)</script>"></iframe><object data="evil"></object>',
    '<a href="jav&#x61;script:alert(1)" onclick="alert(1)">click</a>',
    '[click](javascript:alert%281%29) [click](vbscript:evil) [click](data:text/html;base64,PHNjcmlwdD4=)',
    '<form id="gemini_api_key"><input name="x"></form><style>body{display:none}</style>',
  ])('does not create active HTML or unsafe links from %s', (payload) => {
    const result = renderPanel(field, payload);
    expect(result.querySelector('script,img,svg,iframe,object,form,input,style')).toBeNull();
    for (const element of result.querySelectorAll('*')) {
      for (const attr of element.attributes) {
        expect(attr.name).not.toMatch(/^on/i);
        if (attr.name === 'href') expect(attr.value).not.toMatch(/^(?:javascript|vbscript|data):/i);
      }
    }
  });
});
