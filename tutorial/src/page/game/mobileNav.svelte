<script lang="ts">

        export let onOpenInventory: () => void;
    export let onOpenAction: () => void;
    export let onOpenSurvivors: () => void;
    export let onExit: () => void;
    export let onSkip: () => void;

  </script>
  
  <nav class="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-14">
    <button on:click={onOpenInventory}>🎒<br />가방</button>
    <button on:click={onOpenAction}>🧭<br />행동</button>
    <button on:click={onOpenSurvivors}>👥<br />생존자</button>
    <button on:click={onSkip}>⏭️<br />넘기기</button>
    <button on:click={onExit}>🚪<br />나가기</button>
  </nav>
  