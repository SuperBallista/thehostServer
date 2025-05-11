<!-- TooltipOverlay.svelte -->
<script lang="ts">
    export let targetEl: HTMLElement;
    export let message: string;
  
    import { onMount } from 'svelte';
    import { tutorialStep } from '../../common/store/tutorialStreamStore';
  
    let boxStyle = '';
    let tooltipStyle = '';
  
    onMount(() => {
      const rect = targetEl.getBoundingClientRect();
      boxStyle = `
        position: absolute;
        top: ${rect.top + window.scrollY}px;
        left: ${rect.left + window.scrollX}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border: 3px solid #00BCD4;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,188,212,0.6);
        z-index: 1000;
        pointer-events: none;
      `;
  
      tooltipStyle = `
        position: absolute;
        top: ${rect.bottom + window.scrollY + 8}px;
        left: ${rect.left + window.scrollX}px;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        z-index: 1001;
        max-width: 250px;
        font-size: 14px;
      `;
    });
  </script>
  <button class="cursor-pointer" on:click={() => tutorialStep.set($tutorialStep+1)}>
  <div style={boxStyle}></div>
  <div style={tooltipStyle}>{message}</div>
  </button>