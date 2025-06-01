<script lang="ts">
    import { isOpen } from "./customStore";
import MessageBox from "./MessageBox.svelte"  
</script>

{#if $isOpen}    
<div class="overlay">
    <MessageBox/>
</div>
{/if}

<style>

.overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }


</style>