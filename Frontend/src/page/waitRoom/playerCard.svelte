<!-- playerCard.svelte -->
<script lang="ts">
    import { get } from "svelte/store";
    import { THEME } from "../../common/constant/theme";
    import { currentRoom } from "../../common/store/pageStore";
    import { authStore } from "../../common/store/authStore";

    export let nickname: string;
    export let playerId:number;
  </script>
  
  <div class={`p-3 min-w-[6rem] max-w-[8rem] m-2 
               ${playerId === Number(get(currentRoom)?.hostUserId) ? THEME.bgAccent : THEME.bgSecondary} 
               ${THEME.textWhite} 
               ${THEME.roundedDefault} 
               ${THEME.shadow} 
               text-center`}>
    <div class="text-sm font-semibold truncate">{$authStore.user?.id===playerId ? '나 ' : null}{nickname}</div>
  </div>
  