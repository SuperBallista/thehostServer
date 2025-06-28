<script lang="ts">
  import { THEME } from '../../../common/constant/theme';
  import { playerId } from '../../../common/store/playerStore';
  import { myStatus, otherPlayers } from '../../../common/store/gameStateStore';
  import { nicknameList, type Survivor } from '../game.type';

  export let isOpen: boolean = false;
  export let alwaysVisible: boolean = false;
  export let onClose: () => void = () => {};
  
  let survivorListHTML:HTMLElement

  // 모든 플레이어 목록 (나 포함)
  $: allPlayers = (() => {
    const players = Array.from($otherPlayers.values()).map(p => ({
      ...p,
      sameRegion: p.region === $myStatus?.region
    }));
    
    // 내 정보 추가 (중복 방지)
    if ($myStatus && !players.some(p => p.playerId === $myStatus.playerId)) {
      players.push({
        playerId: $myStatus.playerId,
        state: 'you' as const,
        sameRegion: true,
        nickname: $myStatus.nickname,
        region: $myStatus.region,
        nextRegion: $myStatus.nextRegion,
        act: $myStatus.act,
        items: $myStatus.items
      });
    }
    
    // playerId로 정렬하여 일관된 순서 유지
    return players.sort((a, b) => a.playerId - b.playerId);
  })();

  // 플레이어 상태에 따른 클래스 결정
  function getPlayerClass(player: any): string {
    // 내 캐릭터
    if (player.playerId === $playerId) return THEME.textAccent;
    
    // 사망한 경우
    if (player.state === 'killed') return `line-through ${THEME.textTertiary}`;
    
    // 같은 구역의 좀비
    if (player.state === 'zombie' && player.sameRegion) return THEME.textWarning;
    
    // 같은 구역에 없는 경우
    if (!player.sameRegion) return `${THEME.textTertiary} italic`;
    
    // 기본 (생존자)
    return THEME.textPrimary;
  }

  function getStatusText(state: string): string {
    switch(state) {
      case 'you': return '나';
      case 'alive': return '생존자';
      case 'host': return '숙주';
      case 'zombie': return '좀비';
      case 'killed': return '사망';
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
        <li class={getPlayerClass(player)}>
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
          <li class={getPlayerClass(player)}>
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
