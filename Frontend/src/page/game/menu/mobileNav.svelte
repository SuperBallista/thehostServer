<script lang="ts">
  import { musicStore, toggleMusic } from '../../../common/store/musicStore';
  
  export let onInventoryClick = () => {};
  export let onActionClick = () => {};
  export let onSurvivorClick = () => {};
</script>
<nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-14">
  <button class="h-full flex flex-col justify-center items-center text-lg"
    on:click={onInventoryClick}
  >🎒<br />가방
  </button>
  <button
    class="h-full flex flex-col justify-center items-center text-lg"
    on:click={onActionClick}
  >🧭<br />행동
  </button>

  <button
    class="h-full flex flex-col justify-center items-center text-lg "
    on:click={onSurvivorClick}
  >👥<br />생존자
  </button>


  <button
    class="h-full flex flex-col justify-center items-center text-lg "
  >⏭️<br />넘기기
  </button>
  <button
    class="h-full flex flex-col justify-center items-center text-lg "
  >🚪<br />나가기
  </button>
  <button
    class="h-full flex flex-col justify-center items-center text-lg"
    on:click={toggleMusic}
  >{$musicStore.isPlaying ? '🔊' : '🔇'}<br />음악
  </button>
</nav>
