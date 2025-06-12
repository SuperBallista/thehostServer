export interface Room {
    id: string;
    name: string;
    hostUserId: number;
    players: playerShortInfo[];
    bot: boolean
  };

export interface playerShortInfo{
nickname: string;
id: number;
}

