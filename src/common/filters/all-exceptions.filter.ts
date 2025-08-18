import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // 使用类型守卫来安全地提取错误信息
    const getErrorMessage = (): string => {
      if (exception instanceof HttpException) {
        const errorResponse = exception.getResponse();
        if (typeof errorResponse === 'string') {
          return errorResponse;
        }
        // 采用更安全的类型守卫方式
        if (typeof errorResponse === 'object' && errorResponse !== null) {
          // 先将属性作为一个 unknown 类型取出
          const potentialMessage = (errorResponse as Record<string, unknown>).message;
          // 然后再对取出的值进行类型检查
          if (typeof potentialMessage === 'string') {
            return potentialMessage;
          }
        }
      }
      return 'Internal Server Error';
    };

    const message = getErrorMessage();

    const errorResponse = {
      code: status,
      message, // 这里的赋值现在是类型安全的
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (status >= 500) {
      this.logger.error(
        `[Internal Error] ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[Business Exception] ${request.method} ${request.url} - ${JSON.stringify(errorResponse)}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
