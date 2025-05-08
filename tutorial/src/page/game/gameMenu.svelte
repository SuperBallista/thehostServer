<script lang="ts">
    import SidebarMenu from './SidebarMenu.svelte';
    import MobileNav from './MobileNav.svelte';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    export let onOpenInventory: () => void;
    export let onOpenAction: () => void;
    export let onOpenSurvivors: () => void;
    export let onExit: () => void;
  
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
      {onExit}
    />
  {:else}
    <SidebarMenu
      {onOpenInventory}
      {onOpenAction}
      {onExit}
    />
  {/if}
  