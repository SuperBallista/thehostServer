<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { closeMessageBox, showMessageBox } from "../../common/messagebox/customStore";
  import { authStore } from "../../common/store/authStore";
  import { THEME } from "../../common/constant/theme";
import { authorizedFetch } from '../../common/utils/fetch'
  import { handleErrorCatchError, handleErrorIfNotOK } from "../../common/handleCode/errorHandle";

  onMount( async () => {
    await setNicknameRequest();
  });

  onDestroy(async () => {
    closeMessageBox();
  });

  async function setNicknameRequest() {
  const userResponse = await showMessageBox("input",
    "닉네임 생성",
    "계정 닉네임을 만들어주세요. 이 닉네임은 친구를 찾는데도 활용됩니다",
    undefined,
    [{
      key: "nickname",
      label: "새 닉네임을 입력합니다",
      placeholder: "여기에 닉네임 입력",
      type: "string"
    }]
  );

if (userResponse.success) {
  try {
  const nickname = userResponse.values?.nickname;
  const response = await authorizedFetch('/api/auth/nickname', {
    method: 'POST',
    body: JSON.stringify({ nickname, token: $authStore.token }),
  });

  const result = await handleErrorIfNotOK(response);
  const data = await response.json();

  if (result && data.url) {
    window.location.href = data.url; // 수동 리다이렉트
  }
} catch (error) {
  handleErrorCatchError(error);
  return await setNicknameRequest();
}
}}

</script>

<div class={`min-h-screen p-6 ${THEME.bgSecondary} flex flex-col items-center justify-start`}>
</div>