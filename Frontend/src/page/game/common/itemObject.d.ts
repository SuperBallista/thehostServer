import type { ItemInterface } from "../../../common/store/synchronize.type";
type UseMethod = () => Promise<boolean>;
export declare class Item {
    code: string;
    name: string;
    tooltip: string;
    useMethod: UseMethod;
    constructor(code: ItemInterface);
    giveItem(): Promise<void>;
    use(): Promise<void>;
}
export {};
