
export class Game {
gameId: string;
turn: number;
hostId: string;
message: message[];
action: action[];

constructor(gameId, hostId){
    this.gameId = gameId;
    this.turn = 1;
    this.hostId = hostId
    this.message = []
    this.action = []
}

}

export interface userInfo {


}

export interface message{
    message: string
    timeStamp: Date
}

export interface action{
    turn: number
    playerId: number
    action: string
    timeStamp: Date
}