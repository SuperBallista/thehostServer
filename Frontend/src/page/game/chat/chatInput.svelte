<script lang="ts">
  import { THEME } from '../../../common/constant/theme';


</script>

<div class={`flex items-center p-2 border-t ${THEME.borderPrimary} ${THEME.bgSecondary}`} >

  <input
    class={`flex-1 mr-2 px-3 py-1 ${THEME.roundedDefault} ${THEME.bgDisabled} ${THEME.textWhite} focus:outline-none ${THEME.focusRing}`}
  />

  <button
    type="button"
    class={`px-4 py-1 ${THEME.bgAccent} ${THEME.textWhite} ${THEME.roundedDefault}`}  >
    전송
  </button>
</div>
