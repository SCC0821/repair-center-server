import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '@/database/prisma/prisma.service';

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

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        status: true,
        roleId: true,
        role: true,
      },
    });
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
