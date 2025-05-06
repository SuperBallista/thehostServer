export interface Room {
  id: string;
  name: string;
  hostUserId: number;
  players: userShortInfo[];      
}

export interface userShortInfo{
nickname: string;
id: number;
}