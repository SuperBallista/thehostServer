<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { THEME } from '../../../common/constant/theme';
  import { chatMessages, myStatus } from '../../../stores/gameStateStore';
  

  let targetEl: HTMLElement;

  // 현재 구역의 채팅만 필터링
  $: regionChats = $chatMessages.filter(msg => 
    msg.type === 'system' || 
    msg.type === 'broadcast' ||
    (msg.region === $myStatus?.region)
  );

  afterUpdate(() => {
    targetEl?.scrollTo({ top: targetEl.scrollHeight, behavior: 'smooth' });
  });
</script>

<div bind:this={targetEl} class={`rounded-xl flex-1 overflow-y-auto p-4 space-y-2 chat-log ${THEME.bgTertiary} ${THEME.textPrimary}`}>

  {#each regionChats as msg}
    <div class={msg.type === 'system' ? THEME.textAccent : THEME.textPrimary}>
      {#if msg.type === 'whisper'}
        <span class="text-red-400">[무전기]</span>
      {:else if msg.type === 'broadcast'}
        <span class="text-purple-400">[전체방송]</span>
      {/if}
      {#if msg.nickname}
        <span class="font-semibold">{msg.nickname}:</span>
      {/if}
      {msg.message}
      <span class="text-xs text-gray-500 ml-2">
        {new Date(msg.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  {/each}
</div>

<style>
  .chat-log {
    max-height: calc(100vh - 200px);
  }
</style>
