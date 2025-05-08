<script lang="ts">
  import { THEME } from '../../common/constant/theme';

  export let value: string;
  export let placeholder: string = '메시지를 입력하세요...';
  export let onSend: (message: string) => void;
</script>

<div class={`flex items-center p-2 border-t ${THEME.borderPrimary} ${THEME.bgSecondary}`}>
  <input
    bind:value
    class={`flex-1 mr-2 px-3 py-1 ${THEME.roundedDefault} ${THEME.bgDisabled} ${THEME.textWhite} focus:outline-none ${THEME.focusRing}`}
    {placeholder}
    on:keydown={(e) => e.key === 'Enter' && value.trim() && onSend?.(value)}
  />
  <button
    type="button"
    class={`px-4 py-1 ${THEME.bgAccentPrimary} ${THEME.textWhite} ${THEME.roundedDefault}`}
    on:click={() => value.trim() && onSend?.(value)}
  >
    전송
  </button>
</div>
