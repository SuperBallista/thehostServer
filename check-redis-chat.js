const Redis = require('ioredis');

async function checkRedisChat() {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
  });

  try {
    console.log('🔍 Redis 연결 성공');
    
    // 1. 모든 게임 관련 키 찾기
    console.log('\n=== 게임 관련 키 목록 ===');
    const gameKeys = await redis.keys('game:*');
    console.log(`총 ${gameKeys.length}개의 게임 키 발견:`);
    gameKeys.forEach(key => console.log(`  - ${key}`));
    
    // 2. 활성 게임 찾기
    console.log('\n=== 활성 게임 확인 ===');
    const gameDataKeys = gameKeys.filter(key => key.match(/^game:[^:]+$/));
    
    for (const gameKey of gameDataKeys) {
      const gameData = await redis.get(gameKey);
      if (gameData) {
        const parsed = JSON.parse(gameData);
        console.log(`게임 ID: ${gameKey.replace('game:', '')}`);
        console.log(`턴: ${parsed.turn}`);
        console.log(`호스트 ID: ${parsed.hostId}`);
      }
    }
    
    // 3. 채팅 로그가 있는 지역 키 찾기
    console.log('\n=== 채팅 로그 확인 ===');
    const regionKeys = gameKeys.filter(key => key.includes(':region:'));
    console.log(`${regionKeys.length}개의 지역 키 발견:`);
    
    for (const regionKey of regionKeys) {
      console.log(`\n--- ${regionKey} ---`);
      const regionData = await redis.get(regionKey);
      if (regionData) {
        const parsed = JSON.parse(regionData);
        if (parsed.chatLog && parsed.chatLog.length > 0) {
          console.log(`채팅 메시지 ${parsed.chatLog.length}개:`);
          parsed.chatLog.forEach((chat, index) => {
            console.log(`  ${index + 1}. [${chat.system ? '시스템' : `플레이어${chat.playerId}`}] ${chat.message}`);
            
            // 영어 아이템 코드 검색
            const englishItems = ['microphone', 'medicine', 'spray', 'wireless', 'eraser', 'shotgun', 'vaccine', 'virusChecker'];
            const foundItems = englishItems.filter(item => chat.message.includes(item));
            if (foundItems.length > 0) {
              console.log(`    ⚠️  영어 아이템 코드 발견: ${foundItems.join(', ')}`);
            }
          });
        } else {
          console.log('채팅 로그 없음');
        }
      }
    }
    
    // 4. 플레이어 데이터에서 아이템 확인
    console.log('\n=== 플레이어 아이템 확인 ===');
    const playerKeys = gameKeys.filter(key => key.includes(':player:'));
    
    for (const playerKey of playerKeys) {
      const playerData = await redis.get(playerKey);
      if (playerData) {
        const parsed = JSON.parse(playerData);
        if (parsed.items && parsed.items.length > 0) {
          console.log(`${playerKey}: [${parsed.items.join(', ')}]`);
        }
      }
    }
    
  } catch (error) {
    console.error('Redis 연결 실패:', error);
  } finally {
    redis.disconnect();
  }
}

checkRedisChat();