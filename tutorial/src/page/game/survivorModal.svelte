<script lang="ts">
  import { THEME } from '../../common/constant/theme';
    import type { Survivor } from './game.type';

  export let isOpen: boolean = false;
  export let alwaysVisible: boolean = false;
  export let onClose: () => void = () => {};


  export let survivors: Survivor[] = [
  { name: '자책하는두더지', status: 'you', sameRegion: true },
  { name: '말많은다람쥐', status: 'alive', sameRegion: true },
  { name: '웃는얼굴의하마', status: 'alive', sameRegion: true },
  { name: '엿듣는호랑이', status: 'alive', sameRegion: true },
  { name: '조용한여우', status: 'alive', sameRegion: false },
  { name: '눈치빠른고양이', status: 'dead', sameRegion: false },
  { name: '겁많은토끼', status: 'alive', sameRegion: false },
  { name: '고집센너구리', status: 'alive', sameRegion: false },
  { name: '유난떠는수달', status: 'zombie', sameRegion: false },
  { name: '낙서많은부엉이', status: 'alive', sameRegion: false },
  { name: '분위기타는족제비', status: 'alive', sameRegion: false },
  { name: '장난기있는펭귄', status: 'dead', sameRegion: false },
  { name: '침착한판다', status: 'alive', sameRegion: false },
  { name: '의심많은고슴도치', status: 'alive', sameRegion: false },
  { name: '폭로하는까마귀', status: 'alive', sameRegion: false },
  { name: '살금살금곰', status: 'alive', sameRegion: false },
  { name: '혼잣말하는늑대', status: 'dead', sameRegion: false },
  { name: '사람좋은삵', status: 'alive', sameRegion: false },
  { name: '침묵하는도롱뇽', status: 'zombie', sameRegion: false },
  { name: '거짓말하는수리부엉이', status: 'alive', sameRegion: false },
];

  function getClass(s: Survivor): string {
    if (s.status === 'dead') return `${THEME.textTertiary} line-through`;
    if (!s.sameRegion) return `${THEME.textTertiary} italic`;
    if (s.status === 'zombie') return THEME.textWarning;
    return THEME.textPrimary;
  }
</script>

<!-- ✅ 데스크탑: 항상 보이는 패널 -->
{#if alwaysVisible}
<div class="hidden md:block p-2">
    <h2 class="text-lg font-bold mb-2">👥 생존자 정보</h2>
    <ul class="space-y-1 text-sm">
      {#each survivors as s}
        <li class={getClass(s)}>{s.name} ({s.status})</li>
      {/each}
    </ul>
  </div>

<!-- ✅ 모바일: 모달로 등장 -->
{:else if isOpen}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={onClose}>
    <div
      class={`w-72 p-4 ${THEME.bgTertiary} ${THEME.textWhite} ${THEME.roundedDefault} ${THEME.shadow}`}
      on:click|stopPropagation
    >
      <h2 class="text-lg font-bold mb-2">👥 생존자 정보</h2>
      <ul class="space-y-1 text-sm">
        {#each survivors as s}
          <li class={getClass(s)}>{s.name} ({s.status})</li>
        {/each}
      </ul>
      <button
        class={`mt-4 w-full py-2 ${THEME.bgDisabled} ${THEME.textWhite} ${THEME.roundedDefault}`}
        on:click={onClose}
      >
        닫기
      </button>
    </div>
  </div>
{/if}
