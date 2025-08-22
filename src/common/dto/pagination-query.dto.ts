import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDto {
  @Type(() => Number) // 将查询参数（字符串）转为数字
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于1' })
  @ApiProperty({ description: '页码', example: 1 })
  pageNum: number = 1;

  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(100, { message: '每页数量不能超过100' }) // 设置一个最大值，防止恶意请求
  @ApiProperty({ description: '每页数量', example: 10 })
  pageSize: number = 10;
}
