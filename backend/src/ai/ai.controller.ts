/**
 * AI Controller
 * 
 * Exposes AI chat endpoint - requires authentication
 */

import {
    Controller,
    Post,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

class ChatDto {
    @IsString()
    @MinLength(1)
    @MaxLength(500)
    message: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    condition?: string;
}

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    constructor(private readonly aiService: AiService) { }

    /**
     * Chat with the AI health assistant
     * Requires authentication
     */
    @Post('chat')
    @HttpCode(HttpStatus.OK)
    async chat(
        @CurrentUser('id') userId: string,
        @Body() dto: ChatDto
    ): Promise<{ response: string }> {
        const response = await this.aiService.chat(
            userId,
            dto.message,
            dto.condition
        );

        return { response };
    }
}
