import { get, writable } from "svelte/store";
import chatLog from '../../common/message/chatLog.json';
import regionLog from '../message/regionLog.json'
import regionName from '../message/regionName.json'
import { closeMessageBox, isOpen, showMessageBox } from "../messagebox/customStore";
import type { Survivor } from "../../page/game/game.type";

import survivorData from '../../common/message/survivorList.json';
import { eraser, spray, vaccineMaterialA, vaccineMaterialB, virusChecker, wireless, type Item } from "../itemFunction/itemObject";

const survivorList: Survivor[][] = survivorData as unknown as Survivor[][];


interface chatMessage {
  content: string;
  system: boolean;
}

const wholeChatLog: chatMessage[][] = chatLog;
const wholeInfoLog: string[][] = regionLog;
const wholeRegionName: string[] = regionName;
const wholeitemList: Item[] = [ spray, vaccineMaterialB]

const itemAddList: Item[] = [vaccineMaterialA, virusChecker, eraser, wireless]


export const nextTurnSeconds = writable(180); // 남은 시간

export const turnCount = writable(30); // 현재 진행중인 턴수

export const nowChatLog = writable<chatMessage[]>(wholeChatLog[get(turnCount)-30]); // 채팅 로그

export const nowRegionInfo = writable<string[]>(wholeInfoLog[get(turnCount)-30]); // 현재 구역 정보

export const nowRegionName = writable<string>(wholeRegionName[get(turnCount)-30]); // 현재 구역 이름

wholeitemList.push(itemAddList[get(turnCount)-30]); // 턴마다 아이템 추가
export const nowItemList = writable<Item[]>(wholeitemList); // 현재 아이템 목록

export const survivor = writable<Survivor[]>(survivorList[get(turnCount)-30])

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startCountdown() {
  if (intervalId !== null) return; // 이미 실행 중이면 무시
  intervalId = setInterval(() => {
    const current = get(nextTurnSeconds);
    if (current <= 0) {
      nextTurn()
    } else {
      nextTurnSeconds.set(current - 1);
    }
  }, 1000);
}

export function pauseCountdown() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function nextTurn() {
  if (get(turnCount)<34 && !get(isOpen)){
  showMessageBox("loading","다음 턴","다음 턴으로 넘어갑니다")
  nextTurnSeconds.set(180);
  turnCount.update(n => n+1)
  nowChatLog.set(wholeChatLog[get(turnCount)-30])
  nowRegionInfo.set(wholeInfoLog[get(turnCount)-30])
  nowRegionName.set(wholeRegionName[get(turnCount)-30])
  survivor.set(survivorList[get(turnCount)-30])
  nowItemList.update(n => [...n, itemAddList[get(turnCount)-30]])

  setTimeout(() => closeMessageBox(), 1000)
}}

