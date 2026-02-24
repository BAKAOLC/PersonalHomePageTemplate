<template>
  <div v-if="config.enabled && config.tracks.length > 0" class="bgm-player">
    <div
      class="bgm-player-container"
      :class="{ 'expanded': isExpanded, 'playing': isPlaying }"
      :style="pulseStyle"
    >
      <!-- 折叠状态：圆形按钮 -->
      <button
        v-if="!isExpanded"
        @click="toggleExpand"
        class="bgm-toggle-btn"
        title="展开播放器"
      >
        <i class="fas fa-music"></i>
      </button>

      <!-- 展开状态：完整播放器 -->
      <div v-else class="bgm-player-expanded">
        <!-- 顶部：曲目信息和控制按钮 -->
        <div class="bgm-header">
          <div class="bgm-track-info">
            <div class="bgm-track-name">{{ currentTrack?.name || '未选择曲目' }}</div>
            <div class="bgm-time-display">
              {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
            </div>
          </div>
          <div class="bgm-header-controls">
            <button
              v-if="config.tracks.length > 0"
              @click="togglePlaylist"
              class="bgm-icon-btn"
              :class="{ 'active': isPlaylistExpanded }"
              title="播放列表"
            >
              <i class="fas fa-list"></i>
            </button>
            <button
              @click="toggleMode"
              class="bgm-icon-btn"
              :title="getModeTitle()"
            >
              <i :class="getModeIcon()"></i>
            </button>
            <button
              @click="toggleAutoplay"
              class="bgm-icon-btn"
              :class="{ 'active': autoplayEnabled }"
              :title="autoplayEnabled ? '关闭自动播放' : '开启自动播放'"
            >
              <i class="fas fa-power-off"></i>
            </button>
            <button @click="toggleExpand" class="bgm-icon-btn" title="收起">
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="bgm-progress-bar" @click="handleProgressClick">
          <div class="bgm-progress-bg"></div>
          <!-- 循环区段标记 -->
          <div
            v-if="currentTrack?.loop && duration > 0"
            class="bgm-loop-indicator"
            :style="getLoopIndicatorStyle()"
          ></div>
          <!-- 当前进度 -->
          <div class="bgm-progress-fill" :style="{ width: progressPercent + '%' }"></div>
        </div>

        <!-- 播放控制 -->
        <div class="bgm-controls">
          <button @click="playPrevious" class="bgm-control-btn" title="上一首">
            <i class="fas fa-step-backward"></i>
          </button>

          <button @click="togglePlay" class="bgm-play-btn" :title="isPlaying ? '暂停' : '播放'">
            <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
          </button>

          <button @click="playNext" class="bgm-control-btn" title="下一首">
            <i class="fas fa-step-forward"></i>
          </button>

          <!-- 音量控制 -->
          <div class="bgm-volume">
            <i class="fas fa-volume-up"></i>
            <input
              type="range"
              min="0"
              max="100"
              :value="volume * 100"
              @input="handleVolumeChange"
              class="bgm-volume-slider"
            />
          </div>
        </div>

        <!-- 曲目列表 -->
        <Transition name="playlist">
          <div v-if="isPlaylistExpanded && config.tracks.length > 0" class="bgm-playlist">
            <div
              v-for="(track, index) in config.tracks"
              :key="index"
              @click="playTrack(index)"
              class="bgm-playlist-item"
              :class="{ 'active': index === currentTrackIndex }"
            >
              <i :class="index === currentTrackIndex && isPlaying ? 'fas fa-volume-up' : 'fas fa-music'"></i>
              <span class="track-name">{{ track.name }}</span>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { useBgmPlayer } from '@/composables/useBgmPlayer';
import { useTimers } from '@/composables/useTimers';
import bgmConfig from '@/config/bgm.json';
import type { BgmConfig } from '@/types/bgm';

const config = bgmConfig as BgmConfig;
const isExpanded = ref(false);
const isPlaylistExpanded = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const progressPercent = ref(0);
const audioIntensity = ref(0);

const { setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame } = useTimers();
let progressInterval: number | null = null;
let intensityAnimationId: number | null = null;

const {
  currentTrack,
  currentTrackIndex,
  isPlaying,
  volume,
  currentMode,
  autoplayEnabled,
  playTrack,
  playNext,
  playPrevious,
  togglePlay,
  toggleMode,
  toggleAutoplay,
  setVolume,
  init,
  getCurrentTime,
  getDuration,
  seek,
  getFrequencyData,
} = useBgmPlayer(config);

const pulseStyle = computed(() => {
  if (!isPlaying.value) return {};

  const scaleMultiplier = isExpanded.value ? 0.15 : 0.5;
  const scale = 1 + (audioIntensity.value * scaleMultiplier);
  const opacity = 0.3 + (audioIntensity.value * 0.5);

  const brightness = 59 + (audioIntensity.value * 170);
  const borderColor = `rgb(${brightness}, ${130 + audioIntensity.value * 125}, 246)`;

  return {
    '--pulse-scale': scale.toString(),
    '--pulse-opacity': opacity.toString(),
    '--pulse-border-color': borderColor,
  };
});

const toggleExpand = (): void => {
  isExpanded.value = !isExpanded.value;
};

const togglePlaylist = (): void => {
  isPlaylistExpanded.value = !isPlaylistExpanded.value;
};

const handleVolumeChange = (event: Event): void => {
  const target = event.target as HTMLInputElement;
  setVolume(parseInt(target.value) / 100);
};

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getModeIcon = (): string => {
  switch (currentMode.value) {
    case 'single-loop':
      return 'fas fa-1';
    case 'list-order':
      return 'fas fa-repeat';
    case 'list-shuffle':
      return 'fas fa-random';
    default:
      return 'fas fa-list';
  }
};

const getModeTitle = (): string => {
  switch (currentMode.value) {
    case 'single-loop':
      return '单曲循环';
    case 'list-order':
      return '列表循环';
    case 'list-shuffle':
      return '随机播放';
    default:
      return '播放模式';
  }
};

const updateProgress = (): void => {
  const time = getCurrentTime();
  const dur = getDuration();

  currentTime.value = time;
  duration.value = dur;

  if (dur > 0) {
    progressPercent.value = (time / dur) * 100;
  } else {
    progressPercent.value = 0;
  }
};

const handleProgressClick = (event: MouseEvent): void => {
  const target = event.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const percent = x / rect.width;
  const newTime = percent * duration.value;

  seek(newTime);
  updateProgress();
};

const getLoopIndicatorStyle = (): Record<string, string> => {
  if (!currentTrack.value?.loop || duration.value <= 0) return {};

  const { start, end } = currentTrack.value.loop;
  const startPercent = (start / duration.value) * 100;
  const widthPercent = ((end - start) / duration.value) * 100;

  return {
    left: `${startPercent}%`,
    width: `${widthPercent}%`,
  };
};

const updateAudioIntensity = (): void => {
  if (!isPlaying.value) {
    audioIntensity.value = 0;
    return;
  }

  const frequencyData = getFrequencyData();
  if (frequencyData.length === 0) {
    audioIntensity.value = 0;
    intensityAnimationId = requestAnimationFrame(updateAudioIntensity);
    return;
  }

  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    sum += frequencyData[i];
  }
  const average = sum / frequencyData.length;
  audioIntensity.value = average / 255;

  intensityAnimationId = requestAnimationFrame(updateAudioIntensity);
};

