<script lang="ts">
  import RegionInfo from './regionInfo.svelte';
  import SurvivorModal from './survivorModal.svelte';
  import ChatLog from './chatLog.svelte';
  import ChatInput from './chatInput.svelte';
  import { THEME } from '../../common/constant/theme';
    import GameMenu from './gameMenu.svelte';
    import InventoryModal from './inventoryModal.svelte';
    import ActionModal from './actionModal.svelte';

  let showInventoryModal = false;
  let showActionModal = false;
  let showSurvivorModal = false;
  let inputMessage = '';

  let messages = [
    { content: `[시스템] 당신은 산 정상에 들어왔습니다.`, system: true },
    { content: `[시스템] 이곳에서 항바이러스혈청을 획득하였습니다.`, system: true },
    { content: `[시스템] 당신은 '눈치빠른고양이'가 이곳에 쓰러진 것을 발견하였습니다. 아무래도 어떤 좀비에게 물어뜯겨 사망한 것 같습니다.`, system: true },
    { content: '[말많은다람쥐] 아까 족제비가 폐건물에 좀비가 있다고 했어', system: false },
    { content: '[엿듣는호랑이] 오 나 신경억제 단백질 획득... 이제 촉매정제물질만 있으면 백신 만들 수 있어', system: false },
    { content: '[웃는얼굴의하마] 혹시 진단키트 있는 사람 없어?', system: false },
  ];
</script>

<div class={`flex flex-col md:flex-row min-h-screen px-6 py-4 gap-x-6 ${THEME.bgSecondary} ${THEME.textPrimary}`}>

    <!-- 데스크탑이면 왼쪽 사이드, 모바일이면 하단 고정 -->
    <GameMenu
    onOpenInventory={() => showInventoryModal = true}
    onOpenAction={() => showActionModal = true}
    onOpenSurvivors={() => showSurvivorModal = true}
    onExit={() => console.log('나가기')}
  />
    

  <!-- 중앙 채팅 영역 -->
  <main class="flex-1 flex flex-col gap-y-4 pb-14">
    <RegionInfo
    regionName="산 정상 30턴째"
    turnInfo="120초 남음"
  />
      <ChatLog {messages} />
    
      <ChatInput bind:value={inputMessage} onSend={(msg) => {messages = [...messages, { content: '[자책하는두더지] ' + msg, system: false }]; inputMessage=''}} />
      </main>

  <InventoryModal isOpen={showInventoryModal} onClose={() => showInventoryModal = false} />
    <ActionModal isOpen={showActionModal} onClose={() => showActionModal = false} />
      <SurvivorModal
      alwaysVisible={true}
    />
    
    <SurvivorModal
      isOpen={showSurvivorModal}
      onClose={() => showSurvivorModal = false}
    />
    

</div>

<style>
  .chat-log {
    max-height: calc(100vh - 200px);
  }
</style>
