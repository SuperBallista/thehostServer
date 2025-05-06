<script lang="ts">
    export let checked = false;
    export let disabled = false;
    export let color = "#4CAF50"; // 기본 색상 (초록)
  
    function toggle() {
      if (!disabled) {
        checked = !checked;
      }
    }
  </script>
  
  <style>
    .toggle-container {
      width: 50px;
      height: 25px;
      border-radius: 15px;
      position: relative;
      background-color: var(--toggle-bg, #ccc);
      transition: background 0.3s ease;
      cursor: pointer;
    }
  
    .toggle-container.checked {
      background-color: var(--active-color);
    }
  
    .toggle-handle {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: white;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      left: 4px;
      transition: left 0.3s ease;
    }
  
    .toggle-container.checked .toggle-handle {
      left: 26px;
    }
  
    .toggle-container.disabled {
      background-color: #ddd;
      cursor: not-allowed;
    }
  </style>
  
  <div
    class="toggle-container {checked ? 'checked' : ''} {disabled ? 'disabled' : ''}"
    style="--active-color: {color}"
    on:click={toggle}
  >
    <div class="toggle-handle"></div>
  </div>
  