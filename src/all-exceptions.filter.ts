import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    // Handle Prisma Known Request Errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST; // Default for Prisma errors
      switch (exception.code) {
        case 'P2002': // Unique constraint failed
          message = `Unique constraint failed on field: ${exception.meta?.target}`;
          break;
        case 'P2025': // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        default:
          message = 'Database error';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      // Handle Prisma Validation Errors
      status = HttpStatus.BAD_REQUEST;
      message = this.extractPrismaValidationError(exception);
    } else if (exception instanceof HttpException) {
      // Handle NestJS HttpExceptions
      status = exception.getStatus();
      message = exception.getResponse() as string;
    } else if (exception instanceof Error) {
      // Handle other generic errors
      message = exception.message;
    }

    // Send the error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }

  private extractPrismaValidationError(
    exception: Prisma.PrismaClientValidationError,
  ): string {
    const errorMessage = exception.message;
    let userFriendlyMessage = 'Validation error occurred.';

    if (errorMessage.includes('Invalid value for argument `category`')) {
      userFriendlyMessage =
        'The category provided is not valid. Valid categories Work, Personal and Home.';
    } else if (errorMessage.includes('Expected category')) {
      userFriendlyMessage =
        'The category value must match one of the predefined categories.';
    } else if (errorMessage.includes('Invalid value for argument `start`')) {
      userFriendlyMessage =
        'The start date provided is not valid. Please provide a valid start date.';
    }

    return userFriendlyMessage;
  }
}
