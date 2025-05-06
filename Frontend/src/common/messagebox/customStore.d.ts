export declare const accessToken: import("svelte/store").Writable<string | null>;
export declare function authFetch(endpoint: string, method?: string, // 특정 메서드로 제한하지 않음
body?: any): Promise<Response>;
export declare const isOpen: import("svelte/store").Writable<boolean>;
export declare const messageType: import("svelte/store").Writable<"error" | "confirm" | "alert" | "loading" | "input" | "success" | null>;
export declare const messageTitle: import("svelte/store").Writable<string>;
export declare const messageContent: import("svelte/store").Writable<string>;
export declare const messageColor: import("svelte/store").Writable<string>;
export declare const messageInputs: import("svelte/store").Writable<{
    key: string;
    label: string;
    type?: string;
    placeholder?: string;
    value: any;
}[]>;
export declare const messageResolve: import("svelte/store").Writable<((res: {
    success: boolean;
    values?: Record<string, string>;
}) => void) | null>;
export declare const messageIcon: import("svelte/store").Writable<string | null>;
export type MessageBoxOptions = {
    type?: "error" | "confirm" | "alert" | "loading" | "input" | "success";
    title?: string;
    message?: string;
    color?: string;
    inputs?: {
        key: string;
        label: string;
        type?: string;
        placeholder?: string;
        value: any;
    }[];
};
type MessageBoxResponse = {
    success: boolean;
    values?: Record<string, string>;
};
export declare function showMessageBox(type: "error" | "confirm" | "alert" | "loading" | "input" | "success", title: string, message: string, color?: string, inputs?: {
    key: string;
    label: string;
    type?: string;
    value?: any;
    placeholder?: string;
}[]): Promise<MessageBoxResponse>;
export declare function closeMessageBox(): void;
export {};
