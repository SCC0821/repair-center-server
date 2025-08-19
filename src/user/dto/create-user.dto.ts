import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe', description: '用户名' })
  username: string;

  @ApiProperty({ example: 'password123', description: '用户密码' })
  password: string;
}
