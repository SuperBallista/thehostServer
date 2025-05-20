import { get, writable } from 'svelte/store';
import type { Room } from './lobby.type';
import { showMessageBox } from '../../common/messagebox/customStore';
import { currentRoom, lobbyPage, locationState, pageStore } from '../../common/store/pageStore';
import { awaitSocketReady } from '../../common/utils/awaitSocketReady';


export const rooms = writable<Room[]>([])

export async function getRoomList(page: number = 1) {
  const socket = await awaitSocketReady();

  const response = new Promise<Room[]>((resolve, reject) => {
    socket.timeout(5000).emit(
      'request:room:list',
      { page },
      (err: any, roomList: Room[]) => {
        if (err) return reject(err);
        resolve(roomList);
      }
    );
  });
rooms.set(await response)
return response;
}


export async function listenRoomListUpdates() {
  const socket = await awaitSocketReady();
  socket.off('update:room:list');
  socket.on('update:room:list', async() => await getRoomList(get(lobbyPage)));
}

export async function onJoinRoom(roomId: string) {
  const socket = await awaitSocketReady();

  socket.emit('request:location:update', {
    state: 'room',
    roomId,
  });

  socket.emit('request:room:join', { roomId }, (roomData: Room | null) => {
    if (roomData) {
      currentRoom.set(roomData);
      locationState.set('room');
      pageStore.set('room');
    } else {
      showMessageBox('error', '방 입장 실패', '해당 방에 입장할 수 없습니다.');
    }
  });
}



export async function makeRoom() {
  const socket = await awaitSocketReady();

  socket.off('update:room:create');
  socket.on('update:room:create', (room: Room) => {
    currentRoom.set(room);
    locationState.set('room');
    pageStore.set('room');
  });

  const userResponse = await showMessageBox(
    'input',
    '방 생성하기',
    '방 이름을 지정해주세요',
    undefined,
    [{ key: 'name', label: ' ', placeholder: '방 제목 입력' }]
  );

  if (userResponse.success) {
    const roomName = userResponse.values?.name || '빠른 게임방';
    socket.emit('request:room:create', { name: roomName });
  } else {
    socket.off('update:room:create');
  }
}

