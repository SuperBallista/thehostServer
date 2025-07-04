# Item System Migration Guide

## Overview
The item system has been refactored from a single large object to use the Strategy pattern. This provides better organization, testability, and extensibility.

## Key Changes

### Before (itemObject.ts)
```typescript
// All items in one large object
export const itemList = {
  spray: {
    name: '낙서스프레이',
    info: '구역에 낙서를 남겨...',
    method: useSpray,
  },
  // ... all other items
};

// Separate functions for each item
async function useSpray(): Promise<boolean> { /* ... */ }
async function useVaccine(): Promise<boolean> { /* ... */ }
// ... etc
```

### After (Strategy Pattern)
```typescript
// Each item is its own class
export class SprayItem extends BaseItemStrategy {
  name = '낙서스프레이';
  info = '구역에 낙서를 남겨...';
  code: ItemInterface = 'spray';
  
  async use(): Promise<boolean> {
    // Item logic here
  }
}
```

## Migration Steps

### 1. Update Imports
Replace:
```typescript
import { itemList } from './itemObject';
```

With:
```typescript
import { itemList } from './itemObjectRefactored';
// or
import { useItem, getItemInfo } from './itemObjectRefactored';
```

### 2. Using Items
The interface remains the same for backward compatibility:
```typescript
// Old way (still works)
const item = itemList['spray'];
await item.method();

// New way (recommended)
import { useItem } from './itemObjectRefactored';
await useItem('spray');
```

### 3. Adding New Items

Create a new file in `items/strategies/`:
```typescript
import { BaseItemStrategy } from '../ItemStrategy';
import { ItemService } from '../ItemService';

export class NewItem extends BaseItemStrategy {
  name = '새 아이템';
  info = '아이템 설명';
  code: ItemInterface = 'newItem';
  
  async use(): Promise<boolean> {
    // Implement item logic
    return await ItemService.sendUseItemRequest(this.code);
  }
}
```

Then register it in `items/strategies/index.ts`:
```typescript
import { NewItem } from './NewItem';

export function registerAllItems() {
  // ... existing registrations
  ItemFactory.register('newItem', NewItem);
}
```

## Benefits of the New Structure

1. **Separation of Concerns**: Each item has its own file
2. **Testability**: Items can be tested individually
3. **Type Safety**: Better TypeScript support
4. **Extensibility**: Easy to add new items without modifying existing code
5. **Reusability**: Common logic can be added to BaseItemStrategy

## Migration Complete ✅

All 11 items have been successfully migrated to the Strategy pattern:
- SprayItem
- VirusCheckerItem
- VaccineItem
- EraserItem
- MedicineItem
- VaccineMaterialA/B/C Items (using shared base class)
- ShotgunItem
- WirelessItem
- MicrophoneItem

## Next Steps

1. **Remove old itemObject.ts**: Once all components are verified to work with the new system
2. **Rename itemObjectRefactored.ts to itemObject.ts**: For cleaner imports
3. **Add unit tests**: Each item strategy can now be tested independently