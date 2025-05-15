<script lang="ts">
  import BoxOverlay from "./common/messagebox/BoxOverlay.svelte";
  import { pageStore } from "./common/store/pageStore";
  import Lobby from "./page/lobby/lobby.svelte";
  import Login from "./page/login/login.svelte";
  import NewUser from "./page/newUser/newUser.svelte";
  import WaitRoom from "./page/waitRoom/waitRoom.svelte";

  


</script>
<BoxOverlay/>


{#if $pageStore === 'login'}
<Login/>
{:else if $pageStore === 'setting'}
<NewUser/>
{:else if $pageStore === 'lobby'}
<Lobby/>
{:else if $pageStore === 'room' || $pageStore === 'host'}
<WaitRoom/>
{/if}