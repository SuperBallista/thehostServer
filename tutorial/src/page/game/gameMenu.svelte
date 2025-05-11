<script lang="ts">
    import SidebarMenu from './sidebarMenu.svelte';
    import MobileNav from './mobileNav.svelte';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    export let onOpenInventory: () => void;
    export let onOpenAction: () => void;
    export let onOpenSurvivors: () => void;
    export let onExit: () => void;
    export let onSkip: () => void;
  
    const isMobile = writable(false);
  
    onMount(() => {
      const check = () => isMobile.set(window.innerWidth < 768);
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    });
  

  </script>
  
  {#if $isMobile}
    <MobileNav
      {onOpenInventory}
      {onOpenAction}
      {onOpenSurvivors}
      {onSkip}
      {onExit}
    />
  {:else}
    <SidebarMenu
      {onSkip}
      {onExit}
    />
  {/if}
  