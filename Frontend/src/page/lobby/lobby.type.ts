export interface Room {
    id: string;
    name: string;
    hostUserId: string;
    players: playerShortInfo[]
  };

export interface playerShortInfo{
nickname: string;
id: number;
}

