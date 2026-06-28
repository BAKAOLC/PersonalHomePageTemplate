<template>
  <div class="json-viewer-modal">
    <div class="modal-header">
      <h3 class="modal-title">{{ title }}</h3>
      <div class="header-actions">
        <button
          class="action-button"
          type="button"
          :title="$t('common.copy')"
          @click="copyContent"
        >
          <i :class="getIconClass('copy')" aria-hidden="true"></i>
        </button>
        <button class="modal-close" type="button" @click="close" :title="$t('common.close')">
          <i :class="getIconClass('times')" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <div class="modal-body">
      <div class="json-code-frame" :style="{ maxHeight: viewerHeight }">
        <div class="line-numbers" aria-hidden="true">
          <span v-for="lineNumber in lineCount" :key="lineNumber">{{ lineNumber }}</span>
        </div>
        <pre class="json-code" tabindex="0"><code><span
          v-for="(line, lineIndex) in highlightedLines"
          :key="lineIndex"
          class="json-line"
        ><span
          v-for="(token, tokenIndex) in line"
          :key="tokenIndex"
          class="json-token"
          :class="token.kind"
        >{{ token.text }}</span></span></code></pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useNotificationManager } from '@/composables/useNotificationManager';
import { useScreenManager } from '@/composables/useScreenManager';
import { writeClipboardTextWithFallback } from '@/utils/browser';
import { getIconClass } from '@/utils/icons';

interface Props {
  title: string;
  content: string;
  closable?: boolean;
}

interface Emits {
  (e: 'close'): void;
}

type JsonTokenKind = 'plain' | 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punctuation' | 'comment';

interface JsonToken {
  text: string;
  kind: JsonTokenKind;
}

const props = withDefaults(defineProps<Props>(), {
  closable: true,
});

const emit = defineEmits<Emits>();

const { t: $t } = useI18n();
const notificationManager = useNotificationManager();
const { screenInfo } = useScreenManager();

const lineCount = computed(() => Math.max(1, props.content.split(/\r\n|\r|\n/).length));
const highlightedLines = computed(() => {
  return props.content.split(/\r\n|\r|\n/).map(tokenizeJsonLine);
});

const tokenPattern = /\/\/.*|\/\*.*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b(?:true|false|null)\b|[A-Za-z_$][\w$]*(?=\s*:)|[{}[\]:,]/g;

const getTokenKind = (token: string): JsonTokenKind => {
  if (token.startsWith('//') || token.startsWith('/*')) {
    return 'comment';
  }

  if (token.startsWith('"') || token.startsWith('\'')) {
    return 'string';
  }

  if (/^-?\d/.test(token)) {
    return 'number';
  }

  if (token === 'true' || token === 'false') {
    return 'boolean';
  }

  if (token === 'null') {
    return 'null';
  }

  if (/^[{}[\]:,]$/.test(token)) {
    return 'punctuation';
  }

  return 'key';
};

const tokenizeJsonLine = (line: string): JsonToken[] => {
  const tokens: JsonToken[] = [];
  let lastIndex = 0;

  Array.from(line.matchAll(tokenPattern)).forEach(match => {
    const token = match[0];
    const index = match.index ?? 0;

    if (index > lastIndex) {
      tokens.push({
        text: line.slice(lastIndex, index),
        kind: 'plain',
      });
    }

    tokens.push({
      text: token,
      kind: getTokenKind(token),
    });
    lastIndex = index + token.length;
  });

  if (lastIndex < line.length) {
    tokens.push({
      text: line.slice(lastIndex),
      kind: 'plain',
    });
  }

  return tokens.length > 0 ? tokens : [{ text: ' ', kind: 'plain' }];
};

