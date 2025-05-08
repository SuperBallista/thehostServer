<script lang="ts">
    import { THEME } from "../../common/constant/theme";


  let openSection: 'inventory' | 'action' | null = null;
  const toggle = (section: typeof openSection) => {
    openSection = openSection === section ? null : section;
  };
</script>

<div class="flex flex-col gap-y-2">
  <!-- 🎒 가방 -->
  <div>
    <button class="w-full text-left px-4 py-2 font-semibold" on:click={() => toggle('inventory')}>🎒 가방</button>
    {#if openSection === 'inventory'}
      <div class="pl-6 mt-1 space-y-1 text-sm flex flex-col">
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">표식 스프레이 1개</button>
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">지우개 1개</button>
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">신경억제 단백질 1개</button>
      </div>
    {/if}
  </div>

  <!-- 🧭 행동 -->
  <div>
    <button class="w-full text-left px-4 py-2 font-semibold" on:click={() => toggle('action')}>🧭 행동</button>
    {#if openSection === 'action'}
      <div class="pl-6 mt-1 space-y-1 text-sm flex flex-col">
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">다음 턴 이동 장소 설정</button>
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">좀비 대처 행동</button>
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">감염시키기</button>
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">좀비의 공격 대상 정하기</button>
        <button class="block w-full text-left px-3 py-1 bg-gray-700 rounded">좀비의 이동 구역 정하기</button>
      </div>
    {/if}
  <!-- ⏭️ 넘기기 -->
  <div class="mt-4">
    <button class="w-full text-left px-4 py-2 font-semibold">
      ⏭️ 넘기기
    </button>
  </div>
  
  
    <!-- 🚪 나가기 -->
    <div class="mt-4">
      <button class="w-full ${THEME.textWarning} px-4 py-2 font-semibold">🚪 나가기</button>
    </div>
  </div>
  
  </div>

