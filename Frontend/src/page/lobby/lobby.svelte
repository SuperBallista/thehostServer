<script lang="ts">
    import Footer from '../../common/component/footer.svelte';
    import UserInfoHeader from '../../common/component/userInfoHeader.svelte'; 
    import { THEME } from '../../common/constant/theme';
    import LobbyMain from './LobbyMain.svelte';
    import RoomList from './RoomList.svelte';
  
</script>
  
<div class={`min-h-screen p-6 ${THEME.bgSecondary} flex flex-col items-center justify-start`}>
  <UserInfoHeader/>
  <LobbyMain/>
  <RoomList/>
  <Footer/>  
</div>
  