watch(isPlaying, (playing) => {
  if (playing) {
    if (progressInterval !== null) {
      clearInterval(progressInterval);
    }
    progressInterval = setInterval(() => {
      updateProgress();
    }, 100);

    if (intensityAnimationId !== null) {
      cancelAnimationFrame(intensityAnimationId);
    }
    updateAudioIntensity();
  } else {
    if (progressInterval !== null) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    if (intensityAnimationId !== null) {
      cancelAnimationFrame(intensityAnimationId);
      intensityAnimationId = null;
    }

    audioIntensity.value = 0;
  }
});

onMounted(() => {
  init();
});

onUnmounted(() => {
  if (progressInterval !== null) {
    clearInterval(progressInterval);
  }
  if (intensityAnimationId !== null) {
    cancelAnimationFrame(intensityAnimationId);
  }
});
</script>

<style scoped>
.bgm-player {
  position: fixed;
  bottom: 60px;
  left: 20px;
  z-index: 40;
}

.bgm-player-container {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.bgm-toggle-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgb(59, 130, 246);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all 0.3s ease;
  position: relative;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.bgm-toggle-btn:hover {
  background: rgb(37, 99, 235);
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.bgm-player-container::before {
  content: '';
  position: absolute;
  inset: -4px;
  border: 2px solid var(--pulse-border-color, rgb(59, 130, 246));
  opacity: 0;
  transform: scale(1);
  transition: transform 0.3s ease-out, opacity 0.3s ease-out, border-color 0.1s ease-out, border-radius 0.3s ease;
  pointer-events: none;
}

.bgm-player-container.playing::before {
  opacity: var(--pulse-opacity, 0.6);
  transform: scale(var(--pulse-scale, 1));
  transition: transform 0.1s ease-out, opacity 0.1s ease-out, border-color 0.1s ease-out, border-radius 0.3s ease;
}

.bgm-player-container:not(.expanded)::before {
  border-radius: 50%;
}

.bgm-player-container.expanded::before {
  border-radius: 12px;
}

.bgm-player-expanded {
  width: 340px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 16px;
}

.dark .bgm-player-expanded {
  background: rgb(31, 41, 55);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.bgm-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
  gap: 12px;
}

.bgm-track-info {
  flex: 1;
  min-width: 0;
}

.bgm-track-name {
  font-size: 14px;
  font-weight: 600;
  color: rgb(31, 41, 55);
  margin-bottom: 4px;
  word-break: break-word;
  line-height: 1.4;
}

.dark .bgm-track-name {
  color: rgb(243, 244, 246);
}

.bgm-time-display {
  font-size: 11px;
  color: rgb(107, 114, 128);
}

.dark .bgm-time-display {
  color: rgb(156, 163, 175);
}

.bgm-header-controls {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.bgm-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgb(243, 244, 246);
  color: rgb(107, 114, 128);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dark .bgm-icon-btn {
  background: rgb(55, 65, 81);
  color: rgb(156, 163, 175);
}

.bgm-icon-btn:hover {
  background: rgb(229, 231, 235);
  color: rgb(59, 130, 246);
}

.dark .bgm-icon-btn:hover {
  background: rgb(75, 85, 99);
  color: rgb(59, 130, 246);
}

.bgm-icon-btn.active {
  background: rgb(59, 130, 246);
  color: white;
}

.dark .bgm-icon-btn.active {
  background: rgb(59, 130, 246);
  color: white;
}

.bgm-progress-bar {
  height: 6px;
  background: rgb(229, 231, 235);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  margin-bottom: 16px;
}

.dark .bgm-progress-bar {
  background: rgb(55, 65, 81);
}

.bgm-progress-bg {
  position: absolute;
  inset: 0;
  border-radius: 3px;
}

.bgm-loop-indicator {
  position: absolute;
  top: 0;
  height: 100%;
  background: rgba(59, 130, 246, 0.2);
  border-left: 2px solid rgb(59, 130, 246);
  border-right: 2px solid rgb(59, 130, 246);
  pointer-events: none;
  z-index: 1;
}

.dark .bgm-loop-indicator {
  background: rgba(59, 130, 246, 0.3);
}

.bgm-progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: rgb(59, 130, 246);
  border-radius: 3px;
  transition: width 0.1s linear;
  z-index: 2;
}

.bgm-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.bgm-control-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgb(243, 244, 246);
  color: rgb(31, 41, 55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.dark .bgm-control-btn {
  background: rgb(55, 65, 81);
  color: rgb(243, 244, 246);
}

.bgm-control-btn:hover {
  background: rgb(229, 231, 235);
  transform: scale(1.05);
}

.dark .bgm-control-btn:hover {
  background: rgb(75, 85, 99);
}

.bgm-play-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgb(59, 130, 246);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.bgm-play-btn:hover {
  background: rgb(37, 99, 235);
  transform: scale(1.05);
}

.bgm-volume {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  margin-left: 8px;
  min-width: 0;
}

.bgm-volume i {
  color: rgb(107, 114, 128);
  font-size: 14px;
  flex-shrink: 0;
}

.dark .bgm-volume i {
  color: rgb(156, 163, 175);
}

.bgm-volume-slider {
  flex: 1;
  min-width: 60px;
  height: 4px;
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  background: rgb(229, 231, 235);
  cursor: pointer;
}

.dark .bgm-volume-slider {
  background: rgb(55, 65, 81);
}

.bgm-volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgb(59, 130, 246);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.bgm-volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.bgm-volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgb(59, 130, 246);
  cursor: pointer;
  border: none;
  transition: transform 0.2s ease;
}

.bgm-volume-slider::-moz-range-thumb:hover {
  transform: scale(1.2);
}

.bgm-playlist {
  max-height: 160px;
  overflow-y: auto;
  border-top: 1px solid rgb(229, 231, 235);
  padding-top: 8px;
  margin: 0 -4px;
  padding-left: 4px;
  padding-right: 4px;
}

.dark .bgm-playlist {
  border-top-color: rgb(55, 65, 81);
}

/* 播放列表展开/收起过渡动画 */
.playlist-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.playlist-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.playlist-enter-from {
  max-height: 0;
  opacity: 0;
  padding-top: 0;
  margin-top: 0;
  border-top-width: 0;
}

.playlist-leave-to {
  max-height: 0 !important;
  opacity: 0;
  padding-top: 0;
  margin-top: 0;
  border-top-width: 0;
}

.playlist-enter-to {
  max-height: 160px;
  opacity: 1;
}

.playlist-leave-from {
  opacity: 1;
}

.bgm-playlist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgb(31, 41, 55);
  font-size: 13px;
}

.dark .bgm-playlist-item {
  color: rgb(243, 244, 246);
}

.bgm-playlist-item:hover {
  background: rgb(243, 244, 246);
}

.dark .bgm-playlist-item:hover {
  background: rgb(55, 65, 81);
}

.bgm-playlist-item.active {
  background: rgba(59, 130, 246, 0.1);
  color: rgb(59, 130, 246);
}

.dark .bgm-playlist-item.active {
  background: rgba(59, 130, 246, 0.2);
}

.bgm-playlist-item i:first-child {
  font-size: 12px;
  flex-shrink: 0;
}

.bgm-playlist-item .track-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bgm-playlist::-webkit-scrollbar {
  width: 4px;
}

.bgm-playlist::-webkit-scrollbar-track {
  background: rgb(243, 244, 246);
  border-radius: 2px;
}

.dark .bgm-playlist::-webkit-scrollbar-track {
  background: rgb(55, 65, 81);
}

.bgm-playlist::-webkit-scrollbar-thumb {
  background: rgb(209, 213, 219);
  border-radius: 2px;
}

.dark .bgm-playlist::-webkit-scrollbar-thumb {
  background: rgb(75, 85, 99);
}

.bgm-playlist::-webkit-scrollbar-thumb:hover {
  background: rgb(156, 163, 175);
}

.dark .bgm-playlist::-webkit-scrollbar-thumb:hover {
  background: rgb(107, 114, 128);
}

@media (max-width: 767px) {
  .bgm-player {
    bottom: 56px;
    left: 16px;
  }

  .bgm-toggle-btn {
    width: 44px;
    height: 44px;
    font-size: 16px;
  }

  .bgm-player-expanded {
    width: calc(100vw - 32px);
    max-width: 320px;
  }

  .bgm-header {
    gap: 8px;
  }

  .bgm-track-name {
    font-size: 13px;
  }

  .bgm-time-display {
    font-size: 10px;
  }

  .bgm-icon-btn {
    width: 26px;
    height: 26px;
    font-size: 12px;
  }

  .bgm-header-controls {
    gap: 4px;
  }

  .bgm-controls {
    gap: 6px;
  }

  .bgm-control-btn {
    width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .bgm-play-btn {
    width: 40px;
    height: 40px;
    font-size: 15px;
  }

  .bgm-volume {
    margin-left: 6px;
    gap: 6px;
  }

  .bgm-volume i {
    font-size: 13px;
  }

  .bgm-volume-slider {
    min-width: 50px;
  }

  .bgm-playlist {
    max-height: 140px;
  }

  .playlist-enter-to {
    max-height: 140px;
  }

  .bgm-playlist-item {
    padding: 6px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .bgm-player-expanded {
    width: calc(100vw - 24px);
    max-width: 280px;
    padding: 12px;
  }

  .bgm-volume-slider {
    min-width: 40px;
  }
}
</style>
