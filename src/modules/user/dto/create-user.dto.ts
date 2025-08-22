import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsPhoneNumber, Max, Min } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsPhoneNumber('CN', { message: '请输入正确的中国大陆手机号' })
  phone: string;

  @IsInt()
  @Min(0)
  @Max(1)
  @ApiProperty({ description: '状态', example: 1 })
  status: number;

  @ApiProperty({ example: 'john.doe', description: '用户名' })
  username: string;
}
