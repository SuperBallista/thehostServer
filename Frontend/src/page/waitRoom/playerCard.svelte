<!-- playerCard.svelte -->
<script lang="ts">
    import { THEME } from "../../common/constant/theme";

    export let nickname: string;
  </script>
  
  <div class={`p-3 min-w-[6rem] max-w-[8rem] m-2 
               ${THEME.bgAccent} 
               ${THEME.textWhite} 
               ${THEME.roundedDefault} 
               ${THEME.shadow} 
               text-center`}>
    <div class="text-sm font-semibold truncate">{nickname}</div>
  </div>
  