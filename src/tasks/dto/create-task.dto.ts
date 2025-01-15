import { IsString, IsInt, IsDateString, IsOptional } from 'class-validator';

export class CreateTaskResponseDto {
  @IsInt()
  id: number;

  @IsString()
  title: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsString()
  status: string;

  @IsDateString()
  start: Date;

  @IsDateString()
  end: Date;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;

  @IsInt()
  userId: number;
}
