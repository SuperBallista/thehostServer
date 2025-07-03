<script lang="ts">
    import { onMount } from 'svelte';
    import { THEME } from '../../common/constant/theme';
    import { rooms, onJoinRoom, getRoomList} from '../../common/store/lobbyStore'
    import { awaitSocketReady } from '../../common/utils/awaitSocketReady';
    import { get } from 'svelte/store';
    import { currentRoom, lobbyPage, locationState, pageStore } from '../../common/store/pageStore';
    import { roomId } from '../../common/store/socketStore';
    import { showMessageBox } from '../../common/messagebox/customStore';

    onMount(async () => {
      try {
        await awaitSocketReady();
        await getRoomList($lobbyPage);
        await moveToBeforePage();
        setTimeout(() => {
          console.log('🧪 get(rooms):', get(rooms));
        }, 1000); // emit async 대응
      } catch (error) {
        console.error('RoomList 초기화 실패:', error);
      }
    });

    async function moveToBeforePage() {
      if (($pageStore !== 'room' && $pageStore !== 'game')&& $roomId !== null) {
        locationState.set('lobby')
        currentRoom.set(null)
      } else if ($pageStore === 'room' && $roomId !== null){
        locationState.set('room')
      } else if ($pageStore === 'game' && $roomId !== null){
        locationState.set('game')
      } else if ($locationState !== 'lobby' && $roomId !== null) {
        locationState.set("lobby")
        pageStore.set('lobby')
        showMessageBox('error', '방 정보 오류', '방 정보가 없어 로비로 이동합니다')
      }    
    } 
</script>
  
<div class="mt-8 w-full max-w-3xl space-y-3">
  {#if $rooms.length === 0}
    <div class={`${THEME.textSecondary} text-sm text-center py-6`}>
      현재 참여 가능한 방이 없습니다.
    </div>
  {:else}
    {#each $rooms as room (room.id)}
      <div class={`flex items-center justify-between px-4 py-3 ${THEME.bgSecondary} ${THEME.roundedDefault} ${THEME.shadow} hover:${THEME.bgTertiary} transition`}>
        <div>
          <p class={`${THEME.textWhite} font-medium`}>{room.id}</p>
          <p class={`${THEME.textTertiary} text-sm`}>
            인원: {room.players.length} / 20
          </p>
        </div>
        <button
          on:click={() => onJoinRoom(room.id)}
          class={`${THEME.textAccentStrong} text-sm underline hover:font-semibold`}
        >
          참가
        </button>
      </div>
    {/each}
  {/if}
</div>
  