<script lang="ts">
  import { THEME } from "../constant/theme";
  import { logoutAccount } from './api/logout'
  import { authStore } from '../../common/store/authStore';
  $: auth = $authStore;
</script>
<!-- 헤더 -->
    <header class="w-full max-w-4xl flex items-center justify-between mb-8">
        <div class="flex items-center space-x-3">
          <img src="/img/logo.png" class="w-12 h-12 object-contain" alt="로고" />
          <h1 class={`${THEME.textWhite} text-2xl font-bold`}>THE HOST</h1>
        </div>
        {#if auth.isLoggedIn}
        <div class="flex items-center space-x-2">
          <span class={`${THEME.textPrimary} text-sm`}>
            {auth.user?.nickname} 님 환영합니다
          </span>
          <button on:click={logoutAccount} class={`${THEME.textSecondary} text-xs underline hover:${THEME.textAccentStrong}`}>
            로그아웃
          </button>
        </div>
              {/if}
      </header>
  