<script lang="ts">
    import SidebarMenu from './menu/sidebarMenu.svelte';
    import MobileNav from './menu/mobileNav.svelte';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    const isMobile = writable(false);
  
    onMount(() => {
      const check = () => isMobile.set(window.innerWidth < 768);
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    });
  

  </script>
  
  {#if $isMobile}
    <MobileNav/>
  {:else}
    <SidebarMenu/>
  {/if}
  