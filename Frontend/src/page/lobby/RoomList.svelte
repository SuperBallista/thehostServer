<script lang="ts">
    import { onMount } from 'svelte';
    import { THEME } from '../../common/constant/theme';
    import { rooms, onJoinRoom, getRoomList, listenRoomListUpdates } from './lobbyStore'
    import { awaitSocketReady } from '../../common/utils/awaitSocketReady';
    import { get } from 'svelte/store';

    onMount(async ()=>{
    await awaitSocketReady()
    await listenRoomListUpdates()
    await getRoomList(1);
    setTimeout(() => {
    console.log('🧪 get(rooms):', get(rooms));
  }, 1000); // emit async 대응
})
  
  
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
  