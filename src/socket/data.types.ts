import { State } from "./payload.types";

export interface LocationState{
  state: State;
  roomId?: string;
}

export interface userShortInfo{
nickname: string;
id: number;
}
