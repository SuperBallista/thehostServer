import { writable, derived } from 'svelte/store';
import { playerRegion } from './playerStore';
import type { ChatMessage, ItemInterface } from './synchronize.type';

// 채팅 메시지
export const chatMessages = writable<ChatMessage[]>([]);

// 구역 메시지 인터페이스
interface RegionMessage {
  message: string;
  region: number;
  isErased?: boolean;
}

export const regionMessages = writable<RegionMessage[]>([]);

// 무전기 연결
export interface WirelessConnection {
  fromPlayerId: number;
  toPlayerId: number;
  active: boolean;
}

export const wirelessConnections = writable<WirelessConnection[]>([]);

// 마이크 메세지
export interface MicrophoneMessage {
  message: string;
  timeStamp: Date
}

// 현재 지역의 메시지만 필터링하는 파생 스토어
export const currentRegionMessages = derived(
  [regionMessages, playerRegion],
  ([$regionMessages, $playerRegion]) => {
    return $regionMessages.filter(msg => msg.region === $playerRegion);
  }
);

// 채팅 관련 함수들
export function addChatMessage(message: ChatMessage) {
  const newMessage = {
    ...message,
    id: `${Date.now()}-${Math.random()}`,
    timestamp: new Date()
  };
  chatMessages.update(messages => [...messages, newMessage]);
}

export function addRegionMessage(message: string, region: number) {
  regionMessages.update(messages => [...messages, { message, region, isErased: false }]);
}

export function eraseRegionMessage(messageIndex: number) {
  regionMessages.update(messages => {
    const newMessages = [...messages];
    if (newMessages[messageIndex]) {
      newMessages[messageIndex] = { ...newMessages[messageIndex], isErased: true };
    }
    return newMessages;
  });
}

// 채팅 초기화
export function resetChatState() {
  chatMessages.set([]);
  regionMessages.set([]);
  wirelessConnections.set([]);
}