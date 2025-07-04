<script lang="ts">
  import { THEME } from '../../common/constant/theme';
  import { pageStore } from '../../common/store/pageStore';
  import { authStore, restoreAuthFromSessionAndCookie, setAuthSuccess } from '../../common/store/authStore';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { initSocket } from '../../common/store/socketStore';

  function goToGoogleLogin() {
    window.location.href = '/api/auth/google/login';
  }

  function getIAInformationFromUrl(){
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const nickname = decodeURIComponent(urlParams.get('nickname') as string) || 'null';
  const id = Number(urlParams.get('userId'));

  if (token && nickname!=='null' && id!==0) {
    console.log('기존 유저, 로비 이동');
    setAuthSuccess({nickname, id}, token);
    // 소켓 초기화를 먼저 시작하고 로비로 이동
    initSocket().then(() => {
      pageStore.set('lobby');
    }).catch((error) => {
      console.error('소켓 초기화 실패:', error);
      pageStore.set('lobby'); // 실패해도 로비로 이동
    });
    window.history.replaceState(null, '', window.location.pathname);
    return false;
  }
  else if (token && nickname==='null' && id===0) {
    console.log('닉네임 미설정 유저, 세팅 페이지 이동');
    setAuthSuccess({nickname:null, id:null}, token);
    pageStore.set('setting');
    window.history.replaceState(null, '', window.location.pathname);
    return false;
  }
  else {
    console.log('쿼리 없음, 세션 복원 시도');
    return true;
  }
}

onMount(async () => {
  const result = getIAInformationFromUrl();

  if (result) {
    // 1) 세션·쿠키 복원 시도
    const complete = await restoreAuthFromSessionAndCookie();

    // 2) 복원이 성공했을 때만 다음 단계로
    if (complete) {
    // 3) 최신 auth 상태 확인
      const auth = get(authStore);

      if (auth.user?.nickname) {
        console.log('기존 유저, 로비 이동');
        // 소켓 초기화를 먼저 시작하고 로비로 이동
        initSocket().then(() => {
          pageStore.set('lobby');
        }).catch((error) => {
          console.error('소켓 초기화 실패:', error);
          pageStore.set('lobby'); // 실패해도 로비로 이동
        });
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  }
});


</script>
  
  <div class="bg-black min-h-screen flex flex-col items-center justify-center p-6">
    <!-- 로고 및 타이틀 -->
    <div class="flex flex-col items-center mb-12">
      <div class="p-3 mb-4 w-full max-w-md flex justify-center">
        <img src="img/logo.png" class="w-40 h-40 object-contain" alt="The Host 로고" />
      </div>
      <h1 class={`${THEME.textPrimary} text-3xl font-bold font-sans`}>THE HOST</h1>
      <p class={`${THEME.textSecondary} mt-2 text-center font-sans`}>
        오직 생존자만이 숙주의 진실을 볼 수 있다
      </p>
    </div>
  
    <!-- 로그인 박스 -->
    <div class={`${THEME.bgTertiary} ${THEME.borderPrimary} ${THEME.roundedDefault} ${THEME.shadow} w-full max-w-md p-6 mb-6 border`}>
      <div class="space-y-4">
        <p class={`${THEME.textSecondary} text-center mb-4 font-sans`}>다음 계정으로 계속하기</p>
  
        <!-- Google 로그인 버튼 -->
        <button
        on:click={goToGoogleLogin}
        class="
          bg-white text-gray-700 border border-gray-300
          hover:bg-gray-100 transition
          rounded-sm shadow-md w-full py-3
          flex items-center justify-center space-x-3
          no-underline
        "
      >
        <img src="/img/google-icon.svg" alt="Google" width="20" height="20" />
        <span class="text-sm font-medium font-sans">Google로 계속하기</span>
        </button>
      </div>
    </div>
  
    <!-- 하단 링크 -->
    <div class={`${THEME.textTertiary} text-xs mt-12 text-center font-sans`}>
      <p>© 2025 The Host. All rights reserved.</p>
      <div class="mt-2">
        <a href="#" class="hover:text-gray-300 transition mx-2">이용약관</a>
        <a href="#" class="hover:text-gray-300 transition mx-2">개인정보 처리방침</a>
        <a href="#" class="hover:text-gray-300 transition mx-2">도움말</a>
      </div>
    </div>
  </div>
  