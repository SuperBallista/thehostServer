import type { GamePlayerStatus, HostAct, Region, Survivor } from "../../page/game/game.type";
import type { Room } from "../../page/lobby/lobby.type";
import type { AuthUser } from "./authStore";
import type { State } from "./pageStore";

export interface userDataResponse{
token?: string
user?: AuthUser
locationState?: State
}

export interface lobbyDataResponse{
page?: number
roomList?: Room[]
joinRoom?:Room
}

export interface gameRoomDataResponse{
exitRoom?: boolean
roomData?: Room
playerId?: number
myStatus?: GamePlayerStatus
useRegionsNumber?: number
gameTurn?: number
surivorList?: Survivor[]
hostAct?: HostAct
region?: Region
count?: number
endGame?: `infected` | `killed` | `cure`
}