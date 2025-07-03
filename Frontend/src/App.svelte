<script lang="ts">
  import BoxOverlay from "./common/messagebox/BoxOverlay.svelte";
  import { pageStore } from "./common/store/pageStore";
  import { authStore, restoreAuthFromSessionAndCookie } from "./common/store/authStore";
  import GameLayout from "./page/game/gameLayout.svelte";
  import Lobby from "./page/lobby/lobby.svelte";
  import Login from "./page/login/login.svelte";
  import NewUser from "./page/newUser/newUser.svelte";
  import WaitRoom from "./page/waitRoom/waitRoom.svelte";
  import { onMount, onDestroy } from "svelte";
  import { get } from "svelte/store";
  import { initSocket, cleanupSocket } from "./common/store/socketStore";

  let authChecked = false;

  onMount(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasOAuthParams = urlParams.has('token');
    
    if (!hasOAuthParams) {
      const restored = await restoreAuthFromSessionAndCookie();
      
      if (restored) {
        const auth = get(authStore);
        if (auth.user?.nickname) {
          const currentPage = get(pageStore);
          if (currentPage === 'login') {
            pageStore.set('lobby');
          }
        }
      }
    }
    
    // 인증이 확인된 후 소켓 초기화
    if (get(authStore).token) {
      try {
        await initSocket();
      } catch (error) {
        console.error('앱 시작 시 소켓 초기화 실패:', error);
      }
    }
    
    authChecked = true;
  });

  onDestroy(() => {
    // 앱이 종료될 때만 소켓 정리
    cleanupSocket();
  });

</script>
<BoxOverlay/>

{#if !authChecked}
  <div class="loading-container">
    <p>Loading...</p>
  </div>
{:else}
  {#if $pageStore === 'login'}
  <Login/>
  {:else if $pageStore === 'setting'}
  <NewUser/>
  {:else if $pageStore === 'lobby'}
  <Lobby/>
  {:else if $pageStore === 'room' || $pageStore === 'host'}
  <WaitRoom/>
  {:else if $pageStore === 'game'}
  <GameLayout/>
  {/if}
{/if}

<style>
  .loading-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: black;
    color: white;
  }
</style>