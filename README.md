# 📋 VibeForm - Modern Form Builder

**Built in 1 day for the hub200 GEW Coding Competition**

A powerful, AI-powered form builder with real-time collaboration, advanced validation, and comprehensive analytics. Built with the latest web technologies including Next.js 15, tRPC, and Better Auth.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Next.js 15](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## ✨ Features

### Core Functionality

- **🎨 Drag & Drop Form Builder** - Intuitive interface with 11 field types
- **🤖 AI-Powered Generation** - Generate complete forms from natural language descriptions
- **📊 Response Management** - View, edit, export responses as CSV
- **🔐 Advanced Auth** - OAuth (GitHub, Google) + Email/Password via Better Auth
- **📱 Fully Responsive** - Responsive design with Tailwind CSS 4
- **🌙 Dark Mode** - Beautiful UI with light/dark theme support

### Form Features

- **Field Types**: Text, Textarea, Number, Range, Date, Time, DateTime, Select, Radio, Checkbox, Checkbox Group
- **Validation**: Regex patterns, min/max values, custom error messages, templates (Email, Phone, URL, etc.)
- **Multi-Select**: Dropdown and checkbox groups with selection limits
- **Conditional Logic**: Default values, required fields, help text
- **Form Scheduling**: Set open time and deadline for submissions
- **Version Control**: Automatic versioning when breaking changes are made

### Security & Performance

- **XSS Protection**: Input sanitization across all endpoints
- **Rate Limiting**: Reasonable limits (10 submissions/hour) to prevent spam
- **CSRF Protection**: SameSite cookies with httpOnly flags
- **Efficient Slug Generation**: No infinite loops, timestamp-based fallbacks
- **Optimized Queries**: Single query for dashboard with proper indexing

### Developer Experience

- **Type Safety**: Full TypeScript coverage with tRPC
- **Database**: SQLite with Drizzle ORM (supports Turso for production)
- **Hot Reload**: Turbopack for instant updates
- **Modular Code**: Extracted components and helper utilities
- **Clean Architecture**: Separated concerns, reusable functions

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd forms
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:

   ```env
   # Database (SQLite for local, Turso for production)
   DATABASE_URL="file:./sqlite.db"
   DATABASE_AUTH_TOKEN="" # Only for Turso

   # Better Auth (generate a 32+ character secret)
   BETTER_AUTH_SECRET="your-super-secret-key-min-32-chars"
   BETTER_AUTH_BASE_URL="http://localhost:3000"
   NEXT_PUBLIC_BETTER_AUTH_BASE_URL="http://localhost:3000"

   # OAuth Providers (optional)
   BETTER_AUTH_GITHUB_CLIENT_ID="your-github-client-id"
   BETTER_AUTH_GITHUB_CLIENT_SECRET="your-github-secret"
   BETTER_AUTH_GOOGLE_CLIENT_ID="your-google-client-id"
   BETTER_AUTH_GOOGLE_CLIENT_SECRET="your-google-secret"
   ```

4. **Push database schema**

   ```bash
   pnpm db:push
   ```

5. **Run development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**
   ```
   http://localhost:3000
   ```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS 4
- **Backend**: tRPC 11, Next.js API Routes
- **Database**: Drizzle ORM + SQLite (local) / Turso (production)
- **Authentication**: Better Auth with OAuth providers
- **UI Components**: shadcn/ui with Radix UI primitives
- **Drag & Drop**: dnd-kit for form field reordering
- **Validation**: Zod for schema validation
- **Styling**: Tailwind CSS 4 with CSS variables for theming

### Project Structure

```
src/
├── app/                      # Next.js 15 App Router
│   ├── api/                 # API routes (AI, Auth, tRPC)
│   ├── dashboard/           # User dashboard
│   ├── f/[slug]/           # Public form pages
│   ├── forms/[slug]/       # Form builder & management
│   └── layout.tsx          # Root layout with providers
├── components/              # React components
│   ├── form-builder/       # Form builder components
│   ├── ui/                 # shadcn/ui components
│   └── error-boundary.tsx  # Error boundary
├── lib/                    # Utilities
│   ├── ai-form-utils.ts   # AI form serialization
│   ├── field-types.ts     # Field type definitions
│   └── utils.ts           # Helper functions
├── server/                 # Backend code
│   ├── api/
│   │   ├── helpers/       # Rate limiting, versioning, slugs
│   │   └── routers/       # tRPC routers
│   ├── better-auth/       # Auth configuration
│   └── db/                # Database schema & client
└── trpc/                  # tRPC client setup
```

### Key Design Decisions

1. **No Infinite Loops**: Slug generation uses smart fallbacks with timestamps instead of `while(true)` loops
2. **Modular Components**: 2447-line form builder broken into reusable components
3. **Security First**: Input sanitization, rate limiting, and proper auth configuration
4. **Performance**: Optimized queries with proper indexing, memoized components
5. **Type Safety**: Full TypeScript coverage with tRPC for end-to-end type safety

## 📝 Usage Examples

### Creating a Form with AI

```typescript
// Describe your form in natural language
"Create a customer feedback form with name, email,
rating from 1-5, and comments"

// AI generates the complete form structure
```

### Custom Validation

```typescript
// Email validation template
regexPattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
validationMessage: "Please enter a valid email address";
```

### Form Versioning

When you make breaking changes (delete field, change type, add required field), the system automatically:

- Increments form version
- Creates a snapshot of the old version
- Associates responses with specific versions

## 🧪 Testing

### Run Tests

```bash
pnpm test
```

### Type Check

```bash
pnpm type-check
```

### Lint

```bash
pnpm lint
```

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy!

### Docker

```bash
docker build -t forms .
docker run -p 3000:3000 forms
```

### Environment Variables for Production

Make sure to set:

- `NODE_ENV=production`
- `BETTER_AUTH_BASE_URL` to your production URL
- `DATABASE_URL` to your Turso database
- `DATABASE_AUTH_TOKEN` for Turso authentication

## 🔒 Security Features

- **Input Sanitization**: All user inputs are sanitized to prevent XSS attacks
- **Rate Limiting**: 10 submissions per hour per IP/user (configurable)
- **CSRF Protection**: SameSite cookies with proper configuration
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM
- **Secure Cookies**: httpOnly, secure flags in production
- **OAuth**: Secure authentication flow with Better Auth

## 📊 Database Schema

### Core Tables

- `forms` - Form metadata and settings
- `form_fields` - Field definitions with validation rules
- `form_responses` - User submissions
- `form_response_fields` - Individual field values
- `form_version_history` - Version snapshots
- `form_response_history` - Edit history

### Relationships

- Forms → Fields (1:many)
- Forms → Responses (1:many)
- Responses → Response Fields (1:many)
- Users → Forms (1:many, creator)
- Users → Responses (1:many, submitter)

## 🤝 Contributing

This project was built in 1 day for a coding competition. While it's production-ready, contributions are welcome!

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built for **Hub200 GEW Coding Competition**
- Inspired by modern form builders like Typeform and Google Forms
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Authentication powered by [Better Auth](https://better-auth.com/)

## 📞 Support

For issues and questions:

- Open an issue on GitHub
- Email: [your-email]
- Discord: [your-discord]

---

**Built with ❤️ in 1 day** | © 2024 VibeForm
