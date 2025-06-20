<script lang="ts">
  import { get } from 'svelte/store';
  import { THEME } from '../../../common/constant/theme';
  import { selectOptionStore } from './selectOptionStore'; // 따로 store 생성 필요

  let config = get(selectOptionStore);

  $: visible = !!$selectOptionStore;
  $: config = $selectOptionStore;
</script>

{#if visible && config}

  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class={`w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl ${THEME.bgSecondary} ${THEME.textPrimary}`}>
      <h2 class="text-xl font-bold mb-2">{config.title}</h2>
      <p class="mb-4 text-sm">{config.message}</p>

      <ul class="space-y-2 mb-4">
        {#each config.options as option}
          <li>
            <button
              on:click={() => {
                config.resolve(option);
                selectOptionStore.set(null);
              }}
              class={`w-full py-2 px-4 rounded-xl shadow ${THEME.bgTertiary} hover:${THEME.bgAccent} transition-colors`}
            >
              {option.label}
            </button>
          </li>
        {/each}
      </ul>

      <button
        on:click={() => {
          config.reject();
          selectOptionStore.set(null);
        }}
        class={`w-full py-2 px-4 rounded-xl border mt-2 ${THEME.textAccent} border-${THEME.bgAccent}`}
      >
        취소
      </button>
    </div>
  </div>
{/if}
