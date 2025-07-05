<script lang="ts">
  import { selectGraffitiStore } from '../../../common/store/selectGraffitiMessageBox';
  import { THEME } from '../../../common/constant/theme';

  let selectedIndex: number | null = null;
  let hoveredIndex: number | null = null;

  $: visible = !!$selectGraffitiStore;
  $: config = $selectGraffitiStore;

  function selectGraffiti(graffiti: { message: string; index: number }) {
    selectedIndex = graffiti.index;
  }

  function confirmSelection() {
    if (selectedIndex !== null && config) {
      const selected = config.graffiti.find(g => g.index === selectedIndex);
      if (selected) {
        config.resolve(selected);
      }
    }
  }
</script>

{#if visible && config}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class={`w-full max-w-2xl mx-4 p-6 rounded-2xl shadow-xl ${THEME.bgSecondary} ${THEME.textPrimary}`}>
      <h2 class="text-xl font-bold mb-2">{config.title}</h2>
      <p class="mb-4 text-sm">{config.message}</p>

      {#if config.image}
        <img class="message-image mb-4" src={config.image} alt="image"/>
      {/if}

      <div class="max-h-96 overflow-y-auto mb-4">
        <div class="space-y-2">
          {#each config.graffiti as graffiti, idx}
            <button
              on:click={() => selectGraffiti(graffiti)}
              on:mouseenter={() => hoveredIndex = graffiti.index}
              on:mouseleave={() => hoveredIndex = null}
              class={`w-full py-3 px-4 rounded-xl shadow transition-all duration-200 text-left
                ${selectedIndex === graffiti.index 
                  ? `${THEME.bgAccent} ring-2 ring-offset-2 ring-${THEME.bgAccent}` 
                  : hoveredIndex === graffiti.index
                    ? `${THEME.bgTertiary} transform scale-[1.02]`
                    : THEME.bgTertiary
                }
              `}
            >
              <div class="flex items-start gap-3">
                <span class="text-lg font-bold opacity-50">{idx + 1}.</span>
                <span class="flex-1">{graffiti.message}</span>
                {#if selectedIndex === graffiti.index}
                  <span class="text-green-500">✓</span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </div>

      <div class="flex gap-2">
        <button
          on:click={confirmSelection}
          disabled={selectedIndex === null}
          class={`flex-1 py-2 px-4 rounded-xl transition-colors
            ${selectedIndex !== null 
              ? `${THEME.bgAccent} hover:opacity-90` 
              : `${THEME.bgTertiary} opacity-50 cursor-not-allowed`
            }
          `}
        >
          {selectedIndex !== null ? '이 낙서 지우기' : '낙서를 선택하세요'}
        </button>
        
        <button
          on:click={() => {
            config.reject();
            selectGraffitiStore.set(null);
          }}
          class={`py-2 px-4 rounded-xl border ${THEME.textAccent} border-${THEME.bgAccent}`}
        >
          취소
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .message-image {
    max-width: 100%;
    max-height: 200px;
    border-radius: 8px;
    border: 1px solid #ccc;
    margin: 0 auto;
    object-fit: contain;
    display: block;
  }
</style>