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
   * 게임 소유권 획득 (게임 전체 기간 동안 유지)
   * @param gameId 게임 ID
   * @param maxGameDuration 최대 게임 지속 시간 (밀리초, 기본 3시간)
   * @returns 소유권 획득 성공 여부
   */
  async acquireGameOwnership(
    gameId: string,
    maxGameDuration: number = 3 * 60 * 60 * 1000 // 3시간
  ): Promise<boolean> {
    const ownershipKey = `game_owner:${gameId}`;
    const ownerValue = `${process.pid}_${Date.now()}`;

    try {
      // 게임 소유권을 획득 시도 (이미 존재하면 실패)
      const result = await this.redisService.getClient().set(
        ownershipKey,
        ownerValue,
        'PX',
        maxGameDuration,
        'NX',
      );

      if (result === 'OK') {
        this.logger.log(`👑 Game ownership acquired: ${gameId} by process ${process.pid}`);
        return true;
      }

      // 현재 소유자 확인
      const currentOwner = await this.redisService.getClient().get(ownershipKey);
      this.logger.warn(
        `👑 Game ownership already held: ${gameId} by ${currentOwner} (current process: ${process.pid})`
      );
      return false;
    } catch (error) {
      this.logger.error(`Error acquiring game ownership for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * 게임 소유권 확인
   * @param gameId 게임 ID
   * @returns 현재 프로세스가 소유권을 가지고 있는지 여부
   */
  async hasGameOwnership(gameId: string): Promise<boolean> {
    const ownershipKey = `game_owner:${gameId}`;
    
    try {
      const currentOwner = await this.redisService.getClient().get(ownershipKey);
      if (!currentOwner) {
        return false;
      }

      // 소유자 정보에서 프로세스 ID 추출
      const [ownerPid] = currentOwner.split('_');
      const isOwner = ownerPid === process.pid.toString();
      
      if (isOwner) {
        this.logger.debug(`👑 Confirmed game ownership: ${gameId} by process ${process.pid}`);
      }
      
      return isOwner;
    } catch (error) {
      this.logger.error(`Error checking game ownership for ${gameId}:`, error);
      return false;
    }
  }

  /**
   * 게임 소유권 해제
   * @param gameId 게임 ID
   */
  async releaseGameOwnership(gameId: string): Promise<void> {
    const ownershipKey = `game_owner:${gameId}`;
    
    try {
      const currentOwner = await this.redisService.getClient().get(ownershipKey);
      if (currentOwner) {
        const [ownerPid] = currentOwner.split('_');
        if (ownerPid === process.pid.toString()) {
          await this.redisService.getClient().del(ownershipKey);
          this.logger.log(`👑 Game ownership released: ${gameId} by process ${process.pid}`);
        } else {
          this.logger.warn(
            `👑 Cannot release game ownership: ${gameId} is owned by process ${ownerPid}, not ${process.pid}`
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error releasing game ownership for ${gameId}:`, error);
    }
  }

  /**
   * 게임 소유권 연장 (게임이 길어질 경우)
   * @param gameId 게임 ID
   * @param additionalTime 추가 시간 (밀리초)
   */
  async extendGameOwnership(gameId: string, additionalTime: number = 60 * 60 * 1000): Promise<boolean> {
    const ownershipKey = `game_owner:${gameId}`;
    
    try {
      const hasOwnership = await this.hasGameOwnership(gameId);
      if (!hasOwnership) {
        this.logger.warn(`👑 Cannot extend ownership: ${gameId} not owned by process ${process.pid}`);
        return false;
      }

      // TTL 연장
      await this.redisService.getClient().pexpire(ownershipKey, additionalTime);
      this.logger.log(`👑 Game ownership extended: ${gameId} by ${additionalTime}ms`);
      return true;
    } catch (error) {
      this.logger.error(`Error extending game ownership for ${gameId}:`, error);
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