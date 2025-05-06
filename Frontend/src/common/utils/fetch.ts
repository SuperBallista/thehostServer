// src/common/utils/fetch.ts
import { get } from 'svelte/store';
import { authStore } from '../store/authStore';

export async function authorizedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = get(authStore).token;

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });
}
