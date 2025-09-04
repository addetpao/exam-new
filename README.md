# ExamPrep Platform (CompTIA A+)

A comprehensive exam preparation platform for CompTIA A+ certification, built with Next.js 14, Supabase, and Stripe.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Architecture

- **Frontend**: Next.js 14 with App Router
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Payments**: Stripe
- **Hosting**: Vercel
- **Analytics**: Google Analytics 4

## Project Structure

```
├── app/                 # Next.js App Router pages
├── components/          # Reusable React components
├── lib/                 # Utilities, types, and configurations
├── public/              # Static assets
└── tests/               # Test files
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript checks

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_APP_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

## License

MIT