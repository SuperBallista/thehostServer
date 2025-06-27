<script lang="ts">
  import BoxOverlay from "./common/messagebox/BoxOverlay.svelte";
  import { pageStore } from "./common/store/pageStore";
  import { authStore, restoreAuthFromSessionAndCookie } from "./common/store/authStore";
  import GameLayout from "./page/game/gameLayout.svelte";
  import Lobby from "./page/lobby/lobby.svelte";
  import Login from "./page/login/login.svelte";
  import NewUser from "./page/newUser/newUser.svelte";
  import WaitRoom from "./page/waitRoom/waitRoom.svelte";
  import { onMount } from "svelte";
  import { get } from "svelte/store";

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
    
    authChecked = true;
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