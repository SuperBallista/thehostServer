import { ITEM_NAMES } from '../../socket/game/game.types';

// 한글 이름 -> 아이템 코드 매핑 (역방향 매핑)
export const KOREAN_TO_ITEM_CODE = Object.entries(ITEM_NAMES).reduce((acc, [code, name]) => {
  if (name) {
    acc[name] = code;
  }
  return acc;
}, {} as Record<string, string>);

// 아이템 코드 -> 한글 이름 매핑 (순방향 매핑)
export const ITEM_CODE_TO_KOREAN = ITEM_NAMES;

/**
 * 한글 아이템 이름을 아이템 코드로 변환
 */
export function convertKoreanToItemCode(koreanName: string): string | null {
  return KOREAN_TO_ITEM_CODE[koreanName] || null;
}

/**
 * 아이템 코드를 한글 이름으로 변환
 */
export function convertItemCodeToKorean(itemCode: string): string | null {
  return ITEM_CODE_TO_KOREAN[itemCode] || null;
}

/**
 * 텍스트에서 한글 아이템 이름들을 찾아서 코드로 변환
 */
export function extractAndConvertItems(text: string): { korean: string; code: string }[] {
  const items: { korean: string; code: string }[] = [];
  
  // 모든 한글 아이템 이름을 찾아서 변환
  Object.keys(KOREAN_TO_ITEM_CODE).forEach(koreanName => {
    if (text.includes(koreanName)) {
      const code = KOREAN_TO_ITEM_CODE[koreanName];
      items.push({ korean: koreanName, code });
    }
  });
  
  return items;
}

/**
 * 플레이어 이름에서 동물 닉네임을 찾아서 플레이어 ID로 변환
 */
export function extractPlayerIdFromNickname(text: string, animalNicknames: string[]): number | null {
  for (let i = 0; i < animalNicknames.length; i++) {
    if (text.includes(animalNicknames[i])) {
      return i;
    }
  }
  return null;
} 