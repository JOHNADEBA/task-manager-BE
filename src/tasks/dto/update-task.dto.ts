import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskResponseDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskResponseDto) {}
