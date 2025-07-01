<script lang="ts">
    import { THEME } from "../../../common/constant/theme";
    import { showSelectOptionBox } from "../../../common/store/selectOptionStore";
    import { myStatus, isHost, canInfect, zombies, regionNames, playersInMyRegion } from '../../../common/store/gameStateStore';
    import { socketStore } from '../../../common/store/socketStore';
    import { authStore } from '../../../common/store/authStore';
    import { currentRoom } from '../../../common/store/pageStore';
    import { get } from 'svelte/store';
    import type { ItemInterface, userRequest, PlayerState } from '../../../common/store/synchronize.type';
    import { itemList } from '../common/itemObject';
    import { showMessageBox } from '../../../common/messagebox/customStore';
    import { musicStore, toggleMusic } from '../../../common/store/musicStore';
    import { nicknameList } from '../game.type';
    import { selectPlayerMessageBox } from '../../../common/store/selectPlayerMessageBox';

  let inventory:HTMLElement
  let action:HTMLElement
  let skip:HTMLElement
  

  let openSection: 'inventory' | 'action' | null = null;
  const toggle = (section: typeof openSection) => {
    openSection = openSection === section ? null : section;
  };

  function showItemInfo(item: ItemInterface) {
    showMessageBox(
      'tips',
      itemList[item].name,
      itemList[item].info,
      undefined,
      undefined,
      `/img/items/${item}.jpg`
    );
  }



async function moveNextRegion() {
  // 지역 이름 배열을 사용하여 선택지 생성
  const regions = $regionNames.map((name, index) => ({
    value: index.toString(),
    label: name
  }));

  const result = await showSelectOptionBox(
    '이동지역 선택',
    '다음 지역은 어디로 이동하시겠습니까?',
    regions
  );

  if (result && result.value) {
    // 선택한 지역을 서버로 전송
    const socket = get(socketStore);
    const token = get(authStore).token;
    const user = get(authStore).user;
    const currentStatus = get(myStatus);

    if (!socket || !token || !user || !currentStatus) return;

    const selectedRegion = parseInt(result.value); // result.value를 사용
    console.log('선택한 지역:', { result, selectedRegion, regionName: $regionNames[selectedRegion] });

    const requestData: userRequest = {
      token,
      user,
      myStatus: {
        state: (currentStatus.state === 'infected' ? 'alive' : currentStatus.state) as PlayerState,
        items: currentStatus.items,
        region: currentStatus.region,
        next: selectedRegion, // 선택한 지역 번호
        act: currentStatus.act
      }
    };

    socket.emit('request', requestData);
    console.log('서버로 전송:', requestData);
  }
}

async function giveItem(item: ItemInterface) {
  // 같은 지역에 있는 생존자들만 필터링
  const playersInRegion = get(playersInMyRegion);
  
  if (!playersInRegion || playersInRegion.length === 0) {
    await showMessageBox(
      'error',
      '알림',
      '같은 지역에 다른 생존자가 없습니다.'
    );
    return;
  }

  // PlayerStatus를 Survivor 형태로 변환
  const survivors = playersInRegion.map(player => ({
    playerId: player.playerId,
    state: (player.state === 'host' || player.state === 'infected') ? 'alive' : player.state, // host와 infected를 alive로 표시
    sameRegion: true, // 이미 같은 지역 플레이어만 필터링됨
    nickname: nicknameList[player.playerId] || `플레이어${player.playerId}`,
    // Survivor 클래스의 메서드들은 필요없으므로 생략
    checkAndUpdateSurvivor: () => {},
    disappearSurvivor: () => {},
    updateData: () => {}
  }));

  try {
    // 플레이어 선택 모달 표시
    const selectedPlayer = await selectPlayerMessageBox(
      '아이템 전달',
      `${itemList[item].name}을(를) 전달할 생존자를 선택하세요.`,
      survivors,
      `/img/items/${item}.jpg`
    );

    if (selectedPlayer) {
      // 서버로 아이템 전달 요청
      const socket = get(socketStore);
      const token = get(authStore).token;
      const user = get(authStore).user;
      const currentStatus = get(myStatus);

      if (!socket || !token || !user || !currentStatus) return;

      console.log('아이템 전달:', { 
        item, 
        targetPlayer: selectedPlayer.playerId,
        targetNickname: selectedPlayer.nickname 
      });

      const room = get(currentRoom);
      
      const requestData: userRequest = {
        token,
        user,
        giveItem: {
          item: item,
          receiver: selectedPlayer.playerId
        },
        roomId: room?.id || ''
      };

      socket.emit('request', requestData);
      console.log('서버로 아이템 전달 요청:', requestData);
    }
  } catch (error) {
    // 사용자가 취소한 경우
    console.log('아이템 전달 취소');
  }
}

