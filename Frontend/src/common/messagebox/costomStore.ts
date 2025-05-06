import { writable } from "svelte/store";



export async function authFetch(
    endpoint: string,
    method: string = "GET", // 특정 메서드로 제한하지 않음
    accessToken: string | null = "",
    body: any = null,
  ) {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
  
    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken}`;
    }
  
    const options: RequestInit = {
      method,
      headers,
      credentials: "include", // 쿠키 자동 포함
    };
  
    if (body && method !== "GET" && method !== "HEAD") {
      options.body = JSON.stringify(body);
    }      
    try{
    const response = await fetch("/api/auth" + endpoint, options)
    
    const newAccessToken = response.headers.get('Authorization')?.split('Bearer ')[1];
    return {response, newAccessToken:newAccessToken || "" }
  }
  catch (error)
  {
    throw error;
  }
  }
  
  
  export type MessageBoxOptions = {
    type?: "error" | "confirm" | "alert" | "loading" | "input" | "success";
    title?: string;
    message?: string;
    loadingMessage?: string;
    color?: string;
    inputs?: { key: string; label: string; type?: string; placeholder?: string }[];
  };
  
  type MessageBoxResponse = { success: boolean; values?: Record<string, string> };
  
  const messageBox = writable<{ options: MessageBoxOptions; resolve: (res: MessageBoxResponse) => void } | null>(null);
  
  export function showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResponse> {
    return new Promise((resolve) => {
      messageBox.set({ options, resolve });
    });
  }
  
  export function closeMessageBox() {
    messageBox.set(null);
  }
  
  export { messageBox };
  
  
