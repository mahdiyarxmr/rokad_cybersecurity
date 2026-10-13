import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { BruteForceService } from './brute-force.service';

@Global()
@Module({
  providers: [RedisService, BruteForceService],
  exports: [RedisService, BruteForceService],
})
export class RedisModule {}
