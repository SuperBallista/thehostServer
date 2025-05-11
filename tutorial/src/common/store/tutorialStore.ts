import { writable } from "svelte/store";
import chatLog from '../../common/message/chatLog.json';
import regionLog from '../message/regionLog.json'

interface chatMessage {
  content: string;
  system: boolean;
}

// chatLog는 실제로 chatMessage[][] 이므로 타입을 맞춰줍니다
const wholeChatLog: chatMessage[][] = chatLog;
const wholeInfoLog: string[][] = regionLog

// 그 중 첫 묶음을 nowChatLog로 쓰고 싶다면:
export const nowChatLog = writable<chatMessage[]>(wholeChatLog[0]);

export const nowRegionInfo = writable<string[]>(wholeInfoLog[0])