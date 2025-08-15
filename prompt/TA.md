# 社区报修项目 - 后端技术架构设计文档 (TA)

## 1. 概述

本文档为“社区报修”小程序及其后台管理系统提供后端服务的技术架构设计。

本文档的核心读者是**前端开发人员**。因此，在技术选型和架构设计上，我们优先考虑以下几点：

-   **易于上手**：选择拥有清晰文档和良好社区支持的框架。
-   **结构化与规范化**：框架应提供或鼓励使用清晰的、模块化的代码结构，减少心智负担。
-   **类型安全**：全程使用 TypeScript，与前端技术栈保持一致，最大化代码可靠性。

## 2. 技术选型 

| 分类 | 技术 | 理由 |
| :--- | :--- | :--- |
| **核心框架** | **NestJS** | 一个开箱即用的 Node.js 框架，基于 TypeScript，架构上借鉴了 Angular，提供了模块化、依赖注入等强大的组织代码的能力，非常适合构建可维护的企业级应用。 |
| **数据库** | **PostgreSQL** | 功能强大且稳定的开源关系型数据库。（备选：**MySQL**，同样稳定且广泛使用）。 |
| **ORM** | **Prisma** | 新一代的 Node.js 和 TypeScript ORM。它提供完全类型安全的数据库访问、自动生成的数据查询客户端和直观的数据建模方式，对开发者（尤其是前端背景）极为友好。 |
| **认证方案** | **JWT (JSON Web Tokens)** | 使用 `passport-jwt` 策略，实现无状态的 API 认证，完美契合小程序和 Web 应用的需求。 |
| **数据校验** | **class-validator** | 与 NestJS 无缝集成，通过装饰器的方式对请求数据（DTOs）进行校验，代码直观且易于维护。 |
| **代码规范** | **ESLint + Prettier** | 与前端项目保持一致，统一代码风格。 |
| **部署方案** | **Docker** | 通过容器化实现开发、测试、生产环境的一致性，简化部署流程。 |

## 3. 项目结构 (NestJS)

NestJS 提供了标准的项目结构，我们在此基础上进行模块化开发。

```
/repair-center-serve
|
├── prisma/
│   └── schema.prisma       # Prisma 数据模型定义文件
|
├── src/
│   ├── main.ts             # 应用入口，启动 NestJS 应用
│   │
│   ├��─ app.module.ts       # 根模块
│   │
│   ├── common/             # 全局通用模块/服务
│   │   ├── guards/         # 路由守卫 (如：角色权限守卫)
│   │   └── decorators/     # 自定义装饰器 (如：获取用户信息)
│   │
│   ├── config/             # 配置管理
│   │   └── index.ts
│   │
│   └── modules/            # 核心业务模块
│       ├── auth/           # 认证模块
│       ├── user/           # 用户管理模块
│       ├── work-order/     # 工单管理模块
│       ├── store/          # 门店管理模块
│       └── common-api/     # 通用业务接口模块 (如：Banner)
|
├── .env                    # 环境变量文件 (数据库链接、JWT密钥等)
├── package.json
├── tsconfig.json
└── Dockerfile              # Docker 部署文件
```

## 4. 数据库设计 (`prisma/schema.prisma`)

Prisma 使用其 schema 文件来定义数据库模型，然后自动生成迁移文件和类型安全的客户端。

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // or "mysql"
  url      = env("DATABASE_URL")
}

// 用户模型
model User {
  id            String   @id @default(cuid())
  phone         String   @unique // 手机号
  password      String   // 加密后的密码
  nickname      String?  // 昵称
  avatarUrl     String?  // 头像
  wechatOpenid  String?  @unique // 微信 OpenID
  role          Role     @relation(fields: [roleId], references: [id])
  roleId        String
  workOrders    WorkOrder[] @relation("OwnerWorkOrders")
  assignedTasks WorkOrder[] @relation("MasterWorkOrders")
}

// 角色模型
model Role {
  id    String @id @default(cuid())
  name  String @unique // e.g., "admin", "owner", "master"
  users User[]
}

// 工单模型
model WorkOrder {
  id          String   @id @default(cuid())
  title       String   // 标题
  description String   // 问题描述
  images      Json?    // 图片列表 (JSON 数组)
  status      String   // 状态 (e.g., "pending", "processing", "completed", "cancelled")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  owner       User     @relation("OwnerWorkOrders", fields: [ownerId], references: [id])
  ownerId     String
  
  master      User?    @relation("MasterWorkOrders", fields: [masterId], references: [id])
  masterId    String?
  
  updates     WorkOrderUpdate[]
}

// 工单更新记录 (用于时间线)
model WorkOrderUpdate {
  id          String    @id @default(cuid())
  description String    // 更新描述 (e.g., "师傅已接单", "已完成维修")
  createdAt   DateTime  @default(now())
  workOrder   WorkOrder @relation(fields: [workOrderId], references: [id])
  workOrderId String
}

