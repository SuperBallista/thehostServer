import { showMessageBox } from "../messagebox/customStore";

export async function handleErrorIfNotOK (response:Response) {
    if (!response.ok){
        const data = await response.json()
        showMessageBox('error', '오류 발생', data.message)
        return false        
    } else {
        return true
    }
}

export function handleErrorCatchError (error){
    showMessageBox('error', '오류 발생', error)
}