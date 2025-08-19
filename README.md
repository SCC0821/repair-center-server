# NestJS 项目搭建指南

本指南将引导您完成一个基于 NestJS 的项目初始化和配置过程。

## 技术栈概览

- **包管理器**: `pnpm`
- **数据库**: `PostgreSQL` (通过 Docker 本地运行)
- **ORM**: `Prisma`
- **代码规范**: `ESLint` + `Prettier`
- **API 文档**: `Apifox` (外部工具)

---

## 步骤 1: 初始化 NestJS 项目

接下来，我们使用 NestJS 官方脚手架创建一个新项目。

```bash
# 1. 使用 npx 创建项目 (脚手架默认使用 npm)
npx @nestjs/cli new ocp-stream2-be

# 2. 进入项目目录
cd ocp-stream2-be

# 3. 转换为 pnpm 管理
# 删除 npm/yarn 的 lock 文件和依赖目录
rm -f package-lock.json yarn.lock
rm -rf node_modules

# 使用 pnpm 安装依赖
pnpm install
```

---

## 步骤 2: (推荐) 使用 Docker 配置本地开发数据库

为了实现纯净、一致且可快速重建的开发环境，强烈推荐使用 Docker 来管理本地的 PostgreSQL 数据库。

1. **创建 `docker-compose.yml` 文件**: 在项目根目录创建此文件，用于编排数据库服务。

   ```yaml
   # docker-compose.yml
   services:
     db:
       image: postgres
       restart: always
       environment:
         POSTGRES_USER: myuser
         POSTGRES_PASSWORD: mypassword
         POSTGRES_DB: mydatabase
       ports:
         - "5432:5432"
       volumes:
         - postgres-data:/var/lib/postgresql/data

   volumes:
     postgres-data:
   ```

2. **启动/停止数据库服务**:
   ```bash
   # 在后台启动数据库服务
   docker-compose up -d

   # 停止并移除数据库容器
   docker-compose down
   ```

---

## 步骤 3: 环境变量配置 (推荐方案)

为了项目的健壮性、安全性和可维护性，我们采用官方推荐的 `@nestjs/config` 模块来管理环境变量。

### 核心思想

- **`.env` 文件**: 使用 `.env` 系列文件存储配置，并将敏感信息（如 `.env`, `.env.local`）加入 `.gitignore`。
- **`@nestjs/config`**: 官方模块，用于加载和使用配置。
- **`Joi`**: 用于在程序启动时验证环境变量，确保关键配置不缺失。
- **动态加载**: 根据 `NODE_ENV` 环境变量（`development`, `production`）加载不同的配置文件。

### 1. 安装依赖

```bash
pnpm add @nestjs/config joi
```

### 2. 创建环境配置文件

在项目根目录创建以下文件：

- **`.env.development`**: 用于开发环境的配置。
  ```dotenv
  # .env.development
  NODE_ENV=development
  APP_PORT=3000
  # 连接到本地 Docker 数据库
  DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydatabase?schema=public"
  API_KEY="a_dev_api_key"
  ```

- **`.env.production`**: 用于生产环境的配置。
  ```dotenv
  # .env.production
  NODE_ENV=production
  APP_PORT=8080
  # 连接到生产数据库 (示例)
  DATABASE_URL="postgresql://prod_user:prod_password@prod_host:5432/prod_db?schema=public"
  API_KEY="a_production_api_key"
  ```

- **`.gitignore`**: 确保将包含敏感信息的文件排除在版本控制之外。
  ```gitignore
  # .gitignore
  # ... other ignores
  .env
  .env.*.local
  .env.local
  .env.development
  .env.production
  ```
  > **注意**: 通常我们会提交一个不含敏感信息的 `.env.example` 文件到 Git 仓库，以方便团队成员了解需要哪些环境变量。

### 3. 配置 ConfigModule

修改 `src/app.module.ts`，配置 `ConfigModule` 来动态加载和验证环境变量。

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

