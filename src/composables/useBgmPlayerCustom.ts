import JSON5 from 'json5';
import { onUnmounted, ref } from 'vue';

import type { BgmConfig, BgmTrack } from '@/types/bgm';
import type { AudioTrack, PlayMode } from '@ritsukage/audio-loop-player';
import { AudioLoopPlayer } from '@ritsukage/audio-loop-player';

const STORAGE_KEY = 'bgm-player-state';

interface StoredPlayerState {
  mode: PlayMode;
  autoplayEnabled: boolean;
  currentTrackIndex: number;
  volume: number;
  useLoop: boolean;
}

function convertTrack(track: BgmTrack): AudioTrack {
  return {
    name: track.name,
    artist: track.artist,
    album: track.album,
    artwork: track.artwork,
    url: track.url,
    loop: track.loop,
    dualFile: track.dualFile,
  };
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useBgmPlayerCustom(config: BgmConfig) {
  const player = ref<AudioLoopPlayer | null>(null);
  const volumeSaveTimeoutId = ref<number | null>(null);
  const autoplayEnabled = ref(config.autoplay);
  const useLoop = ref(true);

  const currentTrackIndex = ref(0);
  const isPlaying = ref(false);
  const volume = ref(config.volume);
  const currentMode = ref(config.mode);
  const currentTrack = ref<BgmTrack | null>(null);

  const loadUserPreference = (): Partial<StoredPlayerState> => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON5.parse(saved) as StoredPlayerState;
        return {
          mode: state.mode,
          autoplayEnabled: state.autoplayEnabled,
          currentTrackIndex: state.currentTrackIndex,
          volume: state.volume,
          useLoop: state.useLoop ?? true,
        };
      }
    } catch (e) {
      console.error('Failed to load BGM state:', e);
    }
    return {};
  }

  const saveUserPreference = (state: Partial<StoredPlayerState>): void => {
    try {
      const currentState = player.value?.getState();
      const stateToSave: StoredPlayerState = {
        mode: state.mode ?? currentState?.mode ?? config.mode,
        autoplayEnabled: state.autoplayEnabled ?? autoplayEnabled.value,
        currentTrackIndex: state.currentTrackIndex ?? currentState?.currentTrackIndex ?? 0,
        volume: state.volume ?? currentState?.volume ?? config.volume,
        useLoop: state.useLoop ?? currentState?.useLoop ?? true,
      };
      localStorage.setItem(STORAGE_KEY, JSON5.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to save BGM state:', e);
    }
  };

  const initPlayer = (): void => {
    if (!config.enabled || config.tracks.length === 0) return;

    const savedState = loadUserPreference();

    const tracks = config.tracks.map(convertTrack);

    player.value = new AudioLoopPlayer({
      tracks,
      volume: savedState.volume ?? config.volume,
      autoplay: false,
      mode: savedState.mode ?? config.mode,
      crossfadeDuration: 0.5,
    });

    volume.value = player.value.getVolume();
    currentMode.value = player.value.getMode();
    
    if (savedState.useLoop !== undefined) {
      player.value.setUseLoop(savedState.useLoop);
      useLoop.value = savedState.useLoop;
    } else {
      player.value.setUseLoop(true);
      useLoop.value = true;
    }

    if (savedState.currentTrackIndex !== undefined) {
      const index = Math.max(0, Math.min(savedState.currentTrackIndex, tracks.length - 1));
      player.value.playTrack(index);
      currentTrackIndex.value = index;
      const track = player.value.getCurrentTrack();
      if (track) {
        currentTrack.value = {
          name: track.name,
          url: track.url,
          dualFile: track.dualFile,
          artist: track.artist,
          album: track.album,
          artwork: track.artwork,
          loop: track.loop,
        } as BgmTrack;
      }
      if (!autoplayEnabled.value) {
        player.value.pause();
      }
    } else if (autoplayEnabled.value) {
      player.value.play();
    }

    setupEventListeners();
    setupMediaSessionHandlers();
  };

  const setupEventListeners = (): void => {
    if (!player.value) return;

    player.value.on('play', () => {
      isPlaying.value = true;
    });

    player.value.on('pause', () => {
      isPlaying.value = false;
    });

    player.value.on('stop', () => {
      isPlaying.value = false;
    });

    player.value.on('trackchange', (event) => {
      const track = event.data.track;
      currentTrack.value = {
        name: track.name,
        url: track.url,
        dualFile: track.dualFile,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork,
        loop: track.loop,
      } as BgmTrack;
      currentTrackIndex.value = event.data.index;
      saveUserPreference({});
    });

    player.value.on('modechange', (event) => {
      currentMode.value = event.data.mode;
      saveUserPreference({});
    });

    player.value.on('loopchange', (event) => {
      useLoop.value = event.data.useLoop;
      saveUserPreference({});
    });

    player.value.on('volumechange', (event) => {
      volume.value = event.data.volume;
      if (volumeSaveTimeoutId.value !== null) {
        window.clearTimeout(volumeSaveTimeoutId.value);
      }
      volumeSaveTimeoutId.value = window.setTimeout(() => {
        saveUserPreference({});
        volumeSaveTimeoutId.value = null;
      }, 200);
    });
  };

  const setupMediaSessionHandlers = (): void => {
    if (!('mediaSession' in navigator) || !player.value) return;

    navigator.mediaSession.setActionHandler('play', () => {
      player.value?.play();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      player.value?.pause();
    });

    navigator.mediaSession.setActionHandler('previoustrack', () => {
      player.value?.playPrevious();
    });

    navigator.mediaSession.setActionHandler('nexttrack', () => {
      player.value?.playNext();
    });

    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        player.value?.seek(details.seekTime);
      }
    });
  };

  const playTrack = (index: number): void => {
    player.value?.playTrack(index);
  };

  const playNext = (): void => {
    player.value?.playNext();
  };

  const playPrevious = (): void => {
    player.value?.playPrevious();
  };

  const togglePlay = (): void => {
    player.value?.togglePlay();
  };

  const toggleMode = (): void => {
    player.value?.toggleMode();
  };

  const toggleAutoplay = (): void => {
    autoplayEnabled.value = !autoplayEnabled.value;
    saveUserPreference({ autoplayEnabled: autoplayEnabled.value });
  };

  const toggleUseLoop = (): void => {
    player.value?.toggleUseLoop();
  };

  const setVolume = (newVolume: number): void => {
    player.value?.setVolume(newVolume);
  };

  const getCurrentTime = (): number => {
    return player.value?.getCurrentTime() ?? 0;
  };

  const getDuration = (): number => {
    return player.value?.getDuration() ?? 0;
  };

  const getIntroDuration = (): number => {
    return player.value?.getIntroDuration() ?? 0;
  };

  const getLoopDuration = (): number => {
    return player.value?.getLoopDuration() ?? 0;
  };

  const seek = (time: number): void => {
    player.value?.seek(time);
  };

  const getFrequencyData = (): Uint8Array => {
    return player.value?.getFrequencyData() ?? new Uint8Array(3);
  };

  const init = (): void => {
    initPlayer();
  };

  onUnmounted(() => {
    if (volumeSaveTimeoutId.value !== null) {
      window.clearTimeout(volumeSaveTimeoutId.value);
    }
    player.value?.destroy();
  });

  return {
    currentTrack,
    currentTrackIndex,
    isPlaying,
    volume,
    currentMode,
    autoplayEnabled,
    useLoop,
    playTrack,
    playNext,
    playPrevious,
    togglePlay,
    toggleMode,
    toggleAutoplay,
    toggleUseLoop,
    setVolume,
    init,
    getCurrentTime,
    getDuration,
    getIntroDuration,
    getLoopDuration,
    seek,
    getFrequencyData,
  };
}
