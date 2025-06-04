export interface Room {
  id: string;
  name: string;
  hostUserId: number;
  players: userShortInfo[];
  date: string;
  bot: boolean;      
}

export interface userShortInfo{
nickname: string;
id: number;
}