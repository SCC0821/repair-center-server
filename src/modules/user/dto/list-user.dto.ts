import { PaginationQueryDto } from '@/common/dto/pagination-query.dto';
import { IsInt, IsOptional, IsPhoneNumber, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class ListUserDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'john.doe', description: '用户名' })
  userName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  @ApiProperty({ description: '状态', example: 1 })
  status?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: '手机号', example: '13800138000' })
  @IsPhoneNumber('CN', { message: '请输入正确的中国大陆手机号' })
  phone?: string;
}
