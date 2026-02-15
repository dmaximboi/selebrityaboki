import {
    Controller,
    Get,
    Patch,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

class UpdateRoleDto {
    @IsEnum(Role)
    role: Role;
}

class UpdateProfileDto {
    @IsString()
    @IsOptional()
    @MaxLength(100)
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    phone?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /**
     * Update current user's profile
     */
    @Patch('profile')
    async updateProfile(
        @CurrentUser('id') userId: string,
        @Body() dto: UpdateProfileDto
    ) {
        return this.usersService.updateProfile(userId, dto);
    }

    /**
     * Get all users (admin only)
     */
    @Get()
    @UseGuards(AdminGuard)
    async findAll() {
        return this.usersService.findAll();
    }

    /**
     * Get user stats (admin only)
     */
    @Get('stats')
    @UseGuards(AdminGuard)
    async getStats() {
        return this.usersService.getStats();
    }

    /**
     * Get user by ID (admin only)
     */
    @Get(':id')
    @UseGuards(AdminGuard)
    async findOne(@Param('id') id: string) {
        return this.usersService.findOne(id);
    }

    /**
     * Set user role (admin only)
     */
    @Patch(':id/role')
    @UseGuards(AdminGuard)
    @HttpCode(HttpStatus.OK)
    async setRole(
        @Param('id') id: string,
        @Body() dto: UpdateRoleDto
    ) {
        return this.usersService.setUserRole(id, dto.role);
    }

    /**
     * Deactivate user (admin only)
     */
    @Patch(':id/deactivate')
    @UseGuards(AdminGuard)
    async deactivate(@Param('id') id: string) {
        return this.usersService.deactivateUser(id);
    }

    /**
     * Activate user (admin only)
     */
    @Patch(':id/activate')
    @UseGuards(AdminGuard)
    async activate(@Param('id') id: string) {
        return this.usersService.activateUser(id);
    }
}
