import { writable } from 'svelte/store';
import type { Room } from './lobby.type';
import { showMessageBox } from '../../common/messagebox/customStore';
import { currentRoom, locationState, pageStore } from '../../common/store/pageStore';
import { awaitSocketReady } from '../../common/utils/awaitSocketReady';


export const rooms = writable<Room[]>([])

export async function getRoomList(page: number = 1) {
  const socket = await awaitSocketReady();

  socket.emit('lobby:getRoomList', { page });
}

export async function listenRoomListUpdates() {
  const socket = await awaitSocketReady();

  socket.off('lobby:roomList');
  socket.on('lobby:roomList', (roomList) => {
    console.log(roomList)
    rooms.set(roomList);  
  });
}


export async function onJoinRoom(roomId: string) {
  const socket = await awaitSocketReady();

  // 서버에 위치 상태 먼저 등록
  socket.emit('location:update', {
    state: 'room',
    roomId,
  });

  // 방 입장 요청 (roomId 명시적으로 같이 전송)
  socket.emit('lobby:joinRoom', { roomId }, (roomData: Room | null) => {
    if (roomData) {
      currentRoom.set(roomData);
      locationState.set('room');
      pageStore.set('room');
    } else {
      console.warn('❌ 방 입장 실패: 방 정보를 받아오지 못했습니다.');
      showMessageBox('error', '방 입장 실패', '해당 방에 입장할 수 없습니다.');
    }
  });
}



export async function makeRoom() {

  const socket = await awaitSocketReady()

  // ⚠ 리스너를 emit 전에 먼저 등록
    socket.off('roomCreated'); // 중복 방지
    socket.on('roomCreated', (room: Room) => {
      currentRoom.set(room);
      locationState.set('room');
      pageStore.set('room');
    });
  
    const userResponse = await showMessageBox(
      'input',
      '방 생성하기',
      '방 이름을 지정해주세요',
      undefined,
      [{ key: 'name', label: ' ', placeholder: '여기에 방제목을 입력하세요' }]
    );
  
    if (userResponse.success) {
      const roomName = userResponse.values?.name || '빠른 게임방';
      socket.emit('createRoom', { name: roomName });
    }
    else {
        socket.off('roomCreated');
    }
  }



