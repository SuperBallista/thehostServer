export declare function authFetch(endpoint: string, method?: string, body?: any): Promise<Response>;
export declare const isOpen: import("svelte/store").Writable<boolean>;
export declare const messageType: import("svelte/store").Writable<"error" | "success" | "confirm" | "alert" | "loading" | "input" | "tips" | "turn" | null>;
export declare const messageTitle: import("svelte/store").Writable<string>;
export declare const messageContent: import("svelte/store").Writable<string | ((values: Record<string, any>) => string)>;
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
    type?: "error" | "confirm" | "alert" | "loading" | "input" | "success" | 'tips' | 'turn';
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
    image?: string;
};
type MessageBoxResponse = {
    success: boolean;
    values?: Record<string, string>;
};
export declare function showMessageBox(type: "error" | "confirm" | "alert" | "loading" | "input" | "success" | 'tips' | 'turn' | 'turn', title: string, message: string | ((values: Record<string, any>) => string), color?: string, inputs?: {
    key: string;
    label: string;
    type?: string;
    value?: any;
    placeholder?: string;
}[], image?: string): Promise<MessageBoxResponse>;
export declare function closeMessageBox(): void;
export declare const imageSrc: import("svelte/store").Writable<string | undefined>;
export {};
