
  <script lang="ts">
    export let isOpen = false;
    export let onClose: () => void;
  </script>
  
  {#if isOpen}
    <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div class="bg-gray-800 p-4 rounded-lg w-3/4 max-w-md shadow-md">
        <h2 class="text-lg text-red-400 mb-2">🎒 가방</h2>
        <div class="space-y-2">
          <button class="block w-full bg-gray-700 py-2 rounded">표식 스프레이 1개</button>
          <button class="block w-full bg-gray-700 py-2 rounded">지우개 1개</button>
          <button class="block w-full bg-gray-700 py-2 rounded">신경억제 단백질 1개</button>
        </div>
        <button class="mt-4 px-3 py-1 bg-red-700 text-white rounded" on:click={onClose}>
          닫기
        </button>
      </div>
    </div>
  {/if}
  