// 门店模型
model Store {
  id        String  @id @default(cuid())
  name      String
  address   String
  phone     String?
  latitude  Float   // 纬度
  longitude Float   // 经度
}

// Banner 模型
model Banner {
  id       String @id @default(cuid())
  imageUrl String
  linkUrl  String?
}
```

## 5. API 架构设计

### 5.1. 模块化 (`@Module`)

每个核心功能（用户、工单等）都封装在一个 NestJS 模块中。每个模块包含自己的控制器（`Controller`）、服务（`Service`）和数据访问逻辑。

### 5.2. 认证流程 (JWT)

1.  **登录**: 客户端（小程序/后台）将手机号/密码或微信 code 发送到 `POST /auth/login`。
2.  **令牌颁发**: `AuthService` 验证用户信息，如果成功，使用 JWT 签发一个包含 `userId` 和 `role` 的 `access_token`。
3.  **令牌传递**: 客户端收到 `access_token` 后，将其存储在本地（如 `uni.storage`）。
4.  **请求认证**: 对于需要认证的接口，客户端在请求头的 `Authorization` 字段中携带令牌 (`Bearer <token>`)。
5.  **服务端验证**: 后端的 `JwtAuthGuard` 会自动拦截请求，验证令牌的有效性，并将解析出的用户信息（payload）附加到请求对象上（`request.user`）。

### 5.3. 权限控制 (RBAC)

我们将创建一个 `RolesGuard` 来实现基于角色的访问控制。

1.  **定义装饰器**: 创建一个 `@Roles('admin', 'master')` 装饰器，用于标记控制器或路由处理函数所需的角色。
2.  **实现 Guard**: `RolesGuard` 从 `request.user` 中获取当前用户的角色。
3.  **权限判断**: `Guard` 检查用户角色是否存在于 `@Roles` 装饰器定义的角色列表中。如果不在，则抛出 `ForbiddenException` (403) 异常。

**示例:**
```typescript
// work-order.controller.ts
@Roles('admin') // 只有 admin 可以获取所有工单
@Get()
findAll() {
  return this.workOrderService.findAll();
}

@Roles('master') // 只有 master 可以接单
@Patch(':id/accept')
acceptOrder(@Param('id') id: string) {
  // ...
}
```

### 5.4. 数据传输与校验 (DTO)

所有外部输入（HTTP 请求体）都必须通过 DTO (Data Transfer Object) 来接收。DTO 是一个 `class`，使用 `class-validator` 装饰器来定义校验规则。

**示例:**
```typescript
// create-work-order.dto.ts
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
```
NestJS 的 `ValidationPipe` 会自动对传入的请求体根据 DTO 进行校验，如果失败，会返回 400 Bad Request 错误，并附带详细的错误信息。

## 6. 核�� API 端点设计

所有接口都建议添加 `/api` 前缀，方便 Nginx 等网关统一代理。

-   **认证模块 (`/api/auth`)**
    -   `POST /login`: 登录（小程序/后台）。
    -   `POST /register`: 注册（如果需要）。
    -   `GET /profile`: 使用有效 Token 获取当前用户信息。

-   **用户模块 (`/api/users`)**
    -   `GET /`: 获取用户列表（管理员）。
    -   `GET /:id`: 获取单个用户详情（管理员）。
    -   `PATCH /:id`: 更新用户信息（管理员或用户自己）。

-   **工单模块 (`/api/work-orders`)**
    -   `POST /`: 创建新工单（业主）。
    -   `GET /`: 获取工单列表（管理员/师傅/业主，根据角色返回不同数据）。
    -   `GET /:id`: 获取工单详情。
    -   `PATCH /:id/status`: 更新工单状态（接单、完成等，师傅/管理员）。

-   **门店模块 (`/api/stores`)**
    -   `GET /`: 获取门店列表（可按经纬度 `lat`, `lon` 查询附近门店）。

-   **通用模块 (`/api/common`)**
    -   `GET /banners`: 获取首页 Banner 列表。

## 7. 开发与部署

### 7.1. 本地开发

1.  **安装依赖**: `pnpm install`。
2.  **配置环境变量**: 创建 `.env` 文件，填入 `DATABASE_URL` 和 `JWT_SECRET` 等。
3.  **数据库迁移**: 运行 `npx prisma migrate dev`。这会根据 `schema.prisma` 的变动创建或更新数据库表结构。
4.  **启动服务**: 运行 `pnpm run start:dev`，服务将在 `http://localhost:3000` 启动，并具备热重载能力。

### 7.2. 部署 (Docker)

提供一个基础的 `Dockerfile` 用于构建生产环境镜像。

```dockerfile
# Stage 1: Build the application
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the final production image
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
# Copy Prisma schema and client
COPY --from=builder /usr/src/app/prisma ./prisma
# It's important to generate the Prisma client again in the runtime environment
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/main"]
```
通过构建此 Docker 镜像，可以轻松地将后端服务部署到任何支持 Docker 的云服务器或平台。
