import { writable } from 'svelte/store';

export interface GraffitiMessage {
  message: string;
  index: number;
}

export interface GraffitiSelectorConfig {
  title: string;
  message: string;
  graffiti: GraffitiMessage[];
  resolve: (selectedGraffiti: GraffitiMessage | null) => void;
  reject: () => void;
  image?: string;
}

export const selectGraffitiStore = writable<GraffitiSelectorConfig | null>(null);

export function selectGraffitiMessageBox(
  title: string,
  message: string,
  graffiti: GraffitiMessage[],
  image?: string
): Promise<GraffitiMessage | null> {
  return new Promise((resolve, reject) => {
    selectGraffitiStore.set({
      title,
      message,
      graffiti,
      resolve: (selectedGraffiti) => {
        resolve(selectedGraffiti);
        selectGraffitiStore.set(null);
      },
      reject: () => {
        resolve(null);
        selectGraffitiStore.set(null);
      },
      image
    });
  });
}