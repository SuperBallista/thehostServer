import type { ItemInterface } from '../../../../common/store/synchronize.type';

/**
 * Item strategy interface that all items must implement
 */
export interface ItemStrategy {
  name: string;
  info: string;
  code: ItemInterface;
  use(): Promise<boolean>;
}

/**
 * Base class for items that provides common functionality
 */
export abstract class BaseItemStrategy implements ItemStrategy {
  abstract name: string;
  abstract info: string;
  abstract code: ItemInterface;
  
  abstract use(): Promise<boolean>;
  
  /**
   * Helper method to validate if item can be used
   */
  protected canUse(): boolean {
    // Common validation logic can go here
    return true;
  }
}

/**
 * Item factory to create item instances
 */
export class ItemFactory {
  private static strategies: Map<ItemInterface, new () => ItemStrategy> = new Map();
  
  static register(code: ItemInterface, strategyClass: new () => ItemStrategy) {
    this.strategies.set(code, strategyClass);
  }
  
  static create(code: ItemInterface): ItemStrategy | null {
    const StrategyClass = this.strategies.get(code);
    if (!StrategyClass) {
      console.error(`No strategy registered for item: ${code}`);
      return null;
    }
    return new StrategyClass();
  }
  
  static getAll(): Map<ItemInterface, ItemStrategy> {
    const items = new Map<ItemInterface, ItemStrategy>();
    for (const [code, StrategyClass] of this.strategies) {
      items.set(code, new StrategyClass());
    }
    return items;
  }
}