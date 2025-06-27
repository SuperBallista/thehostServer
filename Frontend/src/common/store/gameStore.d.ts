import { HostAct, Region, Survivor, type GamePlayerStatus } from "../../page/game/game.type";
export declare const playerId: import("svelte/store").Writable<number | undefined>;
export declare const myStatus: import("svelte/store").Writable<GamePlayerStatus | undefined>;
export declare const useRegionsNumber: import("svelte/store").Writable<number>;
export declare const gameTurn: import("svelte/store").Writable<number>;
export declare const count: import("svelte/store").Writable<number>;
export declare const survivorList: import("svelte/store").Writable<Survivor[]>;
export declare const hostAct: import("svelte/store").Writable<HostAct | null>;
export declare const region: import("svelte/store").Writable<Region>;
