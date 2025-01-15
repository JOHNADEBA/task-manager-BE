import { IsEmail, IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSignupDto {
    @IsString()
      @IsNotEmpty()
      id: string;
    
      @IsEmail()
      @IsNotEmpty()
      email: string;
    
      @IsString()
      @IsNotEmpty()
      firstName: string;

      @IsString()
      @IsNotEmpty()
      lastName: string;
    
      @IsString()
      @IsNotEmpty()
      password: string;
    
      @IsString()
      @IsOptional()
      picture: string;
    
      @IsBoolean()
      @IsOptional()
      isPromotionalEmails: Boolean
    
      @IsString()
      @IsNotEmpty()
      accessToken: string;
    
      @IsOptional()
      @IsString()
      refreshToken?: string;
}
