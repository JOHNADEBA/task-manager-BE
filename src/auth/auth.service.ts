import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateSignupDto } from './dto/create-signup.dto';
import { UpdateSignupDto } from './dto/update-signup.dto';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService,
  ) {}

  async create(
    createUserDto: Prisma.UserCreateInput,
    picture: Express.Multer.File,
  ) {
    try {
      let computePic = null;
      if (typeof picture === 'string') {
        computePic = picture;
      } else if (typeof picture === 'object') {
        computePic = `${process.env.BACKEND_DOMAIN}/uploads/${picture.filename}`;
      }

      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
      const userData = {
        ...createUserDto,
        picture: computePic,
        password: hashedPassword,
        isActive: true,
        lang: 'en',
        isDarkMode: false,
      };

      return await this.databaseService.user.create({ data: userData });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle Prisma unique constraint error
        if (error.code === 'P2002') {
          const field = error.meta?.target ?? 'field';
          throw new BadRequestException(
            `A user with this ${field} already exists`,
          );
        }
      }
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const user = await this.databaseService.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException(`User with id ${id} not found.`);
      }

      if (!user.isActive) {
        throw new BadRequestException(`User is not active.`);
      }

      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.handleDatabaseError(error);
      } else if (error instanceof Prisma.PrismaClientValidationError) {
        throw new BadRequestException('Invalid data passed to Prisma query.');
      }

      throw error;
    }
  }

  async findOneByEmail(email: string, isGoogle = false) {
    try {
      const user = await this.databaseService.user.findUnique({
        where: { email },
      });

      if (!isGoogle) {
        if (!user) {
          throw new NotFoundException(`User with email ${email} not found.`);
        }

        if (!user.isActive) {
          throw new BadRequestException(`User is not active.`);
        }
      }
      return user;
    } catch (error) {
      // Only handle known Prisma database errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.handleDatabaseError(error);
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    try {
      const { email, password } = loginDto;
      const user = await this.findOneByEmail(email);

      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid password.');
      }

      const { password: _, ...userData } = user;
      return this.generateTokens(userData);
    } catch (error) {
      throw error;
    }
  }

  async update(
    id: number,
    updateUserDto: Prisma.UserUpdateInput & {
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    try {
      const user = await this.findOne(id);

      if (user && updateUserDto.currentPassword && updateUserDto.newPassword) {
        const hashedPassword = await this.passwordChange({
          id,
          currentPassword: updateUserDto.currentPassword,
          newPassword: updateUserDto.newPassword,
        });
        updateUserDto.password = hashedPassword;
      }

      const { currentPassword, newPassword, ...data } = updateUserDto;
      return await this.databaseService.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw error;
    }
  }

  async passwordChange(updatePasswordDto: {
    id: number;
    currentPassword: string;
    newPassword: string;
  }): Promise<string> {
    try {
      const { id, currentPassword, newPassword } = updatePasswordDto;
      const user = await this.findOne(id);

      if (!user) {
        throw new UnauthorizedException('Invalid User.');
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid current password.');
      }

      return await bcrypt.hash(newPassword, 10);
    } catch (error) {
      throw error;
    }
  }

  async deactivate(id: number) {
    try {
      await this.findOne(id);
      return await this.databaseService.user.update({
        where: { id },
        data: { isActive: false },
      });
    } catch (error) {
      this.handleDatabaseError(error);
    }
  }

  async generateTokens(
    user: any,
  ): Promise<CreateSignupDto & { refreshToken: string }> {
    try {
      if (!user) {
        throw new UnauthorizedException('User not found.');
      }

      const payload = { sub: user.id, email: user.email };

      const accessToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_SECRET_EXPIRE_IN || '1h',
      });

      const refreshToken = this.jwtService.sign(payload, {
        expiresIn: process.env.JWT_REFRESH_EXPIRE_IN || '7d',
      });

      return { ...user, accessToken, refreshToken };
    } catch (error) {
      throw new BadRequestException('Error generating tokens.');
    }
  }

  async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_SECRET_REFRESH,
      });
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private handleDatabaseError(
    error: Prisma.PrismaClientKnownRequestError,
  ): void {
    if (error.code === 'P2002') {
      const field = error.meta?.target ?? 'field';
      throw new BadRequestException(`Unique constraint failed on ${field}.`);
    } else if (error.code === 'P2025') {
      throw new NotFoundException('Record not found.');
    }

    // Catch all database-related errors
    throw new BadRequestException('An unexpected database error occurred.');
  }
}
