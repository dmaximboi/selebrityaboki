import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { ContactService } from './contact.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IsString, IsEmail, IsOptional, MaxLength, MinLength } from 'class-validator';

class CreateContactDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  message: string;
}

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) { }

  /**
   * Submit contact form (public)
   */
  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async submit(@Body() dto: CreateContactDto, @Req() req: Request) {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'unknown';
    const userAgent = req.headers['user-agent'];

    return this.contactService.submit(dto, ipAddress, userAgent);
  }

  /**
   * Get all submissions (admin)
   */
  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAll(@Query('unread') unread?: string) {
    return this.contactService.findAll({
      unreadOnly: unread === 'true',
    });
  }

  /**
   * Get unread count (admin)
   */
  @Get('unread-count')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async getUnreadCount() {
    const count = await this.contactService.getUnreadCount();
    return { count };
  }

  /**
   * Mark as read (admin)
   */
  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async markAsRead(@Param('id') id: string) {
    return this.contactService.markAsRead(id);
  }

  /**
   * Mark as spam (admin)
   */
  @Patch(':id/spam')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async markAsSpam(@Param('id') id: string) {
    return this.contactService.markAsSpam(id);
  }

  /**
   * Delete submission (admin)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async delete(@Param('id') id: string) {
    return this.contactService.delete(id);
  }
}
