<script lang="ts">
    import { THEME } from "../../../common/constant/theme";
    import { showSelectOptionBox } from '../../../common/store/selectOptionStore';
    import { isHost, zombies, canInfect, myStatus, regionNames, hasZombieInMyRegion } from '../../../common/store/gameStateStore';
    import { socketStore } from '../../../common/store/socketStore';
    import { authStore } from '../../../common/store/authStore';
    import { get } from 'svelte/store';
    import type { userRequest, MyPlayerState } from '../../../common/store/synchronize.type';
    import { copeWithZombie, infectPlayer, controlZombie } from '../common/gameActions';
    
    // 디버깅용 로그
    $: console.log('ActionModal 상태:', {
        isHost: $isHost,
        canInfect: $canInfect,
        zombiesLength: $zombies.length
    });

    // copeWithZombie 함수는 이제 gameActions에서 import하여 사용

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
            state: currentStatus.state,
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

    export let isOpen = false

  </script>
  {#if isOpen}
    <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div class={`${THEME.bgTertiary} p-4 rounded-lg w-3/4 max-w-md shadow-md`}>
        <h2 class="text-lg text-purple-400 mb-2">🧭 행동 선택</h2>
        <div class="space-y-2">
          <button 
            class={`block w-full py-2 rounded ${THEME.bgAccent} hover:${THEME.bgAccentHover} ${THEME.textWhite}`}
            on:click={moveNextRegion}>
            다음 턴 이동 장소 설정
          </button>
          <button 
            class={`block w-full py-2 rounded ${$hasZombieInMyRegion && $myStatus?.state !== 'host' ? `${THEME.bgAccent} hover:${THEME.bgAccentHover} ${THEME.textWhite}` : `${THEME.bgDisabled} ${THEME.textSecondary}`}`}
            on:click={() => {
              if ($hasZombieInMyRegion && $myStatus?.state !== 'host') {
                copeWithZombie();
              }
            }}
            disabled={!$hasZombieInMyRegion || $myStatus?.state === 'host'}
          >좀비 대처 행동</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $canInfect ? `${THEME.bgAccent} hover:${THEME.bgAccentHover} ${THEME.textWhite}` : `${THEME.bgDisabled} ${THEME.textSecondary}`}`}
            on:click={infectPlayer}
            disabled={!$isHost || !$canInfect}
          >감염시키기</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $zombies.length > 0 ? `${THEME.bgAccent} hover:${THEME.bgAccentHover} ${THEME.textWhite}` : `${THEME.bgDisabled} ${THEME.textSecondary}`}`}
            on:click={controlZombie}
            disabled={!$isHost || $zombies.length === 0}
          >좀비 제어하기</button>
        </div>
        <button class={`mt-4 px-3 py-1 text-white rounded ${THEME.bgSecondary}`}
          on:click={() => isOpen = false}>
          닫기
        </button>
      </div>
    </div>
{/if}  
