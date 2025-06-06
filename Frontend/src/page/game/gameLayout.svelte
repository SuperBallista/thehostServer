<script lang="ts">
  import RegionInfo from './chat/regionInfo.svelte';
  import SurvivorModal from './menu/survivorModal.svelte';
  import ChatLog from './chat/chatLog.svelte';
  import ChatInput from './chat/chatInput.svelte';
  import { THEME } from '../../common/constant/theme';
  import GameMenu from './gameMenu.svelte';
  import InventoryModal from './menu/inventoryModal.svelte';
  import ActionModal from './menu/actionModal.svelte';
    import PlayerSelector from './selectModal/playerSelector.svelte';
    import SelectOptionBox from './selectModal/selectOptionBox.svelte';
    import { pageStore } from '../../common/store/pageStore';
    
  let showSurvivorModal = false;


</script>
{#if $pageStore === 'game'}
<PlayerSelector/>
<SelectOptionBox/>
<div class={`flex flex-col md:flex-row min-h-screen px-6 py-4 gap-x-6 ${THEME.bgSecondary} ${THEME.textPrimary}`}>


    <SurvivorModal alwaysVisible={true}/>
    <SurvivorModal isOpen={showSurvivorModal} onClose={() => showSurvivorModal = false}/>


    

  <!-- 중앙 채팅 영역 -->
  <main class="flex-1 flex flex-col gap-y-4 pb-14">
      <RegionInfo/>
      <ChatLog/>
      <ChatInput />
      </main>

          <!-- 데스크탑이면 왼쪽 사이드, 모바일이면 하단 고정 -->
    <GameMenu/>



  <InventoryModal/>
    <ActionModal/>
    

</div>

<style>
  .chat-log {
    max-height: calc(100vh - 200px);
  }
</style>
{/if}