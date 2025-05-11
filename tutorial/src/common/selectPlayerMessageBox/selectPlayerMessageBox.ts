// src/common/messagebox/selectPlayerStore.ts
import { writable } from 'svelte/store';
import type { Survivor } from '../../page/game/game.type';

type SelectorConfig = {
  title: string;
  message: string;
  players: Survivor[];
  resolve: (player: Survivor) => void;
  reject: () => void;
};

export const selectPlayerStore = writable<SelectorConfig | null>(null);

export function selectPlayerMessageBox(
  title: string,
  message: string,
  players: Survivor[]
): Promise<Survivor> {
  return new Promise((resolve, reject) => {
    selectPlayerStore.set({
      title,
      message,
      players,
      resolve,
      reject,
    });
  });
}
