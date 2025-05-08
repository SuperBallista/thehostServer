<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import {
      messageType, messageTitle, messageContent, messageColor,
      messageInputs, messageResolve, closeMessageBox, messageIcon
    } from "./customStore";
    import InputBox from "./InputBox.svelte";
    import LoadingSpinner from "./LoadingSpinner.svelte";
    import messageBoxColor from "./config/messageBoxColor.json"

  
   let inputValues: Record<string, string> = {}

   function confirm(success: boolean) {
  if ($messageResolve) {
    // 🔥 messageInputs에서 직접 값 수집
    const values: Record<string, string> = {};
    $messageInputs.forEach(input => {
      values[input.key] = input.value ?? "";
    });

    $messageResolve(
      $messageType === "input"
        ? { success, values: success ? values : undefined }
        : { success }
    );
  }
  closeMessageBox();
}
  
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") confirm(false);
      if (event.key === "Enter" && ($messageType === "confirm" || $messageType === "input")) confirm(true);
    }

    function resolveInputType(inputType: string | undefined): "text" | "email" | "number" | "password" {
  if (inputType === "email" || inputType === "number" || inputType === "password") {
    return inputType;
  }
  return "text";
}

  
    onMount(() => {
      window.addEventListener("keydown", handleKey);
      if (confirmButton) {
      confirmButton.focus();
    }
    });
    let confirmButton: HTMLButtonElement;

    onDestroy(() => {
      window.removeEventListener("keydown", handleKey);
    });

  </script>
  
      <div class="message-box" style="background: {messageBoxColor.background}; color: {messageBoxColor.font}">
        <div class="header" style="background: {$messageColor}">
            {#if $messageIcon}
            <div class="icon">{@html $messageIcon}</div>  
            {/if}
            {$messageTitle}</div>  
        <div class="content">
          {#if $messageType === "loading" || $messageType === "success"}
            <LoadingSpinner size={50} color={$messageColor} />
          {/if}
            <p>{$messageContent}</p>
            {#if $messageType === "input"}
            {#each $messageInputs as input}
            <InputBox
              bind:value={input.value}
              label={input.label}
              type={resolveInputType(input.type)}
              placeholder={input.placeholder}
            />
          {/each}
         {/if}
        </div>
  
        {#if $messageType !== "loading" && $messageType !== "success"}
          <div class="footer">
            {#if $messageType === "confirm" || $messageType === "input"}
            <button
            class="button btn-default"
            style="--btn-default: {messageBoxColor['btn-default']}; --btn-default-hover: {messageBoxColor['btn-default-hover']}; --btn-text: {messageBoxColor['btn-text']};"
            on:click={() => confirm(true)}>
            확인
          </button>
          <button
          class="button btn-cancel"
          style="--btn-cancel: {messageBoxColor['btn-cancel']}; --btn-cancel-hover: {messageBoxColor['btn-cancel-hover']}; --btn-text: {messageBoxColor['btn-text']};"
          on:click={() => confirm(false)}>
          취소
        </button>
        {:else}
        <button
        class="button btn-default"
        style="--btn-default: {messageBoxColor['btn-default']}; --btn-default-hover: {messageBoxColor['btn-default-hover']}; --btn-text: {messageBoxColor['btn-text']};"
        bind:this={confirmButton}
        on:click={() => confirm(true)}>
        확인
      </button>
           {/if}
          </div>
        {/if}
      </div>
  

<style>
  .icon {
    width: 25px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  
    .message-box {
      width: 90%;
      max-width: 400px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.2);
    }
  
    .header {
      display: flex;
      padding: 12px;
      color: white;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      align-items: center;
    justify-content: center;
    }
  
    .content {
      padding: 16px;
      font-size: 16px;
      text-align: center;
    }
  
    .footer {
      display: flex;
      justify-content: center;
      padding: 12px;
    }
  
    .button {
      margin: 0 5px;
      padding: 8px 16px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      transition: 0.2s;
      color: var(--btn-text)
    }


    .btn-default {
    background-color: var(--btn-default);
    transition: background-color 0.2s ease-in-out;
  }

  .btn-default:hover {
    background-color: var(--btn-default-hover);
  }
  
  
  .btn-cancel {
    background-color: var(--btn-cancel);
    transition: background-color 0.2s ease-in-out;
  }

  .btn-cancel:hover {
    background-color: var(--btn-cancel-hover);
  }

  </style>
