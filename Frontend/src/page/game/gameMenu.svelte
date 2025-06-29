<script lang="ts">
    import SidebarMenu from './menu/sidebarMenu.svelte';
    import MobileNav from './menu/mobileNav.svelte';
    import InventoryModal from './menu/inventoryModal.svelte';
    import ActionModal from './menu/actionModal.svelte';
    import SurvivorModal from './menu/survivorModal.svelte';
    import { onMount } from 'svelte';
    import { writable } from 'svelte/store';
  
    const isMobile = writable(false);
    let showInventoryModal = false;
    let showActionModal = false;
    let showSurvivorModal = false;
  
    onMount(() => {
      const check = () => isMobile.set(window.innerWidth < 768);
      check();
      window.addEventListener('resize', check);
      return () => window.removeEventListener('resize', check);
    });
  

  </script>
  
  {#if $isMobile}
    <MobileNav 
      onInventoryClick={() => showInventoryModal = true}
      onActionClick={() => showActionModal = true}
      onSurvivorClick={() => showSurvivorModal = true}
    />
    <InventoryModal bind:isOpen={showInventoryModal} />
    <ActionModal bind:isOpen={showActionModal} />
    <SurvivorModal bind:isOpen={showSurvivorModal} />
  {:else}
    <SidebarMenu/>
  {/if}
  