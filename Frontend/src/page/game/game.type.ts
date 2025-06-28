import { get } from "svelte/store";
import { totalRegions } from "../../common/store/gameStateStore";
import { Item } from "./common/itemObject";
import type { GamePlayerStatusInterface, SurvivorInterface } from "../../common/store/synchronize.type";

export class GamePlayerStatus{ // 내 정보
 state: PlayerState;
 items: Item[];
 region: number;
 next: number;
 act: Act

 constructor(state:PlayerState, region:number){
  this.state = state
  this.items = []
  this.region = region
  this.next = Math.floor(Math.random()*get(totalRegions))
  this.act = `lure`
 }

 updateData(payload:GamePlayerStatusInterface){
 this.state = payload.state;
 this.items =  payload.items.map(item => new Item(item))
 this.region = payload.region;
 this.next = payload.next || this.next;
 this.act = payload.act || this.act;
 // gameStateStore의 updateMyStatus를 사용해야 함
 }

 setNext(next:number){
  this.next = next
 } // 다음 이동 구역 설정

 setAct(act:Act){
  this.act = act
 } // 좀비 대처 행동 설정

 playNextTurn(item:Item){
  this.region = this.next
  this.next = Math.floor(Math.random()* get(totalRegions)) // 다음 구역으로 이동 및 다음 구역 무작위 설정
  this.items.push(item)
 } // 다음 턴 진행

}

export class Survivor{ // 생존자 정보
playerId: number;
state: PlayerState;
sameRegion: boolean;
nickname: string;

constructor(playerId:number, state:PlayerState, sameRegion: boolean){
    this.playerId = playerId
    this.state = state
    this.sameRegion = sameRegion
    this.nickname = nicknameList[playerId]
}

checkAndUpdateSurvivor(state:PlayerState){
    this.sameRegion = true
    this.state = state
} // 시야에 나타나서 업데이트

disappearSurvivor(){
    this.sameRegion = false
} // 시야에서 사라짐

updateData(Survivor: SurvivorInterface | undefined ){
    if (Survivor && Survivor.sameRegion) {
        this.checkAndUpdateSurvivor(Survivor.state)
        this.nickname = Survivor.nickname // 서버에서 받은 닉네임으로 업데이트
    }
    else this.disappearSurvivor()
}
}

type PlayerState = 'alive' | 'host' | `zombie` | `killed` | 'you' // 생존자 상태
type Act = `runaway` | `hide` | `lure` // 좀비 대처 행동


// 숙주 행동 객체
export class HostAct{
    infect: number | null
    canUseInfect: boolean
    zombieList: Zombie[]
    constructor(){
        this.infect = null
        this.canUseInfect = true
        this.zombieList = []
    }
    useInfect(playerId:number){ // 감염대상 세팅
        this.infect = playerId
    }
    selectZombieTarget(zombieId:number, playerId:number){ // 좀비 타겟 세팅
        this.zombieList[zombieId].targetId = playerId
    }
    setNextRegion(zombieId:number, regionId:number){ // 좀비 이동 세팅
        this.zombieList[zombieId].next = regionId
    }
    updateData(zombieList:Zombie[]){
        this.zombieList = zombieList
        // gameStateStore에서 업데이트 처리해야 함
    }
    playNextTurn(){
        let targetId = this.infect
        if (targetId){
            this.infect = null
            this.canUseInfect = false
        } else {
            this.canUseInfect = true
        } // 턴 넘길 때 감염시키기 기능 적용       
        
         this.zombieList.forEach(zombie => {
            if (zombie.leftTurn===0) {
                zombie.leftTurn=4
                zombie.region = zombie.next
                zombie.next = Math.floor(Math.random() * get(totalRegions))
            } 
            zombie.leftTurn = zombie.leftTurn - 1 // 좀비의 이동 관리
        })

        const targetList = this.zombieList.map(zombie => zombie.targetId) // 좀비의 공격대상 선정
        return {infectTarget:targetId, attackTarget:targetList}
    }

    
}

// 좀비 속성 관리
interface Zombie{
    playerId: number
    targetId: number
    next: number
    leftTurn: number
    region: number
}


// 게임용 닉네임 리스트 20개

// 플레이어 ID와 닉네임 매핑을 저장하는 Map
const playerNicknameMap = new Map<number, string>();

// 플레이어 닉네임 매핑 함수
export function setPlayerNicknames(players: {id: number, nickname: string}[]) {
    players.forEach(player => {
        playerNicknameMap.set(player.id, player.nickname);
    });
}

// 플레이어 ID로 닉네임 가져오기
export function getPlayerNickname(playerId: number): string {
    return playerNicknameMap.get(playerId) || `Unknown Player ${playerId}`;
}

// 지역 정보 관리
export class Region{
    chatLog: ChatMessage[];
    regionMessageList: RegionMessage[];

    constructor(){
        this.chatLog = []
        this.regionMessageList = []
    }

    updateData(chatLog:ChatMessage[], messageList:RegionMessage[]){
        this.chatLog = chatLog
        this.regionMessageList = messageList
        // gameStateStore에서 업데이트 처리해야 함
    }

    addMessage(message:RegionMessage){
        this.regionMessageList.push(message)
    } // 구역 낙서 추가
    
    eraseMessage(index:number){
        this.regionMessageList[index] = null
    } // 구역 낙서 지우기

    showRegionMessage(){
       return this.regionMessageList.map(message => message === null ? '지워진 낙서입니다': message)
    }
}

interface ChatMessage{
    system: boolean
    message: string
    timeStamp: Date
} // 채팅메세지 형식

type RegionMessage = string | null // 구역 메세지 형식

export const nicknameList = [`자책하는두더지`, `말많은다람쥐`, `웃는얼굴의하마`, `엿듣는호랑이`, `눈치빠른고양이`, `조용한여우`, `겁많은토끼`, `고집센너구리`, `유난떠는수달`, `낙서많은부엉이`, `분위기타는족제비`, `장난기있는펭귄`, `침착한판다`, `의심많은고슴도치`, `폭로하는까마귀`, `살금살금곰`, `혼잣말하는늑대`, `사람좋은삵`, `침묵하는도롱뇽`, `거짓말하는수리부엉이`]
