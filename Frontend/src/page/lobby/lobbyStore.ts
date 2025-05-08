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


export async function onJoinRoom(roomId:string) {
    
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



