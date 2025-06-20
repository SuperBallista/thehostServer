import { get } from "svelte/store";
import { awaitSocketReady } from "../utils/awaitSocketReady";
import { currentRoom } from "./pageStore";
import { closeMessageBox, showMessageBox } from "../messagebox/customStore";
import { authStore } from "./authStore";
import type { userRequest } from "./synchronize.type";

export async function reloadRoomInfo() {
  const socket = await awaitSocketReady();
  const roomId = get(currentRoom)?.id;
  
  if (!roomId) return;
  
  const token = get(authStore).token;
  const user = get(authStore).user;
  
  if (!token || !user) {
    showMessageBox('error', '인증 오류', '다시 로그인해주세요');
    return;
  }
  
  const requestData: userRequest = {
    token,
    user,
    joinRoom: roomId
  };
  
  socket.emit('request', requestData);
}

export async function leaveRoom(message: string) {
  showMessageBox('loading', '로비 이동', message);
  
  const socket = await awaitSocketReady();
  const token = get(authStore).token;
  const user = get(authStore).user;
  
  if (!token || !user) {
    showMessageBox('error', '인증 오류', '다시 로그인해주세요');
    return;
  }
  
  const requestData: userRequest = {
    token,
    user,
    exitRoom: true
  };
  
  socket.emit('request', requestData);
  
  // 서버 응답을 기다리지 않고 바로 상태 변경하지 않음
  // update 이벤트로 서버에서 확인 후 변경하도록 함
}

export async function startGame() {
  const roomData = get(currentRoom);
  if (!roomData) {
    showMessageBox('error', '오류', '방 정보를 찾을 수 없습니다');
    return;
  }

  // 방장 권한 확인
  const currentUser = get(authStore).user;
  if (roomData.hostUserId !== currentUser?.id) {
    showMessageBox('error', '권한 없음', '방장만 게임을 시작할 수 있습니다');
    return;
  }

  // 최소 인원 확인 (봇이 비활성화된 경우)
  if (!roomData.bot && roomData.players.length < 3) {
    showMessageBox('error', '인원 부족', '최소 3명 이상이어야 게임을 시작할 수 있습니다');
    return;
  }

  showMessageBox('loading', '게임 시작', '게임을 시작합니다...');
  
  const socket = await awaitSocketReady();
  const token = get(authStore).token;
  const user = get(authStore).user;
  
  if (!token || !user) {
    showMessageBox('error', '인증 오류', '다시 로그인해주세요');
    return;
  }
  
  const requestData: userRequest = {
    token,
    user,
    gameStart: true
  };
  
  socket.emit('request', requestData);
  
  closeMessageBox();
}

export async function handleBotSetting() {
  const roomData = get(currentRoom);
  const currentUser = get(authStore).user;
  
  if (!roomData || !currentUser) return;
  
  // 방장 권한 확인
  if (roomData.hostUserId !== currentUser.id) {
    showMessageBox('error', '권한 없음', '방장만 봇 설정을 변경할 수 있습니다');
    return;
  }
  
  // 봇 설정 토글 (현재는 클라이언트에서만 상태 변경)
  // TODO: 백엔드에 봇 설정 변경 API 추가 필요
  const newBotSetting = !roomData.bot;
  const updatedRoom = { ...roomData, bot: newBotSetting };
  currentRoom.set(updatedRoom);
  
  const socket = await awaitSocketReady();
  const token = get(authStore).token;
  const user = get(authStore).user;
  if (!token || !user) {
    showMessageBox('error', '인증 오류', '다시 로그인해주세요');
    return;
  }

  const requestData: userRequest = {
    token,
    user,
    room: updatedRoom
   }
  socket.emit('request', requestData)
    
  showMessageBox('alert', '설정 변경', `봇 채우기가 ${newBotSetting ? '활성화' : '비활성화'}되었습니다`);
}