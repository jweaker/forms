# VibeForm

Built for the HUB200 GEW Coding Competition.

A modern form builder with AI-powered generation, advanced validation, and response analytics.

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- tRPC for type-safe APIs
- Drizzle ORM with SQLite/Turso
- Better Auth for authentication
- Tailwind CSS 4
- shadcn/ui components
- dnd-kit for drag and drop

## Features

**Form Building**

- Drag and drop form builder with 11 field types
- AI form generation from natural language
- Regex validation with templates for common patterns
- Multi-select fields with selection limits
- Default values and help text
- Form scheduling with open time and deadline

**Response Management**

- View and edit responses
- Export to CSV
- Filter by form version
- Response edit history
- Anonymous or authenticated submissions
- AI-powered response analysis with charts and insights

**Authentication**

- OAuth with GitHub and Google
- Email/password login
- Optional login for anonymous forms

**Other**

- Dark mode support
- Automatic form versioning for breaking changes
- Rate limiting to prevent spam
- Input sanitization for security

## Getting Started

### Prerequisites

- Node.js 18 or higher
- pnpm or npm

### Installation

1. Clone the repository

   ```bash
   git clone <repository-url>
   cd forms
   ```

2. Install dependencies

   ```bash
   pnpm install
   ```

3. Set up environment variables

   ```bash
   cp .env.example .env.local
   ```

   Required variables:

   ```env
   DATABASE_URL="file:./sqlite.db"
   BETTER_AUTH_SECRET="your-secret-min-32-chars"
   BETTER_AUTH_BASE_URL="http://localhost:3000"
   NEXT_PUBLIC_BETTER_AUTH_BASE_URL="http://localhost:3000"
   ```

   Optional OAuth providers:

   ```env
   BETTER_AUTH_GITHUB_CLIENT_ID="your-github-client-id"
   BETTER_AUTH_GITHUB_CLIENT_SECRET="your-github-secret"
   BETTER_AUTH_GOOGLE_CLIENT_ID="your-google-client-id"
   BETTER_AUTH_GOOGLE_CLIENT_SECRET="your-google-secret"
   ```

4. Push database schema

   ```bash
   pnpm db:push
   ```

5. Start development server

   ```bash
   pnpm dev
   ```

6. Open http://localhost:3000

## Building for Production

```bash
pnpm build
pnpm start
```

## Database

The project uses SQLite for local development and can be configured to use Turso for production.

To use Turso:

```env
DATABASE_URL="libsql://your-database.turso.io"
DATABASE_AUTH_TOKEN="your-auth-token"
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT
