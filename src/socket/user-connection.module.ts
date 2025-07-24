import { Module } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { UserModule } from '../user/user.module';
// 필요시 추가 서비스 import

@Module({
  imports: [UserModule],
  providers: [ConnectionService],
  exports: [ConnectionService],
})
export class UserConnectionModule {}
