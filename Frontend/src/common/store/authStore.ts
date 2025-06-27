import { get, writable } from 'svelte/store';
import { pageStore } from './pageStore';

export interface AuthUser {
  id: number | null;
  nickname: string | null;
}

export interface AuthState {
  isLoggedIn: boolean;
  isLoading: boolean;
  token: string | undefined;
  user: AuthUser | null;
  error: string | null;
}

const defaultState: AuthState = {
  isLoggedIn: false,
  isLoading: false,
  token: undefined,
  user: null,
  error: null,
};

export const authStore = writable<AuthState>({ ...defaultState });

export function setAuthLoading(isLoading: boolean) {
  authStore.update((s) => ({ ...s, isLoading }));
}

export function setAuthError(error: string | null) {
  authStore.update((s) => ({ ...s, error, isLoading: false }));
}

export function setAuthSuccess(user: AuthUser, token: string) {
  sessionStorage.setItem('accessToken', token);

  authStore.set({
    isLoggedIn: true,
    isLoading: false,
    token,
    user,
    error: null,
  });
}

export function removeAccessToken() {
  sessionStorage.removeItem('accessToken'); // ✅ 로그아웃 시 토큰 제거
  authStore.set({ ...defaultState });
}

//**액세스토큰을 세션스토리지와 리프레시토큰으로부터 복구하는 코드 */
export async function restoreAuthFromSessionAndCookie() {
  const token = sessionStorage.getItem('accessToken');
  let result
  if (!token){
  const refresh = await checkRefreshToken()
  if (!refresh) return null
  return refresh
  } else {
   result = await checkAccessToken(token)
  }    
  return result
  }

async function checkAccessToken(token:string) {
  try {
    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error('유효하지 않은 토큰');

    const data = await response.json();
    setAuthSuccess({ id: data.id, nickname: data.nickname }, token);
    if (get(pageStore)==='login') pageStore.set('lobby')
      
    return true
  } catch (err) {
    removeAccessToken(); // 토큰 만료 or 오류 시 초기화
    return false
  }
}

async function checkRefreshToken() {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST'
    });

    if (!response.ok) throw new Error('유효하지 않은 토큰');

    const data = await response.json();
    setAuthSuccess({ id: data.user.id, nickname: data.user.nickname }, data.token);
    return true
  }
  catch (err) {
    removeAccessToken(); // 토큰 만료 or 오류 시 초기화
    return false
  }
}

