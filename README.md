# PrimarySetup — Production-Ready Next.js Starter Template

A modern, scalable Next.js App Router starter template designed for production web applications with a clean feature-based architecture.

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS v4 & shadcn/ui
- **Server State**: TanStack Query
- **Global Client State**: Redux Toolkit (with Typed Hooks)
- **HTTP Client**: Axios with centralized error parsing and credentials
- **Validation**: Zod schema validation
- **Authentication**: Cookie-based HttpOnly tokens (JWT)

---

## 📁 Architecture Overview

```
src/
├── app/              # Next.js App Router pages, layouts, errors, route groups
├── config/           # Centralized environment validation (Zod)
├── constants/        # Application constants & route definitions
├── features/         # Feature modules (components, services, schemas, types, store)
│   ├── auth/         # Authentication domain
│   └── user/         # User domain
├── components/       # Shared presentation layer
│   ├── layout/       # Sidebar & shell layouts
│   ├── shared/       # Reusable components & async UI states (Loading, Empty, Error)
│   └── ui/           # shadcn/ui primitives
├── hooks/            # Global reusable utility hooks
├── lib/              # Infrastructure utilities (api, axios, auth, cookies, logger)
├── providers/        # Application-level providers (Query, Redux, Auth)
├── types/            # Truly global types & API response structures
└── proxy.ts          # Edge/middleware session & route protection
```

---

## 🔑 State Management Separation

1. **TanStack Query**: Owns server state, data fetching, mutations, caching, and server synchronization.
2. **Redux Toolkit**: Owns global mutable client UI state (modals, client filters, UI drawers).
3. **Authentication**: Managed via secure HttpOnly cookies. Tokens are **never** stored in Redux or `localStorage`.

---

## 🛠️ Environment Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Description | Exposed to Browser |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API endpoint | Yes |
| `JWT_ACCESS_SECRET` | Secret for token verification in proxy | No (Server only) |

---

## 💻 Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Check TypeScript types
npx tsc --noEmit

# Run production build
pnpm build
```
