import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { Public } from '../common/decorators/public.decorator';
import { AdminGuard } from '../common/guards/admin.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
    IsString,
    IsNumber,
    IsBoolean,
    IsOptional,
    IsArray,
    Min,
} from 'class-validator';

class CreateProductDto {
    @IsString()
    name: string;

    @IsString()
    slug: string;

    @IsString()
    description: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    discountPrice?: number;

    @IsNumber()
    @Min(0)
    stock: number;

    @IsString()
    @IsOptional()
    unit?: string;

    @IsString()
    imageUrl: string;

    @IsArray()
    @IsOptional()
    images?: string[];

    @IsString()
    @IsOptional()
    category?: string;

    @IsString()
    @IsOptional()
    healthBenefits?: string;

    @IsArray()
    @IsOptional()
    bestFor?: string[];

    @IsBoolean()
    @IsOptional()
    isAvailable?: boolean;

    @IsBoolean()
    @IsOptional()
    isFeatured?: boolean;
}

@Controller('products')
export class ProductsController {
    constructor(private readonly productsService: ProductsService) { }

    @Public()
    @Get()
    async findAll(
        @Query('category') category?: string,
        @Query('available') available?: string,
        @Query('featured') featured?: string,
        @Query('search') search?: string
    ) {
        return this.productsService.findAll({
            category,
            available: available === 'true' ? true : available === 'false' ? false : undefined,
            featured: featured === 'true' ? true : featured === 'false' ? false : undefined,
            search,
        });
    }

    @Public()
    @Get('categories')
    async getCategories() {
        return this.productsService.getCategories();
    }

    @Public()
    @Get('slug/:slug')
    async findBySlug(@Param('slug') slug: string) {
        return this.productsService.findBySlug(slug);
    }

    @Public()
    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.productsService.findOne(id);
    }

    @Post()
    @UseGuards(JwtAuthGuard, AdminGuard)
    async create(@Body() dto: CreateProductDto) {
        return this.productsService.create(dto);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>) {
        return this.productsService.update(id, dto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async delete(@Param('id') id: string) {
        return this.productsService.delete(id);
    }
}
