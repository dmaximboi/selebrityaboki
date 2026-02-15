import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll(options?: {
        category?: string;
        available?: boolean;
        featured?: boolean;
        search?: string;
    }) {
        const where: Prisma.ProductWhereInput = {};

        if (options?.category) {
            where.category = options.category;
        }

        if (options?.available !== undefined) {
            where.isAvailable = options.available;
        }

        if (options?.featured !== undefined) {
            where.isFeatured = options.featured;
        }

        if (options?.search) {
            where.OR = [
                { name: { contains: options.search, mode: 'insensitive' } },
                { description: { contains: options.search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.product.findMany({
            where,
            orderBy: [{ isFeatured: 'desc' }, { name: 'asc' }],
        });
    }

    async findOne(id: string) {
        const product = await this.prisma.product.findUnique({
            where: { id },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return product;
    }

    async findBySlug(slug: string) {
        const product = await this.prisma.product.findUnique({
            where: { slug },
        });

        if (!product) {
            throw new NotFoundException('Product not found');
        }

        return product;
    }

    async create(data: Prisma.ProductCreateInput) {
        return this.prisma.product.create({ data });
    }

    async update(id: string, data: Prisma.ProductUpdateInput) {
        try {
            return await this.prisma.product.update({
                where: { id },
                data,
            });
        } catch {
            throw new NotFoundException('Product not found');
        }
    }

    async delete(id: string) {
        try {
            await this.prisma.product.delete({
                where: { id },
            });
            return { success: true };
        } catch {
            throw new NotFoundException('Product not found');
        }
    }

    async getCategories() {
        const products = await this.prisma.product.findMany({
            select: { category: true },
            distinct: ['category'],
        });

        return products.map((p) => p.category);
    }
}
