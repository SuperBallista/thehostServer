<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { THEME } from '../../../common/constant/theme';
  import { chatMessages, myStatus } from '../../../common/store/gameStateStore';
  import type { ChatMessage } from '../game.type';

  let targetEl: HTMLElement;

  // 모든 채팅 메시지 표시 (백엔드에서 이미 지역별로 필터링됨)
  $: regionChats = $chatMessages as ChatMessage[];

  afterUpdate(() => {
    if (targetEl) {
      targetEl.scrollTop = targetEl.scrollHeight;
    }
  });
</script>

<div bind:this={targetEl} class={`rounded-xl flex-1 overflow-y-auto p-4 space-y-2 chat-log ${THEME.bgTertiary} ${THEME.textPrimary}`}>

  {#each regionChats as msg}
    <div class={`${msg.system ? THEME.textAccent : THEME.textWhite}`}>
      <span class={msg.system ? 'font-semibold' : ''}>
        {msg.message}
      </span>
      <span class="text-xs text-gray-500 ml-2">
        {new Date(msg.timeStamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  {/each}
</div>

<style>
  .chat-log {
    max-height: calc(100vh - 200px);
  }
</style>
