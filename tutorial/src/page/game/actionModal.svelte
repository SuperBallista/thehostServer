<script lang="ts">
    export let isOpen = false;
    export let onClose: () => void;
  </script>
  
  {#if isOpen}
    <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div class="bg-gray-800 p-4 rounded-lg w-3/4 max-w-md shadow-md">
        <h2 class="text-lg text-red-400 mb-2">🧭 행동 선택</h2>
        <div class="space-y-2">
          <button class="block w-full bg-gray-700 py-2 rounded">다음 턴 이동 장소 설정</button>
          <button class="block w-full bg-gray-700 py-2 rounded">좀비 대처 행동</button>
          <button class="block w-full bg-gray-700 py-2 rounded">감염시키기</button>
          <button class="block w-full bg-gray-700 py-2 rounded">좀비의 공격 대상 정하기</button>
          <button class="block w-full bg-gray-700 py-2 rounded">좀비의 이동 구역 정하기</button>
        </div>
        <button class="mt-4 px-3 py-1 bg-red-700 text-white rounded" on:click={onClose}>
          닫기
        </button>
      </div>
    </div>
  {/if}
  
