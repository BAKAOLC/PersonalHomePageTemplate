<template>
  <div class="character-selector">
    <button
      class="section-title-button"
      @click="toggleCharactersExpansion"
    >
      <h3 class="selector-title">{{ $t('gallery.characters') }}</h3>
      <i
        class="fa expand-icon"
        :class="getIconClass(isCharactersExpanded ? 'chevron-up' : 'chevron-down')"
      ></i>
    </button>
    <Transition name="character-list">
      <div v-if="isCharactersExpanded" class="characters-list">
      <button v-for="character in characters" :key="character.id" @click="selectCharacter(character.id)"
        class="character-button" :class="{ 'active': selectedCharacterId === character.id }" :style="{
          '--character-color': character.color || '#667eea',
          '--character-hover-color': character.color ? `${character.color}80` : '#667eea80'
        }">
        {{ character.name[currentLanguage] || character.name.en || character.id }}
        <span v-if="isSearching" class="character-count">{{ appStore.getCharacterMatchCount(character.id) }}</span>
      </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { siteConfig } from '@/config/site';
import { useAppStore } from '@/stores/app';
import { getIconClass } from '@/utils/icons';

const { t: $t } = useI18n();
const appStore = useAppStore();

// 判断是否在搜索
const isSearching = computed(() => appStore.isSearching);

// 全部角色选项
const allOption = {
  id: 'all',
  name: { en: 'All', zh: '全部', jp: 'すべて' },
  color: '#667eea',
};

// 所有可选角色
const allCharacters = computed(() => {
  // 如果在搜索，则添加"全部"选项
  if (isSearching.value) {
    return [allOption, ...siteConfig.characters];
  }
  return siteConfig.characters;
});

// 根据搜索过滤要显示的角色
const characters = computed(() => {
  if (!isSearching.value) return allCharacters.value;

  // 如果正在搜索，只显示有匹配图像的角色
  return allCharacters.value.filter(char => {
    if (char.id === 'all') return true; // "全部"始终显示

    // 检查该角色是否有匹配的图像
    const count = appStore.getCharacterMatchCount(char.id);
    return count > 0;
  });
});

const selectedCharacterId = computed({
  get: () => appStore.selectedCharacterId,
  set: (value) => appStore.selectedCharacterId = value,
});
const currentLanguage = computed(() => appStore.currentLanguage);

// 删除未使用的getCharacterCount函数

// 角色列表的折叠状态（默认展开）
const isCharactersExpanded = ref(true);

// 切换角色列表的展开状态
const toggleCharactersExpansion = (): void => {
  isCharactersExpanded.value = !isCharactersExpanded.value;
};

const selectCharacter = (id: string): void => {
  selectedCharacterId.value = id;
};
</script>

<style scoped>
.character-selector {
  margin-bottom: 0;
}

.section-title-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  cursor: pointer;
  padding: 0.75rem;
  margin: 0;
  border-radius: 0.5rem;
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.section-title-button:hover {
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .section-title-button {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .section-title-button:hover {
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
  border-color: #64748b;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.selector-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
  color: #1e293b;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.dark .selector-title {
  color: #f1f5f9;
}

.expand-icon {
  font-size: 0.75rem;
  color: #64748b;
  transition: all 200ms ease-out;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  background: rgba(100, 116, 139, 0.1);
  border: 1px solid rgba(100, 116, 139, 0.2);
}

.dark .expand-icon {
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.1);
  border-color: rgba(148, 163, 184, 0.2);
}

.section-title-button:hover .expand-icon {
  color: #475569;
  background: rgba(100, 116, 139, 0.15);
  border-color: rgba(100, 116, 139, 0.3);
  transform: translateY(-1px);
}

.dark .section-title-button:hover .expand-icon {
  color: #cbd5e1;
  background: rgba(148, 163, 184, 0.15);
  border-color: rgba(148, 163, 184, 0.3);
}

.characters-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

@media (max-width: 767px) {
  .characters-list {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
  }
}

.character-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background-color: #f3f4f6;
  color: #4b5563;
  border: 1px solid transparent;
  transition: all 200ms;
  font-size: 0.875rem;
  font-weight: 500;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

@media (max-width: 767px) {
  .character-button {
    min-width: 11rem;
    width: auto;
    padding: 0.5rem 1rem;
  }
}

.dark .character-button {
  background-color: #1f2937;
  color: #d1d5db;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.character-button:hover {
  background-color: #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.dark .character-button:hover {
  background-color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.character-button.active {
  border-color: transparent;
  background-color: var(--character-color);
  color: white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.character-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.25rem;
  padding: 0 0.375rem;
  min-width: 1.25rem;
  height: 1.25rem;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.2);
  color: inherit;
  font-size: 0.75rem;
  font-weight: 600;
}

/* 角色列表折叠动画 */
.character-list-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.character-list-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.6, 1);
}

.character-list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
}

.character-list-leave-to {
  opacity: 0;
  transform: translateY(-5px);
  max-height: 0;
}

.character-list-enter-to,
.character-list-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}
</style>
