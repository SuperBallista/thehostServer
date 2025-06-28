import { writable } from "svelte/store";

export const selectOptionStore = writable<{
  title: string;
  message: string;
  options: { value: string; label: string }[];
  resolve: (value: { value: string; label: string }) => void;
  reject: () => void;
} | null>(null);

export function showSelectOptionBox(
  title: string,
  message: string,
  options: { value: string; label: string }[]
): Promise<{ value: string; label: string }> {
  return new Promise((resolve, reject) => {
    selectOptionStore.set({
      title,
      message,
      options,
      resolve,
      reject,
    });
  });
}


export const killedByZombie = writable<string>('lure')

