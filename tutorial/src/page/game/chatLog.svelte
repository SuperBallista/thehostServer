<script lang="ts">
  export let messages: { content: string; system: boolean }[] = [];

  import { afterUpdate } from 'svelte';
  import { THEME } from '../../common/constant/theme';
  

  let targetEl: HTMLElement;

  afterUpdate(() => {
    targetEl?.scrollTo({ top: targetEl.scrollHeight, behavior: 'smooth' });
  });
</script>
<div id='tutorialStep1' bind:this={targetEl} class={`rounded-xl flex-1 overflow-y-auto p-4 space-y-2 chat-log ${THEME.bgTertiary} ${THEME.textPrimary}`}>


  {#each messages as msg}
    <div class={msg.system ? THEME.textAccent : THEME.textPrimary}>{msg.content}</div>
  {/each}
 
</div>

<style>
  .chat-log {
    max-height: calc(100vh - 200px);
  }
</style>
