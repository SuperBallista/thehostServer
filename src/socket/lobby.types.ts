export interface Room {
  id: string;
  name: string;
  hostUserId: number;
  players: userShortInfo[];
  date: Date;
  bot: boolean;      
}

export interface userShortInfo{
nickname: string;
id: number;
}


export interface LocationState{
  state: `lobby` | `room` | `host` | `game`;
  roomId?: string;
}