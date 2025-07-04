
export class Game {
gameId: string;
turn: number;
hostId: number; // string에서 number로 변경
record: Record[];
action: Action[];

constructor(gameId: string, hostId: number) {
    this.gameId = gameId;
    this.turn = 1;
    this.hostId = hostId;
    this.record = [];
    this.action = [];
}

recordData():GameInRedis {
   const gameData = {
    gameId: this.gameId,
    turn: this.turn,
    hostId: this.hostId,
    record: this.record,
    action: this.action
}
    return gameData
}
}

export interface GameRegionInRedis{
regionId: number
turn: number
chatMessage:chatMessage
regionMessage:regionMessage
}


export interface GameInRedis{
gameId: string;
turn: number;
hostId: number;
record: Record[];
action: Action[];
endGame?: 'infected' | 'killed' | 'cure';
}

export interface GameDto{
gameId: string,
turn: number
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

export interface GamePlayerInRedis {
    playerId: number;
    userId: number;
    state: State
    infected: number | null;
    items: ItemCode[]
    regionId: number;
    next: number;
    act: Act;
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

    constructor(playerId: number, userId: number, regionId: number, host: boolean, regionNumber: number) {
        this.playerId = playerId;
        this.userId = userId;
        this.regionId = regionId;
        this.infected = null; // 추가
        
        this.state = host ? 'host' : 'alive';
        
        this.items = [];
        
        this.next = Math.floor(Math.random() * regionNumber);
        this.act = 'lure';
    }

    recordData(){
        const playerData = {
            playerId: this.playerId,
            userId: this.userId,
            state: this.state,
            infected: this.infected,
            items: this.items,
            regionId: this.regionId,
            next: this.next,
            act: this.act
        }
        return playerData
    }
}

type State =  'alive' | 'host' | 'zombie' | 'killed' | 'left';
type Act = 'runaway' | 'hide' | 'lure';
export type ItemCode = `spray` | `vaccine` | `shotgun` | `eraser` | `medicine` | `microphone` | `vaccineMaterialA` | `vaccineMaterialB` | `vaccineMaterialC` | `virusChecker` | `wireless`
type UseMethod = () => Promise<boolean>

// 지역 이름 상수
export const REGION_NAMES = [
    '해안', '폐건물', '정글', '동굴', '산 정상', '개울'
];

// 동물 닉네임 리스트
export const ANIMAL_NICKNAMES = [
    '자책하는두더지',
    '말많은다람쥐',
    '웃는얼굴의하마',
    '엿듣는호랑이',
    '눈치빠른고양이',
    '조용한여우',
    '겁많은토끼',
    '고집센너구리',
    '유난떠는수달',
    '낙서많은부엉이',
    '분위기타는족제비',
    '장난기있는펭귄',
    '침착한판다',
    '의심많은고슴도치',
    '폭로하는까마귀',
    '살금살금곰',
    '혼잣말하는늑대',
    '사람좋은삵',
    '침묵하는도롱뇽',
    '거짓말하는수리부엉이'
];

// 아이템 이름 매핑
export const ITEM_NAMES: { [key in ItemCode | 'none']?: string } = {
    'spray': '낙서스프레이',
    'virusChecker': '진단키트',
    'medicine': '응급치료제',
    'vaccineMaterialA': '항바이러스혈청',
    'vaccineMaterialB': '촉매정제물질',
    'vaccineMaterialC': '신경억제단백질',
    'wireless': '무전기',
    'eraser': '지우개',
    'shotgun': '좀비사살용산탄총',
    'microphone': '마이크',
    'vaccine': '백신',
    'none': '없음'
};

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
    canInfect: boolean  // 감염 가능 여부 (turn 대체)
    infect?: number  // 감염 대상 (undefined 허용)
    zombieList: HostZombie[]  // 좀비 목록
}

export interface HostZombie {
    playerId: number
    targetId: number | null
    next: number  // 다음 이동 지역
}