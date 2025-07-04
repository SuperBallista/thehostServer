import { ItemFactory, type ItemStrategy } from './items/ItemStrategy';
import { registerAllItems } from './items/strategies';
import type { ItemInterface } from '../../../common/store/synchronize.type';

// Initialize and register all items
registerAllItems();

/**
 * Get item list with all registered items
 */
export function getItemList(): Record<string, { name: string; info: string; method: () => Promise<boolean> }> {
  const items = ItemFactory.getAll();
  const itemList: Record<string, { name: string; info: string; method: () => Promise<boolean> }> = {};
  
  for (const [code, strategy] of items) {
    itemList[code] = {
      name: strategy.name,
      info: strategy.info,
      method: () => strategy.use()
    };
  }
  
  return itemList;
}

/**
 * Use an item by its code
 */
export async function useItem(itemCode: ItemInterface): Promise<boolean> {
  const strategy = ItemFactory.create(itemCode);
  if (!strategy) {
    console.error(`Item strategy not found for: ${itemCode}`);
    return false;
  }
  
  return await strategy.use();
}

/**
 * Get item info by code
 */
export function getItemInfo(itemCode: ItemInterface): { name: string; info: string } | null {
  const strategy = ItemFactory.create(itemCode);
  if (!strategy) {
    return null;
  }
  
  return {
    name: strategy.name,
    info: strategy.info
  };
}

// Export for backward compatibility
export const itemList = getItemList();