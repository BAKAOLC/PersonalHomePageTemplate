import { Howl } from 'howler';
import JSON5 from 'json5';
import { computed, onUnmounted, ref } from 'vue';

import { useTimers } from '@/composables/useTimers';
import type { BgmConfig, BgmTrack, PlayMode } from '@/types/bgm';

const STORAGE_KEY = 'bgm-player-state';

interface PlayerState {
  mode: PlayMode;
  autoplayEnabled: boolean;
  currentTrackIndex: number;
  volume: number;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function useBgmPlayer(config: BgmConfig) {
  const { clearInterval, setInterval } = useTimers();
  const currentTrackIndex = ref<number>(0);
  const isPlaying = ref(false);
  const volume = ref(config.volume);
  const currentHowl = ref<Howl | null>(null);
  const loopCheckInterval = ref<number | null>(null);
  const currentMode = ref<PlayMode>(config.mode);
  const autoplayEnabled = ref(config.autoplay);
  const analyser = ref<AnalyserNode | null>(null);
  const audioContext = ref<AudioContext | null>(null);
  const audioSource = ref<MediaElementAudioSourceNode | null>(null);
  const connectedAudioElement = ref<HTMLAudioElement | null>(null);
  const volumeSaveTimeoutId = ref<number | null>(null);

  const loadUserPreference = (): void => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON5.parse(saved);
        if (state.mode) {
          currentMode.value = state.mode;
        }
        if (state.autoplayEnabled !== undefined) {
          autoplayEnabled.value = state.autoplayEnabled;
        }
        if (
          state.currentTrackIndex !== undefined &&
          Number.isInteger(state.currentTrackIndex) &&
          state.currentTrackIndex >= 0 &&
          state.currentTrackIndex < config.tracks.length
        ) {
          currentTrackIndex.value = state.currentTrackIndex;
        }
        if (typeof state.volume === 'number' && Number.isFinite(state.volume)) {
          volume.value = Math.max(0, Math.min(1, state.volume));
        }
      }
    } catch (e) {
      console.error('Failed to load BGM state:', e);
    }
  };

  const saveUserPreference = (): void => {
    try {
      const state: PlayerState = {
        mode: currentMode.value,
        autoplayEnabled: autoplayEnabled.value,
        currentTrackIndex: currentTrackIndex.value,
        volume: volume.value,
      };
      localStorage.setItem(STORAGE_KEY, JSON5.stringify(state));
    } catch (e) {
      console.error('Failed to save BGM state:', e);
    }
  };

  loadUserPreference();

  const currentTrack = computed(() => {
    if (config.tracks.length === 0) return null;
    return config.tracks[currentTrackIndex.value];
  });

  const getRandomTrackIndex = (): number => {
    if (config.tracks.length <= 1) return 0;
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * config.tracks.length);
    } while (newIndex === currentTrackIndex.value);
    return newIndex;
  };

  const clearLoopCheck = (): void => {
    if (loopCheckInterval.value !== null) {
      clearInterval(loopCheckInterval.value);
      loopCheckInterval.value = null;
    }
  };

  const setupLoopCheck = (howl: Howl, track: BgmTrack): void => {
    if (!track.loop) return;

    clearLoopCheck();

    loopCheckInterval.value = setInterval(() => {
      if (!howl.playing()) return;

      const currentTime = howl.seek();
      if (track.loop && currentTime >= track.loop.end) {
        const overflow = currentTime - track.loop.end;
        const loopDuration = track.loop.end - track.loop.start;
        const newPosition = track.loop.start + (overflow % loopDuration);
        howl.seek(newPosition);
      }
    }, 100);
  };

  const setupAnalyser = (howl: Howl): void => {
    try {
      const sound = (howl as any)._sounds[0];
      if (!sound?._node) return;

      const audioElement = sound._node as HTMLAudioElement;

      if (connectedAudioElement.value === audioElement && analyser.value) return;

      if (!audioContext.value) {
        const AudioContextClass = window.AudioContext ?? (window as any).webkitAudioContext;
        audioContext.value = new AudioContextClass();
      }

      if (audioSource.value) {
        try { audioSource.value.disconnect(); } catch (_) { /* ignore */ }
        audioSource.value = null;
      }

      audioSource.value = audioContext.value.createMediaElementSource(audioElement);
      connectedAudioElement.value = audioElement;

      analyser.value = audioContext.value.createAnalyser();
      analyser.value.fftSize = 64;
      analyser.value.smoothingTimeConstant = 0.8;

      audioSource.value.connect(analyser.value);
      analyser.value.connect(audioContext.value.destination);
    } catch (e) {
      console.warn('Failed to setup audio analyser:', e);
    }
  };

  const getFrequencyData = (): Uint8Array => {
    if (!analyser.value) return new Uint8Array(3);
    const bufferLength = analyser.value.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.value.getByteFrequencyData(dataArray);
    return dataArray;
  };

  const updateMediaSession = (track: BgmTrack): void => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      artist: track.artist ?? '',
      album: track.album ?? '',
      artwork: track.artwork ?? [],
    });
  };

  const clearMediaSession = (): void => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
  };

  const updateLoopBehavior = (): void => {
    if (!currentHowl.value) return;

    const track = config.tracks[currentTrackIndex.value];
    if (!track) return;

    const shouldUseLoopPoint = currentMode.value === 'single-loop' && track.loop;
    const shouldLoopWholeSong = currentMode.value === 'single-loop' && !track.loop;

    clearLoopCheck();

    if (shouldUseLoopPoint) {
      setupLoopCheck(currentHowl.value, track);
    }

    (currentHowl.value as any)._loop = shouldLoopWholeSong;
  };

  const playTrack = (index: number): void => {
    if (!config.enabled || config.tracks.length === 0) return;
    if (index < 0 || index >= config.tracks.length) return;

    if (currentHowl.value) {
      clearLoopCheck();
      currentHowl.value.unload();
      currentHowl.value = null;
    }

    currentTrackIndex.value = index;
    saveUserPreference();
    const track = config.tracks[index];

    const shouldUseLoopPoint = currentMode.value === 'single-loop' && track.loop;
    const shouldLoopWholeSong = currentMode.value === 'single-loop' && !track.loop;

    const howl = new Howl({
      src: [track.url],
      volume: volume.value,
      html5: true,
      loop: shouldLoopWholeSong,
      onplay: () => {
        setupAnalyser(howl);
        isPlaying.value = true;
        if (shouldUseLoopPoint) {
          setupLoopCheck(howl, track);
        }
        if (audioContext.value?.state === 'suspended') {
          audioContext.value.resume();
        }
        updateMediaSession(track);
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      },
      onpause: () => {
        isPlaying.value = false;
        clearLoopCheck();
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'paused';
        }
      },
      onstop: () => {
        isPlaying.value = false;
        clearLoopCheck();
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'none';
        }
      },
      onend: () => {
        if (currentMode.value !== 'single-loop') {
          playNext();
        }
      },
      onloaderror: (_id: unknown, error: unknown) => {
        console.error(`Failed to load track: ${track.name}`, error);
        playNext();
      },
      onplayerror: (_id: unknown, error: unknown) => {
        console.error(`Failed to play track: ${track.name}`, error);
        playNext();
      },
    });

    currentHowl.value = howl;
    howl.play();
  };

  const playNext = (): void => {
    if (currentMode.value === 'list-shuffle') {
      playTrack(getRandomTrackIndex());
    } else {
      playTrack((currentTrackIndex.value + 1) % config.tracks.length);
    }
  };

  const playPrevious = (): void => {
    if (currentMode.value === 'list-shuffle') {
      playTrack(getRandomTrackIndex());
    } else {
      const prevIndex = currentTrackIndex.value - 1;
      playTrack(prevIndex < 0 ? config.tracks.length - 1 : prevIndex);
    }
  };

  const togglePlay = (): void => {
    if (!currentHowl.value) {
      if (currentMode.value === 'list-shuffle') {
        playTrack(getRandomTrackIndex());
      } else {
        playTrack(0);
      }
      return;
    }

    if (isPlaying.value) {
      currentHowl.value.pause();
    } else {
      currentHowl.value.play();
    }
  };

  const toggleMode = (): void => {
    const modes: PlayMode[] = ['single-loop', 'list-order', 'list-shuffle'];
    const currentIndex = modes.indexOf(currentMode.value);
    const nextIndex = (currentIndex + 1) % modes.length;
    currentMode.value = modes[nextIndex];
    saveUserPreference();

    updateLoopBehavior();
  };

  const toggleAutoplay = (): void => {
    autoplayEnabled.value = !autoplayEnabled.value;
    saveUserPreference();
  };

  const setVolume = (newVolume: number): void => {
    volume.value = Math.max(0, Math.min(1, newVolume));
    if (currentHowl.value) {
      currentHowl.value.volume(volume.value);
    }
    if (volumeSaveTimeoutId.value !== null) {
      window.clearTimeout(volumeSaveTimeoutId.value);
      volumeSaveTimeoutId.value = null;
    }
    volumeSaveTimeoutId.value = window.setTimeout(() => {
      saveUserPreference();
      volumeSaveTimeoutId.value = null;
    }, 200);
  };

  const getCurrentTime = (): number => {
    if (!currentHowl.value) return 0;
    return currentHowl.value.seek();
  };

  const getDuration = (): number => {
    if (!currentHowl.value) return 0;
    return currentHowl.value.duration();
  };

  const seek = (time: number): void => {
    if (!currentHowl.value) return;
    currentHowl.value.seek(time);
  };

  const setupMediaSessionHandlers = (): void => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => {
      if (!currentHowl.value) {
        if (currentMode.value === 'list-shuffle') {
          playTrack(getRandomTrackIndex());
        } else {
          playTrack(currentTrackIndex.value);
        }
      } else {
        currentHowl.value.play();
      }
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      currentHowl.value?.pause();
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      playPrevious();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      playNext();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        seek(details.seekTime);
      }
    });
  };

  const init = (): void => {
    setupMediaSessionHandlers();
    if (config.enabled && autoplayEnabled.value && config.tracks.length > 0) {
      if (currentMode.value === 'list-shuffle') {
        playTrack(getRandomTrackIndex());
      } else {
        playTrack(currentTrackIndex.value);
      }
    }
  };

  onUnmounted(() => {
    clearLoopCheck();
    clearMediaSession();
    if (currentHowl.value) {
      currentHowl.value.unload();
    }
    if (audioContext.value) {
      audioContext.value.close();
    }
  });

  return {
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
  };
}
