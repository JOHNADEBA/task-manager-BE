import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Req,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Prisma } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { CreateSignupDto } from './dto/create-signup.dto';
import { UpdateSignupDto } from './dto/update-signup.dto';
import { AuthenticatedRequest } from './auth.interface';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('picture', {
      storage: diskStorage({
        destination: './uploads',
        filename: (
          _req: any,
          file: { originalname: string },
          callback: (arg0: null, arg1: string) => void,
        ) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async create(
    @Body('data') rawData: string,
    @UploadedFile() picture: Express.Multer.File,
  ) {
    const createSignupDto: Prisma.UserCreateInput = JSON.parse(rawData);

    // Save the path with forward slashes
    if (picture) {
      createSignupDto.picture = picture.path.replace(/\\/g, '/');
    }

    return this.authService.create(createSignupDto, picture);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh-token')
  @UseGuards(AuthGuard('refresh-jwt'))
  async refreshAccessToken(@Body('refreshToken') refreshToken: string) {
    const payload = await this.authService.verifyRefreshToken(refreshToken);
    return this.authService.generateTokens(payload);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleLogin() {
    // Redirect to Google login page
  }

  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleLoginRedirect(@Req() req: Request, @Res() res: Response) {
    try {
      const user = req.user;

      // Validate user data
      const validatedUser = new CreateSignupDto();
      Object.assign(validatedUser, user);

      const foundUser = await this.authService.findOneByEmail(
        validatedUser.email,
        true,
      );

      if (!foundUser) {
        const { email, firstName, lastName, picture } = validatedUser;
        this.authService.create(
          {
            email,
            password: '',
            fullName: `${firstName} ${lastName}`,
            isPromotionalEmails: false,
            isDarkMode: false,
            lang: 'en',
            isActive: true,
          },
          picture as unknown as Express.Multer.File,
        );
      }

      // Generate JWT tokens (access and refresh)
      const tokens = await this.authService.generateTokens(foundUser);
      const { password: _, ...userData } = tokens;

      // Send tokens in response
      // res.status(HttpStatus.OK).json(userData);

      // Redirect to frontend with tokens
      // const query = `accessToken=${userData.accessToken}&refreshToken=${userData.refreshToken}`;
      // const redirectUrl = `${process.env.FRONTEND_DOMAIN}?${query}`;
      // res.redirect(redirectUrl);

      // send html
      const responseHTML = ` <html> <head><title>Login</title></head> <body></body> <script> var res = ${JSON.stringify(userData)}; window.opener.postMessage(res, "*"); window.close(); </script> </html>`;
      res.status(200).send(responseHTML);
    } catch (error) {
      res
        .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
    }
  }

  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftLogin() {
    // Redirect to Microsoft login page
  }

  @Get('microsoft/redirect')
  @UseGuards(AuthGuard('microsoft'))
  async microsoftLoginRedirect(@Req() req: AuthenticatedRequest) {
    const user = req.user;

    // Validate user data
    const validatedUser = new CreateSignupDto();
    Object.assign(validatedUser, user);

    return this.authService.generateTokens(validatedUser); // Generate tokens after login
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  update(
    @Param('id') id: string,
    @Body()
    updateUserDto: Prisma.UserUpdateInput & {
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    return this.authService.update(+id, updateUserDto);
  }

  @Patch('deactivate/:id')
  @UseGuards(AuthGuard('jwt'))
  remove(@Param('id') id: string) {
    return this.authService.deactivate(+id);
  }
}
