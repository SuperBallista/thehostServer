<script lang="ts">
  import { THEME } from '../../../common/constant/theme';
  import { survivorList, playerId, myStatus } from '../../../common/store/gameStore';
  import { nicknameList, type Survivor } from '../game.type';

  export let isOpen: boolean = false;
  export let alwaysVisible: boolean = false;
  export let onClose: () => void = () => {};
  
  let survivorListHTML:HTMLElement

  // 모든 플레이어 목록 (나 포함)
  $: allPlayers = [
    ...$survivorList,
    // 내 정보가 survivorList에 없으면 추가
    ...($myStatus && !$survivorList.some(s => s.playerId === $playerId) 
      ? [{
          playerId: $playerId || 0,
          state: 'you' as const,
          sameRegion: true
        }] 
      : [])
  ];

  function getClass(player: Survivor | {playerId: number, state: string, sameRegion: boolean}): string {
    let result:string = ''
    
    // 내 캐릭터인 경우
    if (player.playerId === $playerId) {
      result = THEME.textAccent;
    }
    
    // 사망한 경우
    if (player.state === 'killed') {
      result = `line-through`;
    }
    
    // 같은 구역에 없는 경우 (내가 아닌 경우만)
    if (player.playerId !== $playerId && !player.sameRegion) {
      result = result + ` ${THEME.textTertiary} italic`;
    }
    
    // 같은 구역의 좀비인 경우
    if (player.state === 'zombie' && player.sameRegion) {
      result = THEME.textWarning;
    }
    
    if (result==='') result = THEME.textPrimary;
    return result
  }

  function getStatusText(state: string): string {
    switch(state) {
      case 'you': return '나';
      case 'alive': return '생존자';
      case 'host': return '숙주';
      case 'zombie': return '좀비';
      case 'dead': return '사망';
      default: return '알 수 없음';
    }
  }
</script>



<!-- ✅ 데스크탑: 항상 보이는 패널 -->
{#if alwaysVisible}
<div bind:this={survivorListHTML} class="hidden md:block p-2">

    <h2 class="text-lg font-bold mb-2">👥 생존자 정보</h2>
    <ul class="space-y-1 text-sm">
      {#each allPlayers as player}
        <li class={getClass(player)}>
          { nicknameList[player.playerId] } 
          ({player.playerId === $playerId ? '나' : getStatusText(player.state)})
        </li>
      {/each}
    </ul>
  </div>

<!-- ✅ 모바일: 모달로 등장 -->
{:else if isOpen}


  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={onClose}>
    <div
      class={`w-72 p-4 ${THEME.bgTertiary} ${THEME.textWhite} ${THEME.roundedDefault} ${THEME.shadow}`}
      on:click|stopPropagation
    >
      <h2 class="text-lg font-bold mb-2">👥 생존자 정보</h2>
      <ul class="space-y-1 text-sm">
        {#each allPlayers as player}
          <li class={getClass(player)}>
            { nicknameList[player.playerId] } 
            ({player.playerId === $playerId ? '나' : getStatusText(player.state)})
          </li>
        {/each}
      </ul>
      <button
        class={`mt-4 w-full py-2 ${THEME.bgDisabled} ${THEME.textWhite} ${THEME.roundedDefault}`}
        on:click={onClose}
      >
        닫기
      </button>
    </div>
  </div>
{/if}
