import { get, writable } from "svelte/store";
import tooltipMessageData from "../message/tooltipMessage.json";

export type FocusUIKey = 'regionInfo' | 'regionMessage' | 'turnInfo';

export const tutorialStep = writable<number>(0);


export const tooltipMessage = writable<string[]>(tooltipMessageData);
