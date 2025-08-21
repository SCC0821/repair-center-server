# Prisma 与 PostgreSQL 常用命令参考

本文档聚焦于在本项目中，使用 Prisma CLI 与 PostgreSQL 数据库进行交互的核心常用命令。

---

## 核心开发工作流 (Core Development Workflow)

这是你日常开发中最频繁使用的命令。

### 1. `prisma migrate dev`

这是**最重要**的命令，用于根据 `schema.prisma` 的变更来演进你的数据库结构。

```bash
pnpm prisma migrate dev --name <your-migration-name>
```

-   **作用**: 
    1.  比较 `schema.prisma` 与数据库当前状态的差异。
    2.  在 `prisma/migrations` 目录下生成一个新的 SQL 迁移文件。
    3.  将这个迁移文件应用到数据库，创建或修改表结构。
    4.  自动执行 `prisma generate`。
-   **使用场景**: 当你修改了 `schema.prisma`（例如，添加模型、增删字段、修改属性）并希望将这些变更应用到数据库时。
-   **示例**: `pnpm prisma migrate dev --name add_user_status_field`

### 2. `prisma generate`

手动重新生成类型安全的 Prisma Client。

```bash
pnpm prisma generate
```

-   **作用**: 读取 `schema.prisma` 文件，并在 `node_modules/@prisma/client` 目录下生成或更新与之完全匹配的、包含所有类型定义的客户端库。
-   **使用场景**: 
    -   `prisma migrate dev` 会自动调用它，所以通常无需手动执行。
    -   当你修改了 `schema.prisma` 但不涉及数据库结构变更时（例如，重命名一个模型 `@@map`、添加注释），可以手动运行此命令来更新客户端类型。

---

## 开发辅助工具 (Development Helper Tools)

这些命令能极大地提升你的开发效率。

### 1. `prisma studio`

启动一个基于网页的 GUI，用于查看和编辑你的数据库数据。

```bash
pnpm prisma studio
```

-   **作用**: 在浏览器中打开一个像 Navicat 或 DBeaver 一样的数据库管理界面，但它完全理解你的 Prisma 模型和关系。
-   **使用场景**: 
    -   开发过程中，快速查看某个 API 是否成功创建或修改了数据。
    -   手动添加或修改一些用于测试的种子数据。
    -   直观地理解模型之间的关联关系。

### 2. `prisma db seed`

执行种子脚本，向数据库中填充初始数据。

```bash
pnpm prisma db seed
```

-   **作用**: 运行定义在 `prisma/seed.ts` (或 `seed.js`) 文件中的脚本。
-   **使用场景**: 
    -   向 `Role` 表中填充“admin”, “owner”, “master” 等初始角色数据。
    -   为开发环境创建一些默认的管理员账号或测试数据。
-   **注意**: 你需要先在 `package.json` 中配置 `prisma.seed` 字段来指定你的种子文件入口，例如：`"prisma": { "seed": "ts-node prisma/seed.ts" }`。

---

## 数据库状态管理 (Database State Management)

这些命令用于更直接地操作数据库状态，部分命令具有破坏性，请谨慎使用。

### 1. `prisma migrate reset`

重置你的数据库。

```bash
pnpm prisma migrate reset
```

-   **作用**: 一个破坏性操作。它会删除数据库中的所有数据和表，然后重新应用所有的历史迁移文件，最后会执行 `db seed`。
-   **使用场景**: 当你的开发数据库状态变得混乱，或者你想从一个干净的状态重新开始时。**绝对不能在生产环境中使用！**

### 2. `prisma db push`

快速将你的 schema 同步到数据库，但不创建迁移文件。

```bash
pnpm prisma db push
```

-   **作用**: 让数据库的结构匹配 `schema.prisma` 的状态，但它**不会生成 SQL 迁移文件**，也不会记录历史。
-   **使用场景**: 
    -   在项目的最早期，进行快速原型设计和 schema 探索时。
    -   为测试或 CI/CD 环境快速准备一个一次性的数据库。
-   **与 `migrate dev` 的区别**: `db push` 是“无状态”的，适合快速迭代；`migrate dev` 是“有状态”的，通过迁移文件记录了数据库的演进历史，是团队协作和生产部署的**标准实践**。**在正式开发中，应优先使用 `migrate dev`**。
