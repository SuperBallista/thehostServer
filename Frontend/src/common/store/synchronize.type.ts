import type { GamePlayerStatus, HostAct, Region, Survivor } from "../../page/game/game.type";
import type { Room } from "../../page/lobby/lobby.type";
import type { AuthState } from "./authStore";
import type { State } from "./pageStore";

export interface userDataResponse{
authStore?: AuthState
user?: AuthState
locationState?: State
}

export interface lobbyDataResponse{
page?: number
roomList?: Room[]
createRoom?: Room
}

export interface gameRoomDataResponse{
playerId?: number
myStatus?: GamePlayerStatus
useRegionsNumber?: number
gameTurn?: number
surivorList?: Survivor[]
hostAct?: HostAct
region?: Region
count?: number
}