<script lang="ts">
  import RegionInfo from './regionInfo.svelte';
  import SurvivorModal from './survivorModal.svelte';
  import ChatLog from './chatLog.svelte';
  import ChatInput from './chatInput.svelte';
  import { THEME } from '../../common/constant/theme';
  import GameMenu from './gameMenu.svelte';
  import InventoryModal from './inventoryModal.svelte';
  import ActionModal from './actionModal.svelte';
  import { nowChatLog } from '../../common/store/tutorialStore'

  let showInventoryModal = false;
  let showActionModal = false;
  let showSurvivorModal = false;
  let inputMessage = '';


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
      <ChatLog messages={$nowChatLog} />
    
      <ChatInput bind:value={inputMessage} onSend={(msg) => {
  nowChatLog.update(log => [...log, { content: '[자책하는두더지] ' + msg, system: false }]);
  inputMessage = '';
}}/>
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