const viewerHeight = computed(() => {
  const screenHeight = screenInfo.value.height;
  if (screenInfo.value.isTinyMobile) {
    return `${Math.max(220, Math.floor(screenHeight * 0.68))}px`;
  }
  if (screenInfo.value.isMobile) {
    return `${Math.max(240, Math.floor(screenHeight * 0.66))}px`;
  }
  if (screenInfo.value.isTablet) {
    return `${Math.max(280, Math.floor(screenHeight * 0.62))}px`;
  }
  return `${Math.max(320, Math.floor(screenHeight * 0.56))}px`;
});

const close = (): void => {
  if (props.closable) {
    emit('close');
  }
};

const copyContent = async (): Promise<void> => {
  const copied = await writeClipboardTextWithFallback(props.content);
  if (copied) {
    notificationManager.success($t('links.copied'));
    return;
  }
  notificationManager.error($t('common.error'));
};
</script>

<style scoped>
@reference "@/assets/styles/main.css";

.json-viewer-modal {
  @apply w-[calc(100vw-1rem)] max-w-4xl;
  @apply min-h-[200px] max-h-[90vh];
  @apply flex flex-col;
  @apply bg-white dark:bg-gray-900;
  @apply rounded-xl shadow-2xl;
  @apply overflow-hidden;
  @apply border border-gray-200 dark:border-gray-700;
}

.modal-header {
  @apply flex items-center justify-between gap-3;
  @apply p-5 pb-4;
  @apply border-b border-gray-200 dark:border-gray-700;
  @apply flex-shrink-0;
}

.modal-title {
  @apply text-lg font-semibold;
  @apply text-gray-900 dark:text-white;
  @apply m-0 min-w-0;
}

.header-actions {
  @apply flex items-center gap-2;
  @apply flex-shrink-0;
}

.action-button,
.modal-close {
  @apply w-8 h-8;
  @apply flex items-center justify-center;
  @apply bg-gray-100 dark:bg-gray-800;
  @apply text-gray-500 dark:text-gray-400;
  @apply hover:bg-gray-200 dark:hover:bg-gray-700;
  @apply hover:text-gray-700 dark:hover:text-gray-200;
  @apply rounded-lg;
  @apply transition-colors duration-200;
  @apply border-none cursor-pointer;
}

.modal-body {
  @apply flex-1 min-h-0;
  @apply p-5 py-4;
}

.json-code-frame {
  @apply grid;
  grid-template-columns: auto minmax(0, 1fr);
  @apply overflow-auto;
  @apply rounded-lg;
  @apply border border-gray-200 dark:border-gray-700;
  @apply bg-gray-950;
  font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, "Courier New", monospace;
  font-size: 13px;
  line-height: 1.55;
}

.line-numbers {
  @apply sticky left-0 z-10;
  @apply flex flex-col;
  @apply px-3 py-3;
  @apply text-right select-none;
  @apply text-gray-500;
  @apply bg-gray-950;
  border-right: 1px solid rgba(148, 163, 184, 0.24);
}

.json-code {
  @apply m-0 p-3;
  @apply min-w-0;
  @apply text-gray-100;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  tab-size: 2;
  outline: none;
}

.json-line {
  display: block;
  min-height: 1.55em;
}

.json-token.key {
  color: #93c5fd;
}

.json-token.string {
  color: #86efac;
}

.json-token.number {
  color: #fca5a5;
}

.json-token.boolean,
.json-token.null {
  color: #c4b5fd;
}

.json-token.punctuation {
  color: #cbd5e1;
}

.json-token.comment {
  color: #64748b;
  font-style: italic;
}

.json-code:focus-visible {
  @apply ring-2 ring-blue-500 ring-inset;
}

@media (max-width: 767px) {
  .json-viewer-modal {
    @apply w-[calc(100vw-1rem)] max-w-none;
  }

  .modal-header {
    @apply p-4 pb-3;
  }

  .modal-title {
    @apply text-base;
  }

  .modal-body {
    @apply p-4 py-3;
  }

  .json-code-frame {
    font-size: 12px;
  }

  .line-numbers {
    @apply px-2;
  }
}
</style>
