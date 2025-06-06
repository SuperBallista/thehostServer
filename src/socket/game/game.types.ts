
export class Game {
gameId: string;
turn: number;
hostId: string;
record: Record[];
action: Action[];

constructor(gameId, hostId){
    this.gameId = gameId;
    this.turn = 1;
    this.hostId = hostId
    this.record = []
    this.action = []
}

}

//**전체 게임 진행 기록 */
export interface Record{
    message: string
    timeStamp: Date
}


//**구역 채팅 메세지 */
export interface chatMessage{
    system: boolean
    message: string
    timeStamp: Date
}

//**구역 낙서 메세지 */
export interface regionMessage{
    message: string
    created: number
    erased?: number | undefined
}

export interface Action{
    turn: number
    playerId: number
    action: string
    timeStamp: Date
}

export class GamePlayer{
    playerId: number;
    userId: number;
    state: State
    infected: number | null;
    items: ItemCode[]
    regionId: number;
    next: number;
    act: Act;

    constructor(playerId, userId, regionId, host:boolean, regionNumber: number){
        this.playerId = playerId
        this.userId = userId
        this.regionId = regionId
        
        this.state = host ? 'host' : 'alive';
        this.items = []
        this.next = Math.floor(Math.random() * regionNumber)
        this.act = 'lure'
    }
}

type State =  'alive' | 'host' | 'zombie' | 'killed';
type Act = 'runaway' | 'hide' | 'lure';
type ItemCode = `spray` | `vaccine` | `shotgun` | `eraser` | `medicine` | `microphone` | `vaccineMaterialA` | `vaccineMaterialB` | `vaccineMaterialC` | `virusChecker` | `wireless`
type UseMethod = () => Promise<boolean>

export class ItemObject{
    code: ItemCode
    useMethod: UseMethod
    constructor(code:ItemCode, useMethod: UseMethod){
        this.code = code
        this.useMethod = useMethod
    }
}

export interface Host {
    hostId: number
    turn: boolean
    infect: number | null
}