// ... other imports

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      // 根据 NODE_ENV 加载对应的 .env 文件
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      // 使用 Joi 进行环境变量验证
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        APP_PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        API_KEY: Joi.string().required(),
      }),
    }),
    // ... other modules
  ],
  // ...
})
export class AppModule {
}
```

> 如果应用启动时缺少 `DATABASE_URL` 或 `API_KEY`，程序会立即报错并退出，防止在运行时出现问题。

### 4. 在代码中使用

通过依赖注入 `ConfigService` 来安全地获取配置项。

```typescript
// src/any.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnyService {
  private readonly apiKey: string;
  
  constructor (private configService: ConfigService) {
    // 强烈建议在构造函数中获取并存储配置
    this.apiKey = this.configService.get<string>('API_KEY');
    
    if (!this.apiKey) {
      throw new Error('API_KEY is not configured!');
    }
  }
  
  doSomething () {
    // 使用 this.apiKey
    console.log(`Using API Key: ${this.apiKey}`);
  }
}
```

### 5. package.json 脚本

NestJS 的默认 `package.json` 脚本已经为我们设置好了 `NODE_ENV`，所以 `pnpm run start:dev` 会自动加载 `.env.development`
。在生产环境部署时，需要确保 `NODE_ENV` 环境变量被设置为 `production`。

## 步骤 4: 集成 Prisma 与 PostgreSQL

我们将 Prisma 集成到项目中，用于连接和操作数据库。

```bash
# 1. 安装 Prisma CLI 作为开发依赖
pnpm add -D prisma

# 2. 初始化 Prisma，并指定数据源为 PostgreSQL
# 这会创建 prisma/schema.prisma 和 .env 文件
pnpm prisma init --datasource-provider postgresql
```

**配置数据库连接:**

打开项目根目录下的 `.env` 文件，修改 `DATABASE_URL` 以连接到 **Docker 中运行的 PostgreSQL 容器**。

```env
# .env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/mydatabase?schema=public"
```

> 注意：这里的用户名、密码等信息需要与 `docker-compose.yml` 文件中 `environment` 部分的设置保持一致。

**创建数据模型并迁移:**

1. 打开 `prisma/schema.prisma` 文件，定义您的数据模型。例如，一个简单的 `User` 模型：

   ```prisma
   // prisma/schema.prisma
   model User {
     id    Int     @id @default(autoincrement())
     email String  @unique
     name  String?
   }
   ```

2. 运行数据库迁移命令，这会根据您的模型在 Docker 容器的数据库中创建或更新表结构。

   ```bash
   pnpm prisma migrate dev --name init
   ```

**生成并集成 Prisma Client:**

1. 安装 Prisma Client。

   ```bash
   pnpm add @prisma/client
   ```

2. 生成 Prisma Client。

   ```bash
   pnpm prisma generate
   ```

3. 创建一个可注入的 `PrismaService` (`src/prisma.service.ts`) 并将其注册到 `AppModule` 中（此部分与之前相同，此处不再赘述代码）。

---

## 步骤 5: 配置 ESLint 和 Prettier

为了保证代码质量和风格统一，我们配置 `ESLint` 和 `Prettier`。

```bash
# 1. 安装 Prettier 及其与 ESLint 集成的插件
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
```

后续步骤（创建 `.prettierrc`，更新 `.eslintrc.js`，添加 `scripts` 命令）与之前相同。

---

## 步骤 6: 启动与后续开发

至此，项目已基本配置完毕。

1. **确保数据库正在运行**:
   ```bash
   docker-compose up -d
   ```

2. **启动开发服务器:**
   ```bash
   pnpm run start:dev
   ```

3. **创建新功能:**
   ```bash
   pnpm nest g module users
   pnpm nest g controller users
   pnpm nest g service users
   ```

4. **API 文档:**
   在开发过程中，请记得在 `Apifox` 中同步创建和更新您的 API 文档。

---

## 步骤 7: 配置高性能日志 (Pino)

为了在生产环境中获得高性能且结构化的日志，我们集成 `pino`。对于开发环境，我们使用 `pino-pretty` 来美化输出，使其更易读。对于生产环境，我们使用 `pino-roll` 来实现日志的自动轮转（rotation），防止单个日志文件无限增大。

### 1. 安装依赖

```bash
# 安装 pino 核心库和 NestJS 集成库
pnpm add nestjs-pino pino-http

# 安装 pino-roll 用于生产环境日志轮转
pnpm add pino-roll

# 安装 pino-pretty 作为开发依赖，用于美化日志输出
pnpm add -D pino-pretty
```

### 2. 配置 AppModule

修改 `src/app.module.ts`，导入并配置 `LoggerModule`。这是所有配置的核心。

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
// ... other imports

@Module({
  imports: [
    // ... ConfigModule
    LoggerModule.forRoot({
      pinoHttp: {
        // 在生产环境中使用 pino-roll 进行日志轮转
        transport:
          process.env.NODE_ENV === 'production'
            ? {
                target: 'pino-roll',
                options: {
                  file: './logs/app.log', // 日志文件路径
                  frequency: 'daily',     // 按天轮转
                  size: '10M',            // 每个文件最大 10MB
                  mkdir: true,            // 自动创建目录
                },
              }
            : {
                // 在开发环境中使用 pino-pretty 美化输出
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  colorize: true,
                },
              },
        // 设置日志级别
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    // ... other modules
  ],
  // ...
})
export class AppModule {}
```

### 3. 修改 `main.ts`

为了让 NestJS 在应用启动时就完全接管日志，并能记录所有 HTTP 请求，需要修改 `src/main.ts`。

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino'; // 导入 Logger

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 缓冲日志，直到 pino logger 准备就绪
    bufferLogs: true,
  });

  // 将 pino 设置为全局 logger
  app.useLogger(app.get(Logger));

  await app.listen(3000);
}
bootstrap();
```

### 4. 在代码中使用 Logger

现在你可以在任何服务或控制器中注入并使用 `PinoLogger`。

```typescript
// src/any.service.ts
import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class AnyService {
  constructor(
    @InjectPinoLogger(AnyService.name)
    private readonly logger: PinoLogger,
  ) {}

  doSomething() {
    this.logger.info('This is an informational message.');
    this.logger.debug({ data: { user: 'test' } }, 'This is a debug message with context.');
    
    try {
      throw new Error('A sample error');
    } catch (error) {
      this.logger.error({ err: error }, 'Something went wrong.');
    }
  }
}
```

### 5. 更新 `.gitignore`

确保日志目录不被提交到 Git 仓库。

```gitignore
# .gitignore

# ... other ignores

# Log files
logs
```

### 运行效果

- **开发环境**: 运行 `pnpm run start:dev`，你将在控制台看到彩色的、单行显示的日志。
- **生产环境**: 设置 `NODE_ENV=production` 后运行应用，日志将以 JSON 格式写入到 `./logs/app.log` 文件中，并根据配置进行每日或按大小轮转。

---

## 步骤 8: 配置全局异常过滤器

为了捕获所有未处理的异常，并以统一、标准的格式返回给客户端，我们需要配置一个全局异常过滤器。

### 1. 创建过滤器文件

在 `src/common/filters/` 目录下创建一个新文件 `all-exceptions.filter.ts`。如果 `common/filters` 目录不存在，请先创建它。

```typescript
// src/common/filters/all-exceptions.filter.ts

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
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

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
          const potentialMessage = (errorResponse as Record<string, unknown>)
            .message;
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
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message, // 这里的赋值现在是类型安全的
    };

    if (status >= 500) {
      this.logger.error(
        `[Internal Error] ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[Business Exception] ${request.method} ${request.url} - ${JSON.stringify(
          errorResponse,
        )}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}
```

### 2. 全局注册过滤器

修改 `src/main.ts` 文件，在应用启动时注册这个全局过滤器。

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'; // 导入过滤器

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... 其他配置，例如 app.useLogger()

  // 注册为全局过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(3000);
}
bootstrap();
```

完成这些步骤后，应用中的任何未捕获异常都将被此过滤器处理，确保了API错误响应的一致性。

---

## 步骤 9: 接口版本控制 (API Versioning)

随着 API 的迭代，对接口进行版本控制是至关重要的。NestJS 提供了强大且灵活的内置版本控制方案。最常用的是 URI 版本控制（例如 `/v1/users`），它最清晰直观。

### 1. 在 `main.ts` 中启用版本控制

首先，在 `main.ts` 中启用版本控制功能，并指定策略为 URI。

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common'; // 1. 导入 VersioningType

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 2. 启用版本控制
  app.enableVersioning({
    type: VersioningType.URI, // 设置版本控制类型为 URI
    defaultVersion: '1',      // 可选：设置默认版本
  });

  // ... 其他配置
  
  await app.listen(3000);
}
bootstrap();
```

### 2. 在控制器中声明版本

启用后，就可以在控制器或路由上使用 `@Version()` 装饰器来声明它们所属的版本。

下面是一个 `users.controller.ts` 的例子，展示了如何管理 API 版本：

```typescript
// src/users/users.controller.ts
import { Controller, Get, Post, Version } from '@nestjs/common';

@Controller('users') // 基础路径是 /users
export class UsersController {

  // --- V1 的 API ---
  @Version('1') // 这个路由属于 V1 版本
  @Get()
  findAllV1() {
    // 访问 /v1/users 时会触发这里
    return { version: 1, data: [{ id: 1, name: 'User A' }] };
  }

  // --- V2 的 API ---
  @Version('2') // 这个路由属于 V2 版本
  @Get()
  findAllV2() {
    // 访问 /v2/users 时会触发这里
    // 假设 V2 返回了更详细的数据结构
    return {
      version: 2,
      data: [{ id: 1, name: 'User A', email: 'a@example.com' }],
      metadata: { count: 1 },
    };
  }

  // --- 某个 API 同时兼容 V1 和 V2 ---
  @Version(['1', '2']) // 使用数组来支持多个版本
  @Post()
  create() {
    // 访问 /v1/users 或 /v2/users 的 POST 请求都会触发这里
    return { message: 'User created successfully (compatible with v1 & v2)' };
  }

  // --- 某个 API 只在 V2 中新增 ---
  @Version('2')
  @Get('profile')
  getProfile() {
    // 只有访问 /v2/users/profile 时才能触发
    return { message: 'This is a new feature in V2' };
  }
}
```

通过这种方式，你可以让新旧版本的 API 在同一套代码中平滑地共存和演进。

---

## 步骤 10: 集成 API 文档 (Swagger & Apifox)

为了保持 API 文档与代码同步，并方便团队协作和测试，我们采用“代码驱动文档”的策略。通过 `@nestjs/swagger` 包自动从代码生成 OpenAPI 规范，然后将其导入 Apifox。

### 1. 安装依赖

```bash
pnpm add @nestjs/swagger
```

### 2. 在 `main.ts` 中初始化 Swagger

在应用启动时，配置 Swagger 模块来扫描代码并生成文档。

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ... 其他配置 ...

  // 配置 Swagger 文档
  const config = new DocumentBuilder()
    .setTitle('维修中心 API 文档')
    .setDescription('这是维修中心项目的 API 详细文档')
    .setVersion('1.0')
    .addTag('users', '用户模块')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // 设置文档访问路径为 /api-docs

  await app.listen(3000);
}
bootstrap();
```

### 3. 使用装饰器丰富 API 信息

为了生成内容详尽的文档，你需要在 DTO 和 Controller 中添加由 `@nestjs/swagger` 提供的装饰器。

**示例 DTO:**
```typescript
// src/users/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john.doe', description: '用户名' })
  username: string;

  @ApiProperty({ example: 'password123', description: '用户密码' })
  password: string;
}
```

**示例 Controller:**
```typescript
// src/users/users.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users') // 将接口归类到 'users' 标签
@Controller('users')
export class UsersController {
  @Post()
  @ApiOperation({ summary: '创建新用户' }) // 描述操作
  @ApiResponse({ status: 201, description: '创建成功' })
  create(@Body() createUserDto: CreateUserDto) {
    // ...
  }
}
```

### 4. 导入到 Apifox

**方式一：URL 导入 (推荐)**

1.  启动 NestJS 应用: `pnpm run start:dev`。
2.  应用启动后，访问 `http://localhost:3000/api-docs-json` 即可看到生成的 OpenAPI (JSON) 规范。
3.  在 Apifox 中，选择 “导入” -> “URL”，粘贴上述地址即可。Apifox 还可以设置定时同步，实现文档的自动更新。

**方式二：文件导入**

1.  在 Apifox 中选择 “导入” -> “文件”，上传由 `SwaggerModule` 生成的 JSON 文件。
2.  你可以编写一个简单的脚本来将 OpenAPI 对象保存为本地 `swagger.json` 文件，方便在 CI/CD 流程中使用。

---

## 步骤 11: (推荐) 配置路径别名 (Path Alias)

为了避免在项目中出现大量 `../../` 这样的相对路径，配置路径别名（例如，让 `@/` 指向 `src/`）是一个能极大提升代码可读性和可维护性的最佳实践。

配置分为两步：让 TypeScript (编译时) 和 Node.js (运行时) 都能理解别名。

### 1. 修改 `tsconfig.json` (配置编译时解析)

在 `tsconfig.json` 的 `compilerOptions` 中，添加 `baseUrl` 和 `paths` 属性。

```json
// tsconfig.json
{
  "compilerOptions": {
    // ... other options
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```
- `baseUrl`: 设置路径解析的基准目录。
- `paths`: 定义别名规则。`@/*` 会被解析为 `src/*`。

### 2. 修改启动命令 (配置运行时解析)

Node.js 默认不认识别名，我们需要 `tsconfig-paths` 这个库来帮助它。

**A. 安装依赖**
```bash
pnpm add -D tsconfig-paths
```

**B. 修改 `package.json`**

更新 `start:prod` 脚本，使用 `-r` (`--require`) 标志在应用启动前加载 `tsconfig-paths`。

**修改前:**
```json
"scripts": {
  "start:prod": "node dist/main"
}
```

**修改后:**
```json
"scripts": {
  "start:prod": "node -r tsconfig-paths/register dist/main"
}
```
> `start:dev` 命令通常无需修改，Nest CLI 会自动处理。

### 3. 使用别名

现在，你可以用更清晰的方式进行导入了。

**告别:** `import { UsersService } from '../../users/users.service';`
**拥抱:** `import { UsersService } from '@/users/users.service';`