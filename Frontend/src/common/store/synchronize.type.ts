
export interface userRequest{
token: string
user: AuthUser

locationState?: State
roomId?: string
page?: number

createRoom?: string
joinRoom?: string
exitRoom?: boolean
room?: Room

myStatus?: GamePlayerStatusInterface
hostAct?: HostAct
giveItem?: GiveItem
useItem?: UseItem

gameStart?: boolean

}

interface GiveItem{
  receiver: number
  item: ItemInterface
}

interface UseItem{
  item: ItemInterface
  targetPlayer?: number
  content?: string
  targetMessage?: number
}



export interface userDataResponse{
// 사용자 정보
token?: string
user?: AuthUser
locationState?: State

// 로비 정보
page?: number
roomList?: Room[]
joinRoom?:Room

// 게임방 정보
exitRoom?: boolean
roomData?: Room
playerId?: number
myStatus?: GamePlayerStatusInterface
useRegionsNumber?: number
gameTurn?: number
survivorList?: SurvivorInterface[]
hostAct?: HostAct
region?: Region
count?: number
endGame?: `infected` | `killed` | `cure`
alarm?: {message: string, img: string}
}


interface AuthUser {
  id: number | null;
  nickname: string | null;
}

 type State = 'lobby' | 'host' | 'room' | 'game'

 interface Room {
    id: string;
    name: string;
    hostUserId: number;
    players: playerShortInfo[];
    bot: boolean
  };

interface playerShortInfo{
nickname: string;
id: number;
}

export interface GamePlayerStatusInterface{ // 내 정보
 state: MyPlayerState; // 자신의 상태는 alive 또는 host만 가능
 items: ItemInterface[];
 region: number;
 next: number;
 act: Act
}

export interface SurvivorInterface{ // 생존자 정보
playerId: number;
nickname: string;
state: OtherPlayerState; // 다른 플레이어는 모든 상태 가능
sameRegion: boolean
}


interface HostAct{
    infect?: number  // 감염 대상 설정 시만 전송 (undefined 허용)
    canInfect?: boolean     // 필요한 경우에만 전송
    zombieList?: Zombie[]   // 좀비 명령 시에만 전송
}

interface Region{
    chatLog: ChatMessage[];
    regionMessageList: RegionMessage[];
}

interface Zombie{
    playerId: number
    targetId: number
    next: number
    leftTurn: number
    region: number
}

interface ChatMessage{
    system: boolean
    message: string
    timeStamp: Date
} // 채팅메세지 형식

type RegionMessage = string | null // 구역 메세지 형식


// myStatus에 들어갈 수 있는 상태 (자신의 상태)
export type MyPlayerState = 'alive' | 'host'; // left, zombie, killed, infected는 논리적으로 불가능

// survivorList에 들어갈 수 있는 상태 (다른 플레이어의 상태)
export type OtherPlayerState = 'alive' | 'host' | 'zombie' | 'killed' | 'left' | 'you';

// 전체 플레이어 상태 (기존 호환성 유지)
export type PlayerState = 'alive' | 'host' | `zombie` | `killed` | 'left' | 'you' // 생존자 상태
type Act = `runaway` | `hide` | `lure` // 좀비 대처 행동
export type ItemInterface = `spray` | `virusChecker` | `vaccine` | `medicine` | `vaccineMaterialA` | `vaccineMaterialB` | `vaccineMaterialC` | `wireless` | `eraser` | `shotgun` | `microphone`


