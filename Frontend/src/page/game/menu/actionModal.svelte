<script lang="ts">
    import { THEME } from "../../../common/constant/theme";
    import { showSelectOptionBox } from '../../../common/store/selectOptionStore';
    import { isHost, zombies, canInfect, myStatus, regionNames } from '../../../common/store/gameStateStore';
    import { socketStore } from '../../../common/store/socketStore';
    import { authStore } from '../../../common/store/authStore';
    import { get } from 'svelte/store';
    import type { userRequest } from '../../../common/store/synchronize.type';
    
    // 디버깅용 로그
    $: console.log('ActionModal 상태:', {
        isHost: $isHost,
        canInfect: $canInfect,
        zombiesLength: $zombies.length
    });

    async function copeWithZombie() {
      const result = await showSelectOptionBox(
        '좀비를 만났습니다',
        '좀비에게 어떤 행동을 하시겠습니까?',
        [
          { value: 'hide', label: '숨기(좀비가 쫓아올 때 죽을 수 있지만 다른 생존자의 유인 도움을 받으면 생존)' },
          { value: 'lure', label: '유인(다른 생존자를 도울 수 있지만 좀비가 직접 쫓아올 경우 죽게 됨)' },
          { value: 'escape', label: '도주(아무도 돕지 않고 도망가서 무조건 생존하나 연속 선택 불가)' }
        ]
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
          <button class={`block w-full py-2 rounded ${THEME.bgDisabled} ${THEME.textSecondary}`}>좀비 대처 행동</button>
          <button 
            class={`block w-full py-2 rounded ${$isHost && $canInfect ? `${THEME.bgAccent} hover:${THEME.bgAccentHover} ${THEME.textWhite}` : `${THEME.bgDisabled} ${THEME.textSecondary}`}`}
            on:click={() => {
              console.log('감염시키기 클릭:', { isHost: $isHost, canInfect: $canInfect });
              if ($isHost && $canInfect) {
                // TODO: 감염시키기 기능 구현
                console.log('감염시키기 실행 가능');
              }
            }}
            disabled={!$isHost || !$canInfect}
          >감염시키기</button>
          <button class={`block w-full py-2 rounded ${$isHost && $zombies.length > 0 ? `${THEME.bgAccent} hover:${THEME.bgAccentHover} ${THEME.textWhite}` : `${THEME.bgDisabled} ${THEME.textSecondary}`}`}>좀비의 공격 대상 정하기</button>
          <button class={`block w-full py-2 rounded ${$isHost && $zombies.length > 0 ? `${THEME.bgAccent} hover:${THEME.bgAccentHover} ${THEME.textWhite}` : `${THEME.bgDisabled} ${THEME.textSecondary}`}`}>좀비의 이동 구역 정하기</button>
        </div>
        <button class={`mt-4 px-3 py-1 text-white rounded ${THEME.bgSecondary}`}
          on:click={() => isOpen = false}>
          닫기
        </button>
      </div>
    </div>
{/if}  
