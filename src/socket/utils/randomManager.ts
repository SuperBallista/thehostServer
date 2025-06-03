export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getOrderRandom<T>(array: T[]): T[] {
  const result = [...array]; // 원본 배열을 복사
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); // 0 이상 i 이하 정수
    [result[i], result[j]] = [result[j], result[i]]; // swap
  }
  return result;
}

