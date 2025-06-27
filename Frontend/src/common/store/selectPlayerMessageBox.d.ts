import type { Survivor } from '../../page/game/game.type';
type SelectorConfig = {
    title: string;
    message: string;
    players: Survivor[];
    image: string | undefined;
    resolve: (player: Survivor) => void;
    reject: () => void;
};
export declare const selectPlayerStore: import("svelte/store").Writable<SelectorConfig | null>;
export declare function selectPlayerMessageBox(title: string, message: string, players: Survivor[], image?: string): Promise<Survivor>;
export {};
