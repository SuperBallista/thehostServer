<script lang="ts">
  import { THEME } from "../constant/theme";
  import { roomId } from '../store/socketStore';
    import { pageStore, locationState, currentRoom } from "../store/pageStore";
    import { showMessageBox } from "../messagebox/customStore";






   if (($pageStore !== 'room' && $pageStore !== 'game')&& $roomId !== null) {
      locationState.set('lobby')
      currentRoom.set(null)
    } else if ($pageStore === 'room' && $roomId !== null){
      locationState.set('room')
    } else if ($pageStore === 'game' && $roomId !== null){
      locationState.set('game')
    } else if ($locationState !== 'lobby' && $roomId !== null) {
      locationState.set("lobby")
      pageStore.set('lobby')
      showMessageBox('error', '방 정보 오류', '방 정보가 없어 로비로 이동합니다')
    }

</script>

<!-- 하단 링크 -->
    <footer class="text-xs text-center mt-12">
        <p class={`${THEME.textTertiary}`}>© 2025 The Host. All rights reserved.</p>
      </footer>
  