import { writable } from 'svelte/store';

interface MusicState {
  isPlaying: boolean;
  volume: number;
  audio: HTMLAudioElement | null;
}

const initialState: MusicState = {
  isPlaying: false,  // 🔥 초기값을 false로 수정 (음악이 재생 중이 아님)
  volume: 0.3,
  audio: null
};

export const musicStore = writable<MusicState>(initialState);

export function initMusic(src: string) {
  musicStore.update(state => {
    if (!state.audio) {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = state.volume;
      return { ...state, audio };
    }
    return state;
  });
}

export function toggleMusic() {
  musicStore.update(state => {
    if (state.audio) {
      if (state.isPlaying) {
        state.audio.pause();
      } else {
        state.audio.play().catch(err => console.log('음악 재생 실패:', err));
      }
      return { ...state, isPlaying: !state.isPlaying };
    }
    return state;
  });
}

export function setVolume(volume: number) {
  musicStore.update(state => {
    const newVolume = Math.max(0, Math.min(1, volume));
    if (state.audio) {
      state.audio.volume = newVolume;
    }
    return { ...state, volume: newVolume };
  });
}

export function cleanupMusic() {
  musicStore.update(state => {
    if (state.audio) {
      state.audio.pause();
      state.audio.src = '';
    }
    return initialState;
  });
}