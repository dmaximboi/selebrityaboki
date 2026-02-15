/**
 * Database Seed Script
 * 
 * Populates the database with initial products and admin user
 */

import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
    {
        name: 'Fresh Pineapple',
        slug: 'fresh-pineapple',
        description: 'Sweet and juicy pineapple, freshly harvested. Rich in Vitamin C, manganese, and bromelain enzyme that aids digestion. Perfect for smoothies, fruit salads, or eating fresh.',
        price: 1500,
        stock: 50,
        unit: 'piece',
        imageUrl: '/images/products/pineapple.jpg',
        category: 'tropical',
        healthBenefits: 'Rich in Vitamin C, aids digestion with bromelain enzyme, anti-inflammatory properties',
        bestFor: ['digestion', 'immunity', 'inflammation'],
        isAvailable: true,
        isFeatured: true,
    },
    {
        name: 'Organic Watermelon',
        slug: 'organic-watermelon',
        description: 'Large, refreshing watermelon from local farms. High water content makes it perfect for hydration. Contains lycopene for heart health and citrulline for muscle recovery.',
        price: 2500,
        stock: 30,
        unit: 'piece',
        imageUrl: '/images/products/watermelon.jpg',
        category: 'tropical',
        healthBenefits: 'Hydrating, rich in lycopene for heart health, contains citrulline for muscle recovery',
        bestFor: ['hydration', 'heart-health', 'weight-loss'],
        isAvailable: true,
        isFeatured: true,
    },
    {
        name: 'Sweet Banana Bunch',
        slug: 'sweet-banana-bunch',
        description: 'A bunch of ripe, sweet bananas. Excellent source of potassium for heart and muscle function. Great pre-workout snack with natural energy from fructose.',
        price: 800,
        stock: 100,
        unit: 'bunch',
        imageUrl: '/images/products/banana.jpg',
        category: 'everyday',
        healthBenefits: 'High in potassium, natural energy source, supports heart health',
        bestFor: ['energy', 'heart-health', 'muscle-function'],
        isAvailable: true,
        isFeatured: false,
    },
    {
        name: 'Nigerian Orange',
        slug: 'nigerian-orange',
        description: 'Locally sourced Nigerian oranges, bursting with natural sweetness. Packed with Vitamin C for immune system support and flavonoids for antioxidant protection.',
        price: 500,
        stock: 200,
        unit: 'piece',
        imageUrl: '/images/products/orange.jpg',
        category: 'citrus',
        healthBenefits: 'Vitamin C powerhouse, antioxidant protection, supports immune system',
        bestFor: ['immunity', 'skin-health', 'cold-prevention'],
        isAvailable: true,
        isFeatured: true,
    },
    {
        name: 'Fresh Mango',
        slug: 'fresh-mango',
        description: 'Premium quality mangoes, hand-picked at peak ripeness. Known as the "king of fruits" for its rich flavor and nutritional profile. High in Vitamin A for eye health.',
        price: 1200,
        stock: 60,
        unit: 'piece',
        imageUrl: '/images/products/mango.jpg',
        category: 'tropical',
        healthBenefits: 'Rich in Vitamin A for eye health, fiber for digestion, antioxidants',
        bestFor: ['eye-health', 'digestion', 'skin-health'],
        isAvailable: true,
        isFeatured: true,
    },
    {
        name: 'Pawpaw (Papaya)',
        slug: 'fresh-pawpaw',
        description: 'Ripe and nutritious pawpaw, a Nigerian favorite. Contains papain enzyme that supports digestion. Rich in folate, perfect for expectant mothers.',
        price: 1000,
        stock: 40,
        unit: 'piece',
        imageUrl: '/images/products/pawpaw.jpg',
        category: 'tropical',
        healthBenefits: 'Contains papain for digestion, rich in folate, Vitamin C and A',
        bestFor: ['digestion', 'pregnancy', 'immunity'],
        isAvailable: true,
        isFeatured: false,
    },
    {
        name: 'Apple (Red Delicious)',
        slug: 'red-delicious-apple',
        description: 'Crisp, fresh red delicious apples. An apple a day keeps the doctor away - rich in quercetin, fiber, and polyphenols that support gut health.',
        price: 700,
        stock: 80,
        unit: 'piece',
        imageUrl: '/images/products/apple.jpg',
        category: 'imported',
        healthBenefits: 'High fiber, antioxidant quercetin, supports gut health',
        bestFor: ['gut-health', 'weight-loss', 'heart-health'],
        isAvailable: true,
        isFeatured: false,
    },
    {
        name: 'Fresh Coconut',
        slug: 'fresh-coconut',
        description: 'Whole fresh coconut with pure coconut water inside. Natural electrolyte replacement and medium-chain triglycerides for quick energy and brain function.',
        price: 600,
        stock: 45,
        unit: 'piece',
        imageUrl: '/images/products/coconut.jpg',
        category: 'tropical',
        healthBenefits: 'Natural electrolytes, medium-chain triglycerides for brain function, hydrating',
        bestFor: ['hydration', 'brain-health', 'energy'],
        isAvailable: true,
        isFeatured: false,
    },
    {
        name: 'Fresh Grape Bundle',
        slug: 'fresh-grapes',
        description: 'Premium seedless grapes, perfect for snacking. Rich in resveratrol for heart health and polyphenols for antioxidant protection.',
        price: 3000,
        stock: 25,
        unit: 'kg',
        imageUrl: '/images/products/grapes.jpg',
        category: 'imported',
        healthBenefits: 'Resveratrol for heart health, polyphenol antioxidants, anti-aging properties',
        bestFor: ['heart-health', 'anti-aging', 'blood-pressure'],
        isAvailable: true,
        isFeatured: true,
    },
    {
        name: 'Fresh Avocado',
        slug: 'fresh-avocado',
        description: 'Perfectly ripe avocados, creamy and nutritious. Packed with healthy monounsaturated fats, potassium, and fiber. Excellent for heart health and weight management.',
        price: 1800,
        stock: 35,
        unit: 'piece',
        imageUrl: '/images/products/avocado.jpg',
        category: 'everyday',
        healthBenefits: 'Healthy fats, high potassium, fiber-rich, supports heart health',
        bestFor: ['heart-health', 'weight-management', 'cholesterol'],
        isAvailable: true,
        isFeatured: false,
    },
];

async function main() {
    console.log('Seeding database...\n');

    // Create products
    for (const product of products) {
        const created = await prisma.product.upsert({
            where: { slug: product.slug },
            update: product,
            create: product,
        });
        console.log(`  Product: ${created.name} (${created.slug})`);
    }

    console.log(`\n  ${products.length} products seeded.\n`);

    // Check if there's a default admin
    const adminEmail = process.env.ADMIN_EMAILS?.split(',')[0]?.trim();
    if (adminEmail) {
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail },
        });

        if (!existingAdmin) {
            console.log(`  Note: Admin email "${adminEmail}" is configured.`);
            console.log(`  The admin account will be created when they first sign in with Google.\n`);
        } else {
            console.log(`  Admin exists: ${existingAdmin.email}\n`);
        }
    }

    console.log('Seed complete!');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
