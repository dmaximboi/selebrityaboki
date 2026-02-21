'use client';

import { useState, useRef, useEffect } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useAuthStore } from '@/store/auth';
import { aiApi, authApi } from '@/lib/api';

interface Message {
    role: 'user' | 'ai';
    content: string;
}

export default function AiAdvisorPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'ai',
            content:
                "Hello! I'm the SelebrityAboki Fruit Health Advisor. I can help you with:\n\n- Which fruits are best for your health condition\n- Nutritional benefits of specific fruits\n- Fruit recommendations for weight loss, immunity, diabetes, etc.\n- What's fresh and available at SelebrityAboki Fruit\n\nPlease note: I only answer questions about fruits and nutrition. Ask me anything!",
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [condition, setCondition] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { isAuthenticated } = useAuthStore();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage() {
        if (!input.trim() || loading) return;

        if (!isAuthenticated) {
            window.location.href = authApi.getGoogleAuthUrl();
            return;
        }

        const userMessage = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setLoading(true);

        try {
            const { response } = await aiApi.chat(userMessage, condition || undefined);
            setMessages((prev) => [...prev, { role: 'ai', content: response }]);
        } catch (error: any) {
            let errorMsg: string;
            switch (error.status) {
                case 429:
                    errorMsg = "You've sent too many messages. Please wait a moment and try again.";
                    break;
                case 401:
                    errorMsg = "Your session has expired. Please sign in again to continue chatting.";
                    break;
                case 400:
                    errorMsg = error.message || "I can only answer questions about fruits and nutrition. Could you rephrase your question?";
                    break;
                default:
                    errorMsg = "I specialize in fruits and nutrition advice for SelebrityAboki Fruit. Please ask me about fruits, health benefits, or what to eat for your condition — I'm here to help!";
            }
            setMessages((prev) => [
                ...prev,
                { role: 'ai', content: errorMsg },
            ]);
        }
        setLoading(false);
    }

    const suggestions = [
        'What fruits are best for immunity?',
        'I have high blood pressure, what should I eat?',
        'Best fruits for weight loss?',
        'Which fruits help with digestion?',
    ];

    return (
        <>
            <Navigation />
            <main style={{ paddingTop: 'var(--header-height)' }}>
                <section className="section">
                    <div className="container">
                        <div className="chat-container">
                            <span className="hero-tag">AI-Powered</span>
                            <h1 className="section-title">Health Advisor</h1>
                            <hr className="divider" />
                            <p className="section-subtitle" style={{ marginBottom: 24 }}>
                                Ask our AI about fruits, nutrition, and health benefits.
                                Get personalized recommendations from SelebrityAboki Fruit.
                            </p>

                            {/* Health condition input */}
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Health condition (optional)</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., diabetes, high blood pressure, pregnancy..."
                                    value={condition}
                                    onChange={(e) => setCondition(e.target.value)}
                                    style={{ fontSize: '0.88rem' }}
                                />
                            </div>

                            {/* Suggestions */}
                            {messages.length <= 1 && (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                                    {suggestions.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => {
                                                setInput(s);
                                            }}
                                            className="btn btn-ghost btn-sm"
                                            style={{
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-lg)',
                                                fontSize: '0.82rem',
                                            }}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Messages */}
                            <div className="chat-messages" style={{
                                background: 'var(--color-bg-alt)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 20,
                                marginBottom: 0,
                            }}>
                                {messages.map((msg, i) => (
                                    <div
                                        key={i}
                                        className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : ''}`}
                                    >
                                        <div className={`chat-avatar ${msg.role === 'ai' ? 'chat-avatar-ai' : 'chat-avatar-user'}`}>
                                            {msg.role === 'ai' ? 'SF' : '?'}
                                        </div>
                                        <div className={`chat-bubble ${msg.role === 'ai' ? 'chat-bubble-ai' : 'chat-bubble-user'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))}

                                {loading && (
                                    <div className="chat-message">
                                        <div className="chat-avatar chat-avatar-ai">SF</div>
                                        <div className="chat-bubble chat-bubble-ai">
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Thinking...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input */}
                            <div className="chat-input-area">
                                <input
                                    type="text"
                                    className="chat-input"
                                    placeholder={isAuthenticated ? 'Ask about fruits, nutrition, or health benefits...' : 'Sign in to chat with the advisor'}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    disabled={loading}
                                />
                                <button
                                    onClick={sendMessage}
                                    className="btn btn-primary"
                                    disabled={loading || !input.trim()}
                                >
                                    Send
                                </button>
                            </div>

                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 8, textAlign: 'center' }}>
                                The AI advisor provides general guidance. Always consult healthcare professionals for medical advice.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </>
    );
}
