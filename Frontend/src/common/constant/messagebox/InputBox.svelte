<script lang="ts">
    export let type: "text" | "number" | "email" | "password" = "text";
    export let placeholder = "";
    export let value = "";
    export let disabled = false;
    export let label = "";
    export let onEnter: ((inputValue: string) => void) | null = null;
    export let onCancel: (() => void) | null = null;
  
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Enter" && onEnter) onEnter(value);
      if (event.key === "Escape" && onCancel) onCancel();
    }
  </script>
  
  <style>
    .input-container {
      display: flex;
      flex-direction: column;
      gap: 5px;
      width: 100%;
    }
  
    .label {
      font-size: 14px;
      font-weight: bold;
    }
  
    .input-field {
      padding: 8px;
      border: 1px solid #ccc;
      border-radius: 5px;
      font-size: 16px;
      transition: border-color 0.2s;
      width: 100%;
    }
  
    .input-field:focus {
      border-color: #3498db;
      outline: none;
    }
  
    .input-field:disabled {
      background: #f0f0f0;
      cursor: not-allowed;
    }
  </style>
  
  <div class="input-container">
    {#if label}
      <label class="label">{label}</label>
    {/if}
    <input
      class="input-field"
      type={type}
      placeholder={placeholder}
      bind:value
      disabled={disabled}
      on:keydown={handleKey}
      autofocus
    />
  </div>
  