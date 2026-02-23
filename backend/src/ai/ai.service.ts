/**
 * AI Service - SelebrityAboki Fruit Health Assistant
 * 
 * Uses Groq (Llama 3) for fast, smart responses
 * All AI logic is strictly server-side, never exposed to frontend
 */

import {
    Injectable,
    ForbiddenException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
    private readonly logger = new Logger(AiService.name);
    private readonly groq: Groq;

    // STRICT SYSTEM PROMPT - The AI's "Constitution"
    // This NEVER leaves the server
    private readonly SYSTEM_INSTRUCTION = `
IDENTITY: You are the "SelebrityAboki Fruits AI" - a friendly and knowledgeable fruit advisor for SelebrityAboki Fruit shop at Iyana Technical.

YOUR MISSION:
1. Help users with fruit recommendations, nutritional facts, and health tips.
2. IMPORTANT: Be diverse in your recommendations. Do not just mention Watermelon. SelebrityAboki has a wide variety including Oranges, Mangoes, Apples, Bananas, Pineapples, Pawpaw, Grapes, and more. Recommend based on the user's specific health needs.
3. Be conversational and natural. If someone says "Hi" or "How are you?", respond naturally like a human advisor.
4. Subtly guide the conversation towards fruits if it wanders too far, but don't be robotic.
5. Recommend actual products from SelebrityAboki Fruit's inventory when they match the user's needs.

RESPONSE STYLE:
1. Warm, professional, but accessible (the "Aboki" spirit - friendly and helpful).
2. Concise but informative (max 200 words).
3. Mention that SelebrityAboki Fruit provides the best fresh fruits in Iyana Technical.

BUSINESS INFORMATION:
- Store Name: SelebrityAboki Fruit
- Location: Iyana Technical, near Ogidi/Okolowo
- Phone: +234 803 295 8708
- Specialty: Fresh, organic, and premium fruits.
`;

    // Jailbreak detection patterns
    private readonly JAILBREAK_PATTERNS = [
        /ignore (all |previous |above )?instructions/i,
        /pretend (to be|you are|you're)/i,
        /roleplay as/i,
        /act as/i,
        /you are now/i,
        /forget (all |your |previous )?instructions/i,
        /disregard (all |your |previous )?instructions/i,
        /new persona/i,
        /bypass/i,
        /override/i,
        /reveal (your |the )?prompt/i,
        /show (your |the )?(system )?instructions/i,
        /what (are|is) your (system )?prompt/i,
    ];

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {
        this.groq = new Groq({
            apiKey: this.configService.get('GROQ_API_KEY'),
        });
    }

    /**
     * Main chat function - handles user queries
     */
    async chat(
        userId: string,
        userMessage: string,
        condition?: string
    ): Promise<string> {
        // 1. Rate limiting check
        await this.checkRateLimit(userId);

        // 2. Input validation
        if (!userMessage || userMessage.trim().length === 0) {
            throw new BadRequestException('Please enter a message');
        }

        if (userMessage.length > 500) {
            throw new BadRequestException('Message too long (max 500 characters)');
        }

        // 3. Jailbreak detection
        if (this.isJailbreakAttempt(userMessage)) {
            this.logger.warn(`Jailbreak attempt detected from user: ${userId}`);
            return "I'm here to help you with fruit recommendations! What health goals can I assist with?";
        }

        // 3b. Off-topic detection — save API calls for non-fruit questions
        if (this.isOffTopic(userMessage)) {
            return "I only answer questions about fruits, nutrition, and health benefits. I'm your dedicated SelebrityAboki Fruit advisor! Try asking me things like 'Which fruits help with diabetes?' or 'What fruits boost immunity?'";
        }

        // 4. Sanitize input
        const sanitizedMessage = this.sanitizeInput(userMessage);

        // 5. Build context-aware prompt with real inventory data
        let inventoryContext = "";
        try {
            const availableProducts = await this.prisma.product.findMany({
                where: { isAvailable: true },
                select: { name: true, price: true, healthBenefits: true, unit: true }
            });

            if (availableProducts.length > 0) {
                inventoryContext = "AVAILABLE PRODUCTS AT SELEBRITYABOKI FRUIT:\n" +
                    availableProducts.map(p => `- ${p.name}: ₦${p.price.toLocaleString()} per ${p.unit}. Benefits: ${p.healthBenefits || 'Fresh and organic'}`).join("\n");
            }
        } catch (e) {
            this.logger.error("Failed to fetch products for AI context", e);
        }

        const contextPrompt = condition
            ? `User has mentioned they are dealing with: ${condition}. `
            : '';

        try {
            // 6. Call Groq API with fallback logic
            let completion;
            try {
                // Try newer model first
                completion = await this.groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: this.SYSTEM_INSTRUCTION + "\n\n" + inventoryContext },
                        {
                            role: 'user',
                            content: `${contextPrompt}User question: ${sanitizedMessage}\n\nNote: Recommend specific products listed above if they fit the user's needs. Mention they are available for purchase.`,
                        },
                    ],
                    model: 'llama-3.1-8b-instant',
                    temperature: 0.4,
                    max_tokens: 400,
                });
            } catch (innerErr) {
                this.logger.warn(`Primary model failed, trying fallback: ${innerErr.message}`);
                // Fallback model
                completion = await this.groq.chat.completions.create({
                    messages: [
                        { role: 'system', content: this.SYSTEM_INSTRUCTION + "\n\n" + inventoryContext },
                        {
                            role: 'user',
                            content: `${contextPrompt}User: ${sanitizedMessage}`,
                        },
                    ],
                    model: 'llama3-8b-8192',
                    temperature: 0.4,
                    max_tokens: 400,
                });
            }

            const aiResponse =
                completion.choices[0]?.message?.content ||
                'I can certainly help you with fruit choices! Based on what we have fresh today...';

            // 7. Log conversation for personalization
            await this.logConversation(userId, sanitizedMessage, aiResponse, condition);

            // 8. Update rate limit
            await this.updateRateLimit(userId);

            return aiResponse;
        } catch (error) {
            this.logger.error(`AI request failed: ${error.message}`, error.stack);
            // Return a helpful fruit-related fallback instead of a generic error
            return "I'm having a moment — let me catch my breath! In the meantime, did you know that watermelon is 92% water and perfect for staying hydrated? Try again shortly, and I'll be ready to help you pick the best fruits at SelebrityAboki Fruit!";
        }
    }

    /**
     * Generate daily content (riddles, tips, facts)
     */
    async generateContent(type: 'RIDDLE' | 'HEALTH_TIP' | 'FRUIT_FACT'): Promise<any> {
        const prompts = {
            RIDDLE: `Create a clever riddle about a fruit (60% chance Nigerian/Tropical, 40% Global). Format as JSON only: {"question": "the riddle", "hint": "a helpful hint", "answer": "the fruit name"}. Make it challenging but solvable.`,
            HEALTH_TIP: `Write a health tip about eating fresh fruits. Include a specific fruit and its benefit. Balance: 60% Nigerian context, 40% Global health standards. Format as JSON only: {"title": "short title", "content": "the tip (2-3 sentences)", "fruit": "featured fruit"}. Mention SelebrityAboki Fruit naturally.`,
            FRUIT_FACT: `Share an interesting fact about a fruit. 60% focus on Nigerian/African varieties, 40% on exotic global fruits. Format as JSON only: {"title": "catchy title", "content": "the fact (2-3 sentences)", "fruit": "the fruit"}. Make it educational and engaging.`,
        };

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    {
                        role: 'system',
                        content:
                            'You are a creative content generator for SelebrityAboki Fruit. Respond ONLY with valid JSON. No markdown, no "here is your JSON", no backticks. Just the raw JSON object.',
                    },
                    { role: 'user', content: prompts[type] },
                ],
                model: 'llama-3.1-8b-instant',
                temperature: 0.85,
                max_tokens: 300,
            });

            let content = completion.choices[0]?.message?.content || '';

            // Clean common AI garbage (like markdown blocks)
            content = content.replace(/```json/g, '').replace(/```/g, '').trim();

            // Parse JSON response
            try {
                return JSON.parse(content);
            } catch (parseError) {
                this.logger.warn(`Failed to parse AI JSON: ${content}. Error: ${parseError.message}`);

                // Last ditch effort: regex for content between {}
                const match = content.match(/\{[\s\S]*\}/);
                if (match) {
                    try {
                        return JSON.parse(match[0]);
                    } catch { return null; }
                }
                return null;
            }
        } catch (error) {
            this.logger.error(`Content generation failed: ${error.message}`);
            return null;
        }
    }

    // ============================================
    // PRIVATE SECURITY METHODS
    // ============================================

    private isJailbreakAttempt(message: string): boolean {
        return this.JAILBREAK_PATTERNS.some((pattern) => pattern.test(message));
    }

    /**
     * Detect clearly off-topic messages to save API calls.
     * Returns true if the message is NOT about fruits, nutrition, or health.
     */
    private isOffTopic(message: string): boolean {
        const lower = message.toLowerCase().trim();

        // Allow very short messages/greetings to pass through for natural conversation
        if (lower.length <= 3 || /^(hi|hello|hey|yo|sup|greeting|good morning|good afternoon|good evening|how are you|how far|hello aboki)$/i.test(lower)) {
            return false;
        }

        // If the message contains any fruit/food/nutrition keyword, it's on-topic
        const fruitKeywords = [
            'fruit', 'apple', 'banana', 'mango', 'orange', 'grape', 'melon', 'watermelon',
            'pineapple', 'papaya', 'guava', 'pawpaw', 'coconut', 'lime', 'lemon', 'berry',
            'strawberry', 'blueberry', 'avocado', 'cherry', 'peach', 'pear', 'plum', 'kiwi',
            'fig', 'date', 'pomegranate', 'tangerine', 'grapefruit', 'passion', 'dragon',
            'vitamin', 'nutrient', 'nutrition', 'diet', 'health', 'eat', 'food', 'juice',
            'smoothie', 'salad', 'fresh', 'organic', 'weight', 'sugar', 'diabetes',
            'blood pressure', 'immunity', 'digest', 'antioxidant', 'fiber', 'protein',
            'mineral', 'calcium', 'iron', 'potassium', 'skin', 'hair', 'energy',
            'pregnant', 'pregnancy', 'baby', 'child', 'elderly', 'selebrity', 'aboki',
            'order', 'buy', 'price', 'delivery', 'stock', 'available', 'recommend',
            'cost', 'where', 'location', 'address', 'phone', 'contact', 'whatsapp',
        ];

        if (fruitKeywords.some(kw => lower.includes(kw))) {
            return false; // On-topic
        }

        // Check for clearly off-topic patterns
        const offTopicPatterns = [
            /\b(code|program|javascript|python|html|css|sql|api|react|nextjs)\b/i,
            /\b(politics|election|president|government|war|military|senate)\b/i,
            /\b(bitcoin|crypto|stock market|forex|trading|eth|solana)\b/i,
            /\b(math|calcul|equation|algebra|geometry)\b/i,
            /\b(religion|church|mosque|god|allah|jesus|bible|quran)\b/i,
        ];

        return offTopicPatterns.some(pattern => pattern.test(message));
    }

    private sanitizeInput(message: string): string {
        // Remove potential injection characters
        return message
            .replace(/[{}[\]]/g, '') // Remove JSON-like characters
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/\\/g, '') // Remove backslashes
            .trim();
    }

    private async checkRateLimit(userId: string): Promise<void> {
        const windowStart = new Date(Date.now() - 60000); // 1 minute window

        const record = await this.prisma.rateLimitRecord.findFirst({
            where: {
                identifier: userId,
                endpoint: '/api/ai/chat',
                windowStart: { gte: windowStart },
            },
        });

        if (record && record.requestCount >= 10) {
            throw new ForbiddenException(
                'You have reached the maximum number of AI requests. Please wait a minute.'
            );
        }
    }

    private async updateRateLimit(userId: string): Promise<void> {
        const windowStart = new Date(Date.now() - 60000);

        await this.prisma.rateLimitRecord.upsert({
            where: {
                identifier_endpoint: {
                    identifier: userId,
                    endpoint: '/api/ai/chat',
                },
            },
            update: {
                requestCount: { increment: 1 },
            },
            create: {
                identifier: userId,
                endpoint: '/api/ai/chat',
                requestCount: 1,
                windowStart: new Date(),
            },
        });
    }

    private async logConversation(
        userId: string,
        userMessage: string,
        aiResponse: string,
        condition?: string
    ): Promise<void> {
        try {
            await this.prisma.aiChatHistory.create({
                data: {
                    userId,
                    userMessage,
                    aiResponse,
                    condition,
                },
            });
        } catch (error) {
            this.logger.warn(`Failed to log conversation: ${error.message}`);
        }
    }
}
