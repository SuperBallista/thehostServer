<script lang="ts">
    import { selectPlayerStore } from '../../../common/store/selectPlayerMessageBox';
    import { THEME } from '../../../common/constant/theme';
  
    let config = $selectPlayerStore;
  
    $: visible = !!$selectPlayerStore;
    $: config = $selectPlayerStore;
  </script>
  
  {#if visible && config}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class={`w-full max-w-md mx-4 p-6 rounded-2xl shadow-xl ${THEME.bgSecondary} ${THEME.textPrimary}`}>
        <h2 class="text-xl font-bold mb-2">{config.title}</h2>
        <p class="mb-4 text-sm">{config.message}</p>
  
        {#if config.image}
          <img class="message-image" src={config.image} alt="image"/>
        {/if}
        
        <div class="max-h-96 overflow-y-auto mb-4">
          <div class="grid grid-cols-2 gap-2">
            {#each config.players as player}
              <button
                on:click={() => {
                  config.resolve(player);
                  selectPlayerStore.set(null);
                }}
                class={`py-2 px-4 rounded-xl shadow ${THEME.bgTertiary} hover:${THEME.bgAccent} transition-colors text-center`}
              >
                {player.nickname}
              </button>
            {/each}
          </div>
        </div>
  
        <button
          on:click={() => {
            config.reject();
            selectPlayerStore.set(null);
          }}
          class={`w-full py-2 px-4 rounded-xl border mt-2 ${THEME.textAccent} border-${THEME.bgAccent}`}
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