  <script lang="ts">
  import { THEME } from "../../common/constant/theme";
  import {makeRoom} from "./lobbyStore"

  


  </script>
  
  <!-- 메인 컨텐츠 -->
    <main class={`w-full max-w-3xl ${THEME.bgTertiary} ${THEME.roundedDefault} ${THEME.shadow} p-6`}>
        <h2 class={`${THEME.textAccentStrong} text-xl font-semibold mb-4`}>로비</h2>
    
        <p class={`${THEME.textSecondary} mb-6`}>
          방을 만들거나 참가하여 게임을 시작하세요.
        </p>
    
        <div class="flex flex-col sm:flex-row gap-4">
          <button
            class={`
              ${THEME.bgAccentPrimary} hover:${THEME.bgAccentHover}
              ${THEME.textWhite} ${THEME.roundedDefault}
              ${THEME.transition} ${THEME.shadow}
              w-full sm:w-1/2 py-3 font-semibold text-center
            `} on:click={makeRoom}
          >
            방 만들기
          </button>
          <button
            class={`
              ${THEME.bgDisabled} hover:${THEME.bgTertiary}
              ${THEME.textWhite} ${THEME.roundedDefault}
              ${THEME.transition} ${THEME.shadow}
              w-full sm:w-1/2 py-3 font-semibold text-center
            `}
          >
            방 검색하기
          </button>
        </div>
        <div class="pt-2 flex flex-col sm:flex-row gap-4">
          <button
            class={`
              ${THEME.bgDisabled} hover:${THEME.bgTertiary}
              ${THEME.textWhite} ${THEME.roundedDefault}
              ${THEME.transition} ${THEME.shadow}
              w-full sm:w-1/2 py-3 font-semibold text-center
            `}
          >
              빠른 게임
            </button>
            <button
              class={`
                ${THEME.bgDisabled} hover:${THEME.bgTertiary}
                ${THEME.textWhite} ${THEME.roundedDefault}
                ${THEME.transition} ${THEME.shadow}
                w-full sm:w-1/2 py-3 font-semibold text-center
              `}
            >
              순위 게임
            </button>
          </div>
      </main>
  