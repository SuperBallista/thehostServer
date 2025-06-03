<script lang="ts">
    import { selectPlayerStore } from './selectPlayerMessageBox';
    import { THEME } from '../../../common/constant/theme';
    import { get } from 'svelte/store';
  
    let config = get(selectPlayerStore);
  
    $: visible = !!$selectPlayerStore;
    $: config = $selectPlayerStore;
  </script>
  
  {#if visible && config}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class={`w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl ${THEME.bgSecondary} ${THEME.textPrimary}`}>
        <h2 class="text-xl font-bold mb-2">{config.title}</h2>
        <p class="mb-4 text-sm">{config.message}</p>
  
        <ul class="space-y-2 mb-4">
          {#if config.image}
          <img class="message-image" src={config.image} alt="image"/>
          {/if}

          {#each config.players as player}
            <li>
              <button
                on:click={() => {
                  config.resolve(player);
                  selectPlayerStore.set(null);
                }}
                class={`w-full py-2 px-4 rounded-xl shadow ${THEME.bgTertiary} hover:${THEME.bgAccent} transition-colors`}
              >
                {player.name}
              </button>
            </li>
          {/each}
        </ul>
  
        <button
          on:click={() => {
            config.reject();
            selectPlayerStore.set(null);
          }}
          class={`w-full py-2 px-4 rounded-xl border mt-2 ${THEME.textWarning} border-${THEME.bgWarning}`}
        >
          취소
        </button>
      </div>
    </div>
  {/if}
  
  <style>
  .message-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid #ccc;
  margin: 12px auto;
  object-fit: contain;
}


  </style>