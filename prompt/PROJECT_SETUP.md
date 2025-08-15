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

