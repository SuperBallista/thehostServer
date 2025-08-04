const Redis = require('ioredis');

class DistributedLockTester {
  constructor() {
    this.redis = new Redis({
      host: 'localhost',
      port: 3407, // 도커 Redis 포트
    });
    this.lockPrefix = 'distributed_lock:';
    this.testResults = [];
  }

  async acquireLock(key, ttl = 5000) {
    const lockKey = this.lockPrefix + key;
    const lockValue = `${process.pid}_${Date.now()}_${Math.random()}`;
    
    try {
      const result = await this.redis.set(lockKey, lockValue, 'PX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('Lock acquisition error:', error);
      return false;
    }
  }

  async releaseLock(key) {
    const lockKey = this.lockPrefix + key;
    try {
      await this.redis.del(lockKey);
    } catch (error) {
      console.error('Lock release error:', error);
    }
  }

  async simulateWork(duration = 1000) {
    return new Promise(resolve => setTimeout(resolve, duration));
  }

  async testConcurrentLocks(lockKey, workerCount = 5, workDuration = 2000) {
    console.log(`🧪 Testing ${workerCount} concurrent workers on lock: ${lockKey}`);
    
    const workers = [];
    const results = [];

    for (let i = 0; i < workerCount; i++) {
      const worker = this.createWorker(i, lockKey, workDuration, results);
      workers.push(worker);
    }

    // 모든 워커를 동시에 시작
    await Promise.all(workers);

    // 결과 분석
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 테스트 결과:`);
    console.log(`✅ 성공한 워커: ${successful}/${workerCount}`);
    console.log(`❌ 실패한 워커: ${failed}/${workerCount}`);
    console.log(`🎯 락 정확성: ${successful === 1 ? '✅ 완벽' : '❌ 중복 실행 발생'}`);

    return { successful, failed, isCorrect: successful === 1 };
  }

  async createWorker(workerId, lockKey, workDuration, results) {
    const startTime = Date.now();
    
    try {
      console.log(`👷 Worker ${workerId}: 락 획득 시도 중...`);
      
      const lockAcquired = await this.acquireLock(lockKey, 10000);
      
      if (lockAcquired) {
        console.log(`🔒 Worker ${workerId}: 락 획득 성공! 작업 시작...`);
        
        // 시뮬레이션 작업
        await this.simulateWork(workDuration);
        
        console.log(`✅ Worker ${workerId}: 작업 완료, 락 해제`);
        await this.releaseLock(lockKey);
        
        results.push({
          workerId,
          success: true,
          duration: Date.now() - startTime
        });
      } else {
        console.log(`❌ Worker ${workerId}: 락 획득 실패`);
        results.push({
          workerId,
          success: false,
          duration: Date.now() - startTime
        });
      }
    } catch (error) {
      console.error(`💥 Worker ${workerId} 오류:`, error);
      results.push({
        workerId,
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      });
    }
  }

  async runMultipleTests() {
    console.log('🚀 분산 락 스트레스 테스트 시작\n');

    const testCases = [
      { name: '기본 테스트 (5 워커)', workers: 5, duration: 1000 },
      { name: '고부하 테스트 (10 워커)', workers: 10, duration: 500 },
      { name: '장기 작업 테스트 (3 워커)', workers: 3, duration: 3000 },
    ];

    for (const testCase of testCases) {
      console.log(`\n🧪 ${testCase.name}`);
      console.log('='.repeat(50));
      
      const lockKey = `test_${Date.now()}`;
      const result = await this.testConcurrentLocks(
        lockKey, 
        testCase.workers, 
        testCase.duration
      );

      if (!result.isCorrect) {
        console.log('⚠️  경고: 분산 락이 제대로 작동하지 않습니다!');
      }

      // 테스트 간 간격
      await this.simulateWork(1000);
    }

    console.log('\n🏁 모든 테스트 완료');
    await this.redis.quit();
  }
}

// 테스트 실행
if (require.main === module) {
  const tester = new DistributedLockTester();
  tester.runMultipleTests().catch(console.error);
}