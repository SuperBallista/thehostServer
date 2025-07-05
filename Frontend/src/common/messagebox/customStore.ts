import { writable } from "svelte/store";
import defaultColor from "./config/messageBoxColor.json"

const accessToken = sessionStorage.getItem('accessToken')

export async function authFetch(
    endpoint: string,
    method: string = "GET", // 특정 메서드로 제한하지 않음
    body: object | null = null,
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

    return response
  }
  catch (error)
  {
    throw error;
  }
  }
  


export const isOpen = writable<boolean>(false);
export const messageType = writable<"error" | "confirm" | "alert" | "loading" | "input" | "success" | "tips" | 'turn' | null>(null);
export const messageTitle = writable<string>("");
export const messageContent = writable<
  string | ((values: Record<string, string | number | boolean>) => string)
>("");
export const messageColor = writable<string>(defaultColor["default-title-background"]);
export const messageInputs = writable<{ key: string; label: string; type?: string; placeholder?: string, value: string | number | boolean }[]>([]);
export const messageResolve = writable<((res: { success: boolean; values?: Record<string, string> }) => void) | null>(null);
export const messageIcon = writable<string | null>(null); // ✅ 아이콘을 직접 저장

const messageIcons = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  error: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12.5" cy="12.5" r="10"/><line x1="12.5" y1="8" x2="12.5" y2="16"/><line x1="8" y1="12.5" x2="16" y2="12.5"/></svg>`,
  alert: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 9v4"/><path d="M12.5 17h.01"/><path d="M21 19H3a2 2 0 0 1-1.74-3l9-15a2 2 0 0 1 3.48 0l9 15a2 2 0 0 1-1.74 3Z"/></svg>`,
  loading: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12.5" y1="2" x2="12.5" y2="6"/><line x1="12.5" y1="18" x2="12.5" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12.5" x2="6" y2="12.5"/><line x1="18" y1="12.5" x2="22" y2="12.5"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
  input: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z"/></svg>`,
  confirm: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12.5 14 22 4"/><path d="M21 12.5v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
  tips: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-badge-info-icon lucide-badge-info"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/></svg>`,
  turn: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 9v4"/><path d="M12.5 17h.01"/><path d="M21 19H3a2 2 0 0 1-1.74-3l9-15a2 2 0 0 1 3.48 0l9 15a2 2 0 0 1-1.74 3Z"/></svg>`
};


  export type MessageBoxOptions = {
    type?: "error" | "confirm" | "alert" | "loading" | "input" | "success" | 'tips' | 'turn' ;
    title?: string;
    message?: string;
    color?: string;
    inputs?:  { key: string; label: string; type?: string; placeholder?: string, value: string | number | boolean }[];
    image?: string
  };
  
  type MessageBoxResponse = { success: boolean; values?: Record<string, string> };
    
export function showMessageBox(
  type: "error" | "confirm" | "alert" | "loading" | "input" | "success" | 'tips' | 'turn' | 'turn' ,
  title: string,
  message: string | ((values: Record<string, string | number | boolean>) => string),
  color?: string,
  inputs?: { key: string; label: string; type?: string; value?: string | number | boolean; placeholder?: string }[],
  image?:string
): Promise<MessageBoxResponse> {
  return new Promise((resolve) => {
    isOpen.set(true);
    messageType.set(type ?? null);
    messageTitle.set(title ?? "제목 없음");

    // ✅ 메시지를 함수로도 받을 수 있게 수정
    messageContent.set(message); // string | function

    messageColor.set(color ?? defaultColor["default-title-background"]);

    imageSrc.set(image)

    messageInputs.set(
      inputs?.map((input) => ({
        ...input,
        value: input.value ?? ""
      })) ?? []
    );

    messageResolve.set(resolve);
    messageIcon.set(messageIcons[type] ?? null);

    if (type === "success") {
      setTimeout(() => {
        resolve({ success: true });
        closeMessageBox();
      }, 3500);
    }
  });
}
  
  export function closeMessageBox() {
  
    isOpen.set(false);
    messageType.set(null);
    messageTitle.set("");
    messageContent.set("");
    messageColor.set("#3498db");
    messageInputs.set([]);
    messageResolve.set(null);
    messageIcon.set(null);
  }

  export const imageSrc = writable<string|undefined>(undefined)
