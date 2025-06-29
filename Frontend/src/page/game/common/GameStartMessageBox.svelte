<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { toggleMusic } from '../../../common/store/musicStore';
  import { THEME } from '../../../common/constant/theme'; // 🔥 테마 import

  export let isOpen = false;
  export let title = "";
  export let message = "";
  export let imageSrc = "";
  export let onClose: () => void = () => {};

  let confirmButton: HTMLButtonElement;

  function handleConfirm() {
    // 🔥 확인 버튼 클릭 시 음악 재생
    toggleMusic();
    
    // 메시지박스 닫기
    onClose();
  }

  function handleKey(event: KeyboardEvent) {
    if (event.key === "Escape") onClose();
    if (event.key === "Enter") handleConfirm();
  }

  onMount(() => {
    window.addEventListener("keydown", handleKey);
    if (confirmButton) {
      confirmButton.focus();
    }
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKey);
  });
</script>

{#if isOpen}
  <!-- 오버레이 -->
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <!-- 메시지박스 -->
    <div class={`w-[90%] max-w-md ${THEME.roundedDefault} overflow-hidden ${THEME.shadow} ${THEME.bgSecondary} ${THEME.textPrimary}`}>
      <!-- 헤더 -->
      <div class={`flex items-center justify-center gap-2 p-3 ${THEME.bgAccentPrimary} ${THEME.textWhite} text-lg font-bold`}>
        <div class="w-6 h-6 flex items-center justify-center">
          <!-- 게임 아이콘 -->
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.5 9v4"/>
            <path d="M12.5 17h.01"/>
            <path d="M21 19H3a2 2 0 0 1-1.74-3l9-15a2 2 0 0 1 3.48 0l9 15a2 2 0 0 1-1.74 3Z"/>
          </svg>
        </div>
        {title}
      </div>
      
      <!-- 내용 -->
      <div class="p-5 text-center">
        {#if imageSrc}
          <img class={`max-w-full max-h-48 ${THEME.roundedSm} border ${THEME.borderPrimary} mx-auto mb-4 object-contain`} src={imageSrc} alt="role image"/>
        {/if}
        <p class="text-left whitespace-pre-line leading-relaxed mt-4">{message}</p>
      </div>

      <!-- 버튼 -->
      <div class="flex justify-center p-4">
        <button
          class={`px-6 py-3 border-none ${THEME.roundedSm} cursor-pointer text-base font-bold ${THEME.transition} ${THEME.bgAccentPrimary} hover:bg-purple-700 ${THEME.textWhite} ${THEME.shadow} hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0`}
          bind:this={confirmButton}
          on:click={handleConfirm}>
          🎵 시작하기
        </button>
      </div>
    </div>
  </div>
{/if}
