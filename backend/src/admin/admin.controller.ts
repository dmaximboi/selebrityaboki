import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('dashboard')
    async getDashboard() {
        return this.adminService.getDashboardStats();
    }

    @Get('orders')
    async getOrders(
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('status') status?: string
    ) {
        return this.adminService.getAllOrders(
            page ? parseInt(page) : 1,
            limit ? parseInt(limit) : 20,
            status
        );
    }

    @Get('activity')
    async getActivity(@Query('limit') limit?: string) {
        return this.adminService.getRecentActivity(limit ? parseInt(limit) : 50);
    }

    @Get('content-stats')
    async getContentStats() {
        return this.adminService.getContentStats();
    }

    @Get('ai-stats')
    async getAiStats() {
        return this.adminService.getAiStats();
    }

    /** Full AI analytics — top users, per-day usage, recent chats */
    @Get('ai-analytics')
    async getAiAnalytics() {
        return this.adminService.getAiAnalytics();
    }

    /** Login / sign-in analytics */
    @Get('login-analytics')
    async getLoginAnalytics() {
        return this.adminService.getLoginAnalytics();
    }
}
