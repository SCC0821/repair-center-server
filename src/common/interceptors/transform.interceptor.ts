import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// 定义标准响应的接口结构
export interface StandardResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>, // 1. 将 CallHandler<any> 明确为 CallHandler<T>
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        // 2. 这里的 `data` 现在被正确推断为类型 T
        code: 200,
        message: 'success',
        data,
      })),
    );
  }
}
