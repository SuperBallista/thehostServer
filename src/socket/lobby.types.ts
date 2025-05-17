export interface Room {
  id: string;
  name: string;
  hostUserId: number;
  players: userShortInfo[];
  date: string      
}

export interface userShortInfo{
nickname: string;
id: number;
}