import { handleErrorCatchError, handleErrorIfNotOK } from "../../handleCode/errorHandle";
import { showMessageBox } from "../../messagebox/customStore";
import { removeAccessToken } from "../../store/authStore";
import { pageStore } from "../../store/pageStore";

export async function logoutAccount(){
    try{
    const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
    })
    const result = await handleErrorIfNotOK(response)
    if (!result) return
    showMessageBox('success','로그아웃 성공', '로그아웃에 성공하였습니다')
    removeAccessToken();
    pageStore.set('login')
    }
    catch (error) {
    handleErrorCatchError(error)
    }
}