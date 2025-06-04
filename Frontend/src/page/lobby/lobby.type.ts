export interface Room {
    id: string;
    name: string;
    hostUserId: string;
    players: playerShortInfo[];
    bot: boolean
  };

export interface playerShortInfo{
nickname: string;
id: number;
}

