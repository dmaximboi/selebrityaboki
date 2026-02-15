import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ContentType } from '@prisma/client';

@Controller('content')
export class ContentController {
    constructor(private readonly contentService: ContentService) { }

    /**
     * Get today's content
     */
    @Public()
    @Get('today')
    async getTodaysContent() {
        return this.contentService.getTodaysContent();
    }

    /**
     * Get latest riddles
     */
    @Public()
    @Get('riddles')
    async getRiddles(@Query('limit') limit?: string) {
        return this.contentService.getLatest(
            ContentType.RIDDLE,
            limit ? parseInt(limit) : 5
        );
    }

    /**
     * Get latest health tips
     */
    @Public()
    @Get('tips')
    async getTips(@Query('limit') limit?: string) {
        return this.contentService.getLatest(
            ContentType.HEALTH_TIP,
            limit ? parseInt(limit) : 5
        );
    }

    /**
     * Get latest fruit facts
     */
    @Public()
    @Get('facts')
    async getFacts(@Query('limit') limit?: string) {
        return this.contentService.getLatest(
            ContentType.FRUIT_FACT,
            limit ? parseInt(limit) : 5
        );
    }

    /**
     * Get content by ID
     */
    @Public()
    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.contentService.getById(id);
    }

    /**
     * Like content
     */
    @Public()
    @Post(':id/like')
    async likeContent(@Param('id') id: string) {
        return this.contentService.likeContent(id);
    }

    /**
     * Manually trigger content generation (admin only)
     */
    @Post('generate/:type')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async generateContent(
        @Param('type') type: 'RIDDLE' | 'HEALTH_TIP' | 'FRUIT_FACT'
    ) {
        return this.contentService.generateNow(type);
    }
}
