import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTaskResponseDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from 'src/database/database.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class TasksService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService,
    private authService: AuthService,
  ) {}
  async create(
    createTaskDto: Prisma.TaskCreateInput,
  ): Promise<CreateTaskResponseDto> {
    try {
      const { start, end } = createTaskDto;

      this.validateDate(start, end);

      // Set status to 'Pending' if end date is later than start date
      createTaskDto.status = 'Pending';

      return await this.databaseService.task.create({ data: createTaskDto });
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<CreateTaskResponseDto[]> {
    try {
      const currentTime = new Date();
      const tasks = await this.databaseService.task.findMany();

      return tasks.map((task) => {
        if (new Date(task.end) < currentTime) {
          task.status = 'Completed';
        } else if (
          new Date(task.start) < currentTime &&
          new Date(task.end) > currentTime
        ) {
          task.status = 'Overdue';
        }
        return task; // Return the entire task object
      });
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: number): Promise<CreateTaskResponseDto> {
    try {
      const task = await this.databaseService.task.findUnique({
        where: { id },
      });

      if (!task) {
        throw new NotFoundException(`Task with id ${id} not found.`);
      }

      return task;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.handleDatabaseError(error);
      }
      throw error;
    }
  }

  async update(
    id: number,
    updateTaskDto: Prisma.TaskUpdateInput,
  ): Promise<CreateTaskResponseDto> {
    try {
      await this.findOne(id);

      // Validate dates
      this.validateDate(updateTaskDto.start, updateTaskDto.end);

      return await this.databaseService.task.update({
        where: { id },
        data: updateTaskDto,
      });
    } catch (error) {
      throw error;
    }
  }

  async remove(id: number): Promise<string> {
    try {
      await this.findOne(id);

      await this.databaseService.task.delete({
        where: { id },
      });
      return 'success';
    } catch (error) {
      throw error;
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

  private validateDate(
    startTime:
      | Prisma.DateTimeFieldUpdateOperationsInput
      | Date
      | string
      | undefined,
    endTime:
      | Prisma.DateTimeFieldUpdateOperationsInput
      | Date
      | string
      | undefined,
  ) {
    const currentDate = new Date();
    const startDate =
      typeof startTime === 'string' || startTime instanceof Date
        ? new Date(startTime)
        : undefined;

    const endDate =
      typeof endTime === 'string' || endTime instanceof Date
        ? new Date(endTime)
        : undefined;

    if (!startDate || !endDate) {
      throw new BadRequestException('Start and end dates must be valid.');
    }

    if (new Date(startDate) < currentDate || new Date(endDate) < currentDate) {
      throw new BadRequestException(
        'Start and end dates must be in the future.',
      );
    }

    if (endDate < startDate) {
      throw new BadRequestException(
        'End date cannot be earlier than start date.',
      );
    }
  }
}
