import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly lockPrefix = 'distributed_lock:';
  private readonly defaultTtl = 30000; // 30초

  constructor(private readonly redisService: RedisService) {}

  /**
   * 분산 락 획득 시도
   * @param key 락 키
   * @param ttl 락 만료 시간 (밀리초)
   * @param retryCount 재시도 횟수
   * @returns 락 획득 성공 여부
   */
  async acquireLock(
    key: string,
    ttl: number = this.defaultTtl,
    retryCount: number = 0,
  ): Promise<boolean> {
    const lockKey = this.lockPrefix + key;
    const lockValue = `${process.pid}_${Date.now()}_${Math.random()}`;

    try {
      // SET key value PX ttl NX (존재하지 않을 때만 설정)
      const result = await this.redisService.getClient().set(
        lockKey,
        lockValue,
        'PX',
        ttl,
        'NX',
      );

      if (result === 'OK') {
        this.logger.log(`🔒 Lock acquired: ${key} by process ${process.pid}`);
        return true;
      }

      // 재시도 로직
      if (retryCount > 0) {
        this.logger.warn(`🔄 Lock busy, retrying: ${key} by process ${process.pid} (${retryCount} retries left)`);
        await this.sleep(100 + Math.random() * 200); // 100-300ms 랜덤 대기
        return this.acquireLock(key, ttl, retryCount - 1);
      }

      this.logger.warn(`❌ Lock acquisition failed: ${key} by process ${process.pid}`);
      return false;
    } catch (error) {
      this.logger.error(`Error acquiring lock for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 분산 락 해제
   * @param key 락 키
   */
  async releaseLock(key: string): Promise<void> {
    const lockKey = this.lockPrefix + key;

    try {
      await this.redisService.getClient().del(lockKey);
      this.logger.log(`🔓 Lock released: ${key} by process ${process.pid}`);
    } catch (error) {
      this.logger.error(`Error releasing lock for key ${key}:`, error);
    }
  }

  /**
   * 락을 획득하고 작업을 실행한 후 자동으로 해제
   * @param key 락 키
   * @param fn 실행할 함수
   * @param ttl 락 만료 시간 (밀리초)
   * @param retryCount 재시도 횟수
   * @returns 함수 실행 결과 또는 null (락 획득 실패 시)
   */
  async executeWithLock<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.defaultTtl,
    retryCount: number = 3,
  ): Promise<T | null> {
    const lockAcquired = await this.acquireLock(key, ttl, retryCount);

    if (!lockAcquired) {
      this.logger.warn(`⚠️ Could not acquire lock for key: ${key} - skipping execution`);
      return null;
    }

    try {
      this.logger.log(`🚀 Executing with lock: ${key} by process ${process.pid}`);
      const result = await fn();
      this.logger.log(`✅ Completed execution: ${key} by process ${process.pid}`);
      return result;
    } catch (error) {
      this.logger.error(`Error executing function with lock ${key}:`, error);
      throw error;
    } finally {
      await this.releaseLock(key);
    }
  }

  /**
   * 락이 존재하는지 확인
   * @param key 락 키
   */
  async isLocked(key: string): Promise<boolean> {
    const lockKey = this.lockPrefix + key;
    try {
      const exists = await this.redisService.getClient().exists(lockKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`Error checking lock existence for key ${key}:`, error);
      return false;
    }
  }

  /**
   * 대기 함수
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}