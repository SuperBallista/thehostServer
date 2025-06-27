import { Item } from "./common/itemObject";
import type { GamePlayerStatusInterface, SurvivorInterface } from "../../common/store/synchronize.type";
export declare class GamePlayerStatus {
    state: PlayerState;
    items: Item[];
    region: number;
    next: number;
    act: Act;
    constructor(state: PlayerState, region: number);
    updateData(payload: GamePlayerStatusInterface): void;
    setNext(next: number): void;
    setAct(act: Act): void;
    playNextTurn(item: Item): void;
}
export declare class Survivor {
    playerId: number;
    nickname: string;
    state: PlayerState;
    sameRegion: boolean;
    constructor(playerId: number, state: PlayerState, sameRegion: boolean, nickname?: string);
    checkAndUpdateSurvivor(state: PlayerState): void;
    disappearSurvivor(): void;
    updateData(Survivor: SurvivorInterface | undefined): void;
}
type PlayerState = 'alive' | 'host' | `zombie` | `dead` | 'you';
type Act = `runaway` | `hide` | `lure`;
export declare class HostAct {
    infect: number | null;
    canUseInfect: boolean;
    zombieList: Zombie[];
    constructor();
    useInfect(playerId: number): void;
    selectZombieTarget(zombieId: number, playerId: number): void;
    setNextRegion(zombieId: number, regionId: number): void;
    updateData(zombieList: Zombie[]): void;
    playNextTurn(): {
        infectTarget: number | null;
        attackTarget: number[];
    };
}
interface Zombie {
    playerId: number;
    targetId: number;
    next: number;
    leftTurn: number;
    region: number;
}
export declare function setPlayerNicknames(players: {
    id: number;
    nickname: string;
}[]): void;
export declare function getPlayerNickname(playerId: number): string;
export declare class Region {
    chatLog: ChatMessage[];
    regionMessageList: RegionMessage[];
    constructor();
    updateData(chatLog: ChatMessage[], messageList: RegionMessage[]): void;
    addMessage(message: RegionMessage): void;
    eraseMessage(index: number): void;
    showRegionMessage(): string[];
}
interface ChatMessage {
    system: boolean;
    message: string;
    timeStamp: Date;
}
type RegionMessage = string | null;
export {};
