# 🍊 SelebrityAboki Fruit

Fresh fruits & AI-powered health recommendations from Iyana Technical, Ibadan.

## Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, PWA
- **Backend**: NestJS 10, Fastify, Prisma ORM
- **Database**: PostgreSQL
- **AI**: Groq SDK (Llama-based models)
- **Auth**: Google OAuth + JWT

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Google OAuth credentials
- Groq API key

### 1. Clone & Install
```bash
git clone https://github.com/dmaximboi/selebrityaboki.git
cd selebrityaboki

# Install all dependencies
npm install
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Environment Setup
```bash
# Backend env
cp .env.example .env
# Edit .env with your actual values

# Frontend env
cp frontend/.env.example frontend/.env.local
```

### 3. Database Setup
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
cd ..
```

### 4. Run Development
```bash
npm run dev
```
- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- API: http://localhost:4000/api

## Project Structure
```
selebrityaboki/
├── backend/          # NestJS API
│   ├── prisma/       # Database schema & migrations
│   └── src/          # Source code
│       ├── ai/       # AI health advisor
│       ├── auth/     # Google OAuth + JWT
│       ├── orders/   # Order management
│       └── ...
├── frontend/         # Next.js App
│   └── src/
│       ├── app/      # Pages (shop, contact, ai-advisor, etc.)
│       ├── components/
│       ├── lib/      # API client
│       └── store/    # Zustand state
└── .env.example      # Environment template
```

## License
Private - All Rights Reserved
