const BASE32_CHARSET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const TAG_PADDING_WIDTH = 4;

export function encodeBase32(n: number): string {
  if (n === 0) {
    return '0';
  }

  let result = '';
  let num = n;

  while (num > 0) {
    result = BASE32_CHARSET[num % 32] + result;
    num = Math.floor(num / 32);
  }

  // 패딩 추가
  while (result.length < TAG_PADDING_WIDTH) {
    result = '0' + result;
  }

  return result;
}
