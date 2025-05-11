<script lang="ts">
    import { onMount } from "svelte";
    import BoxOverlay from "./common/messagebox/BoxOverlay.svelte";
    import GameLayout from "./page/game/gameLayout.svelte";
    import StartMessage from "./page/tutorialMessage/startMessage.svelte";
    import PlayerSelector from "./common/selectPlayerMessageBox/playerSelector.svelte";

</script>
<BoxOverlay/>
<GameLayout/>
<StartMessage/>
<PlayerSelector/>