</script>

<div class="flex flex-col gap-y-2">
  <!-- 🎒 가방 -->
  <div bind:this={inventory}>
    <button class="w-full text-left px-4 py-2 font-semibold" on:click={() => toggle('inventory')}>🎒 가방</button>
    {#if openSection === 'inventory'}
      <div class="pl-6 mt-1 space-y-1 text-sm flex flex-col">
        {#if $myStatus?.items && $myStatus.items.length > 0}
          {#each $myStatus.items as item}
            <div class="flex items-center justify-between bg-gray-700 p-2 rounded">
              <div class="text-white font-medium">{itemList[item].name}</div>
              <div class="flex gap-1">
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`} on:click={() => showItemInfo(item)}>안내</button>
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgAccent}`}>사용</button>
                <button class={`px-2 py-1 text-white rounded text-sm ${THEME.bgSecondary}`} on:click={() => giveItem(item)}>주기</button>
              </div>
            </div>
          {/each}
        {:else}
          <p class="text-gray-400 text-center py-2">아이템이 없습니다.</p>
        {/if}
      </div>
    {/if}
  </div>

  <!-- 🧭 행동 -->
  <div>
    <button bind:this={action} class="w-full text-left px-4 py-2 font-semibold" on:click={() => toggle('action')}>🧭 행동</button>
      <div class="pl-6 mt-1 space-y-1 text-sm flex flex-col">
        <button on:click={() => moveNextRegion()} class={`block w-full py-2 rounded ${THEME.bgAccent}`}>다음 턴 이동 장소 설정</button>
          <button class={`block w-full py-2 rounded ${THEME.bgDisabled}`}>좀비 대처 행동</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $canInfect ? THEME.bgAccent : THEME.bgDisabled}`}
            disabled={!$isHost || !$canInfect}
          >감염시키기(숙주 전용)</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $zombies.length > 0 ? THEME.bgAccent : THEME.bgDisabled}`}
            disabled={!$isHost || $zombies.length === 0}
          >좀비의 공격 대상 정하기(숙주 전용)</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $zombies.length > 0 ? THEME.bgAccent : THEME.bgDisabled}`}
            disabled={!$isHost || $zombies.length === 0}
          >좀비의 이동 구역 정하기(숙주 전용)</button>
      </div>
  <!-- ⏭️ 넘기기 -->
  <div bind:this={skip} class="mt-4">

    <button class="w-full text-left px-4 py-2 font-semibold">
      ⏭️ 넘기기
    </button>
      <button class="w-full ${THEME.textAccent} text-left px-4 py-2 font-semibold">🚪 나가기</button>
      
      <!-- 음악 토글 버튼 -->
      <button 
        class={`w-full text-left px-4 py-2 font-semibold ${$musicStore.isPlaying ? THEME.textAccent : THEME.textSecondary}`}
        on:click={toggleMusic}
      >
        {$musicStore.isPlaying ? '🔊' : '🔇'} 배경음악 {$musicStore.isPlaying ? 'ON' : 'OFF'}
      </button>
</div>
</div>
</div>