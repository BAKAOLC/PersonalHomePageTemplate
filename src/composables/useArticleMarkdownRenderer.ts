import DOMPurify from 'dompurify';
import type { LanguageFn } from 'highlight.js';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import 'highlight.js/styles/github-dark.css';
import { marked } from 'marked';

import type { Article } from '@/types';

const highlightLanguageAliases: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  html: 'xml',
  vue: 'xml',
  yml: 'yaml',
  'c++': 'cpp',
  'c#': 'csharp',
  ps1: 'powershell',
};

const registeredHighlightLanguages = new Set<string>();

const createHighlightLanguageLoader = (
  loader: () => Promise<{ default: LanguageFn }>,
): (() => Promise<LanguageFn>) => {
  return async () => (await loader()).default;
};

const highlightLanguageLoaders: Record<string, () => Promise<LanguageFn>> = {
  c: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/c')),
  cpp: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/cpp')),
  csharp: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/csharp')),
  diff: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/diff')),
  dockerfile: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/dockerfile')),
  go: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/go')),
  java: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/java')),
  php: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/php')),
  powershell: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/powershell')),
  python: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/python')),
  rust: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/rust')),
  sql: createHighlightLanguageLoader(() => import('highlight.js/lib/languages/sql')),
};

const registerHighlightLanguage = (name: string, language: LanguageFn): void => {
  if (registeredHighlightLanguages.has(name)) return;
  hljs.registerLanguage(name, language);
  registeredHighlightLanguages.add(name);
};

const bundledHighlightLanguages: Array<[string, LanguageFn]> = [
  ['bash', bash],
  ['css', css],
  ['javascript', javascript],
  ['json', json],
  ['markdown', markdown],
  ['typescript', typescript],
  ['xml', xml],
  ['yaml', yaml],
];

bundledHighlightLanguages.forEach(([name, language]) => {
  registerHighlightLanguage(name, language);
});

const normalizeHighlightLanguage = (language: string): string => {
  const normalized = language.trim().toLowerCase();
  return highlightLanguageAliases[normalized] ?? normalized;
};

const extractCodeBlockLanguages = (content: string): string[] => {
  const languages = new Set<string>();
  const codeFencePattern = /(?:```|~~~)([^\s`~]*)/g;
  let match: RegExpExecArray | null;

  while ((match = codeFencePattern.exec(content)) !== null) {
    const language = match[1]?.trim();
    if (language) {
      languages.add(normalizeHighlightLanguage(language));
    }
  }

  return [...languages];
};

const ensureHighlightLanguage = async (language: string): Promise<void> => {
  if (!language || hljs.getLanguage(language)) return;

  const loader = highlightLanguageLoaders[language];
  if (!loader) return;

  try {
    registerHighlightLanguage(language, await loader());
  } catch (error) {
    console.warn(`Failed to load highlight language: ${language}`, error);
  }
};

const ensureHighlightLanguages = async (content: string): Promise<void> => {
  await Promise.all(extractCodeBlockLanguages(content).map(ensureHighlightLanguage));
};

const escapeAttribute = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

const resolveMarkdownRelativeImage = (href: string, article: Article, language: string): string => {
  if (!href || href.startsWith('/') || href.startsWith('http://') || href.startsWith('https://')) {
    return href;
  }

  const { markdownPath } = article;
  if (!markdownPath) {
    return href;
  }

  const currentPath
    = typeof markdownPath === 'string'
      ? markdownPath
      : markdownPath[language] ?? Object.values(markdownPath)[0];

  if (!currentPath) {
    return href;
  }

  const dirPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
  return `/${dirPath}/${href}`;
};

export const sanitizeArticleHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'data-image-url'],
  });
};

export const renderArticleMarkdown = async (
  content: string,
  article: Article,
  language: string,
): Promise<string> => {
  try {
    await ensureHighlightLanguages(content);

    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    const renderer = new marked.Renderer();

    renderer.code = (token: { text: string; lang?: string; escaped?: boolean }) => {
      const { text: code } = token;
      const languageName = token.lang ? normalizeHighlightLanguage(token.lang) : '';

      if (languageName && hljs.getLanguage(languageName)) {
        try {
          const highlighted = hljs.highlight(code, { language: languageName }).value;
          return `<pre><code class="hljs language-${escapeAttribute(languageName)}">${highlighted}</code></pre>`;
        } catch (error) {
          console.warn('Highlight.js error:', error);
        }
      }

      const highlighted = hljs.highlightAuto(code).value;
      return `<pre><code class="hljs">${highlighted}</code></pre>`;
    };

    renderer.image = (token: { href: string; title?: string | null; text: string }) => {
      const href = resolveMarkdownRelativeImage(token.href, article, language);
      const titleAttr = token.title ? ` title="${escapeAttribute(token.title)}"` : '';
      const alt = escapeAttribute(token.text);
      const safeHref = escapeAttribute(href);

      return `<img src="${safeHref}" alt="${alt}"${titleAttr} loading="lazy" class="clickable-image" data-image-url="${safeHref}" style="cursor: pointer;">`;
    };

    return sanitizeArticleHtml(marked.parse(content, { renderer }) as string);
  } catch (error) {
    console.error('Markdown parsing error:', error);
    return sanitizeArticleHtml(content.replace(/\n/g, '<br>'));
  }
};
