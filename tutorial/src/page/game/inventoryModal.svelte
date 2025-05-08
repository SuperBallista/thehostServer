<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { THEME } from '../../common/constant/theme';
    const dispatch = createEventDispatcher();
  </script>
  
  <div class={`fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50`}>
    <div class={`bg-gray-800 p-4 rounded-lg w-3/4 max-w-md ${THEME.shadow}`}>
      <h2 class={`text-lg mb-2 ${THEME.textAccentStrong}`}>🎒 가방</h2>
      <ul class="space-y-1">
        <li>자가진단키트</li>
        <li>응급치료제</li>
        <li>무전기</li>
      </ul>
      <button
        class={`mt-4 px-3 py-1 ${THEME.bgAccent} ${THEME.textWhite} ${THEME.roundedSm}`}
        on:click={() => dispatch('close')}
      >
        닫기
      </button>
    </div>
  </div>
  