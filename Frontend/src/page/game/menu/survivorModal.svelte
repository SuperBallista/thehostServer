<script lang="ts">
  import { THEME } from '../../../common/constant/theme';
  import type { Survivor } from '../game.type';

  export let isOpen: boolean = false;
  export let alwaysVisible: boolean = false;
  export let onClose: () => void = () => {};
let survivorList:HTMLElement
let survivor: Survivor[] = []




  function getClass(s: Survivor): string {
    let result:string = ''
    if (s.status === 'you') result = THEME.textWarning
    if (s.status === 'dead') result = `line-through`;
    if (!s.sameRegion) result = result + ` ${THEME.textTertiary} italic`;
    if (s.status === 'zombie' && s.sameRegion) result = THEME.textAccentStrong;
    if (result==='') result = THEME.textPrimary;
    return result
  }
</script>



<!-- ✅ 데스크탑: 항상 보이는 패널 -->
{#if alwaysVisible}
<div bind:this={survivorList} class="hidden md:block p-2">

    <h2 class="text-lg font-bold mb-2">👥 생존자 정보</h2>
    <ul class="space-y-1 text-sm">
      {#each survivor as s}
        <li class={getClass(s)}>{s.name} ({s.status})</li>
      {/each}
    </ul>
  </div>

<!-- ✅ 모바일: 모달로 등장 -->
{:else if isOpen}


  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={onClose}>
    <div
      class={`w-72 p-4 ${THEME.bgTertiary} ${THEME.textWhite} ${THEME.roundedDefault} ${THEME.shadow}`}
      on:click|stopPropagation
    >
      <h2 class="text-lg font-bold mb-2">👥 생존자 정보</h2>
      <ul class="space-y-1 text-sm">
        {#each survivor as s}
          <li class={getClass(s)}>{s.name} ({s.status})</li>
        {/each}
      </ul>
      <button
        class={`mt-4 w-full py-2 ${THEME.bgDisabled} ${THEME.textWhite} ${THEME.roundedDefault}`}
        on:click={onClose}
      >
        닫기
      </button>
    </div>
  </div>
{/if}
