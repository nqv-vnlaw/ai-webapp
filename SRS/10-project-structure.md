# Project Structure

## 18. Project Structure Specification

### 18.1 Monorepo Structure

```
vnlaw-webapps/
├── apps/
│   └── precedent-search/           # Main application
│       ├── src/
│       │   ├── main.tsx            # Entry point
│       │   ├── App.tsx             # Root component with providers
│       │   ├── routes/             # Page components
│       │   │   ├── index.tsx       # / - Combined search + chat
│       │   │   ├── access-denied.tsx
│       │   │   └── settings.tsx    # Required (Workspace connection, user prefs)
│       │   ├── components/         # Feature components
│       │   │   ├── layout/
│       │   │   ├── search/
│       │   │   ├── chat/
│       │   │   ├── citations/
│       │   │   ├── feedback/
│       │   │   ├── error/
│       │   │   └── common/
│       │   ├── hooks/              # App-specific hooks
│       │   ├── stores/             # State management
│       │   ├── utils/              # App utilities
│       │   └── styles/             # Global styles
│       ├── public/                 # Static assets
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── ui/                         # Shared UI components (shadcn/ui)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   └── ...
│   │   │   └── index.ts
│   │   └── package.json
│   ├── api-client/                 # Typed API client
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   ├── errors.ts
│   │   │   ├── hooks/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── auth/                       # Kinde integration
│   │   ├── src/
│   │   │   ├── provider.tsx
│   │   │   ├── hooks.ts
│   │   │   ├── guards.tsx
│   │   │   └── index.ts
│   │   └── package.json
│   └── shared/                     # Shared types and utilities
│       ├── src/
│       │   ├── types/
│       │   ├── utils/
│       │   └── index.ts
│       └── package.json
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── netlify.toml
├── package.json                    # Root package.json (pnpm workspaces)
├── pnpm-workspace.yaml             # pnpm workspace configuration
├── pnpm-lock.yaml                  # pnpm lockfile
├── tsconfig.base.json              # Shared TypeScript config
└── README.md
```

### 18.2 Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `SearchInput.tsx` |
| Hooks | camelCase with `use` prefix | `useSearch.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Types/Interfaces | PascalCase | `SearchResult` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_QUERY_LENGTH` |
| CSS classes | kebab-case (Tailwind) | `search-input` |
| Test files | `*.test.ts` or `*.spec.ts` | `SearchInput.test.tsx` |
