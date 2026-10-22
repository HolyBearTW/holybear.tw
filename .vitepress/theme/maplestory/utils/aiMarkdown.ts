import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// AI output and provider errors are untrusted, even when the prompt asks for Markdown.
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: true });

export function renderAiMarkdown(source: string): string {
  // Fail closed when rendering outside a browser with no DOM sanitizer available.
  if (!DOMPurify.isSupported) return markdown.utils.escapeHtml(source);

  return DOMPurify.sanitize(markdown.render(source), {
    ALLOWED_TAGS: [
      'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em',
      's', 'del', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'a',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'start'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
  });
}
