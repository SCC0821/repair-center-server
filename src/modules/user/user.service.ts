import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '@/database/prisma/prisma.service';
import { ListUserDto } from './dto/list-user.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {} // 注入 PrismaService
  async create(createUserDto: CreateUserDto) {
    console.log('🚀 ~ create ~ createUserDto: ', createUserDto);
    // 实际项目中，密码需要加密存储，这里暂时简化
    // const hashedPassword = await hash(createUserDto.password, 10);
    // 从数据库中找到 "业主" 这个角色的 ID
    const ownerRole = await this.prisma.role.findUnique({
      where: { name: 'owner' },
    });
    if (!ownerRole) {
      throw new Error('Default role "owner" not found. Please seed the database.');
    }

    return this.prisma.user.create({
      data: {
        phone: createUserDto.phone,
        // password: createUserDto.password, // 实际应存入加密后的密码
        roleId: ownerRole.id, // 关联到 "业主" 角色
      },
    });
    // return 'This action adds a new user';
  }

  async list(query: ListUserDto) {
    const { pageNum = 1, pageSize = 10, status, phone, userName } = query;
    const skip = (pageNum - 1) * pageSize;
    const take = pageSize;

    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (phone) {
      where.phone = { contains: phone };
    }
    if (userName) {
      where.userName = { contains: userName };
    }

    const [list, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          userName: true,
          phone: true,
          status: true,
          roleId: true,
          role: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      list,
      total,
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    console.log('🚀 ~ update ~ updateUserDto: ', updateUserDto);
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
