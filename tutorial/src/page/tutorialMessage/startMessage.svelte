<script lang="ts">
    import { showMessageBox } from "../../common/messagebox/customStore";
    import messageBoxContent from '../../common/message/messageBox.json';
    import { tutorialStep } from "../../common/store/tutorialStreamStore";

    let i = 0

 async function playMessage(){

  const message = await showMessageBox('alert','숙주 게임 튜토리얼', messageBoxContent[i])
  
  if (message.success){
    
    if (i+1 < messageBoxContent.length) {
        i++
        playMessage()
    } else {
        tutorialStep.set(1)
    }
  }
}

playMessage()

</script>

