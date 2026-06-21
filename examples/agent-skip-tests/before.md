# Project Guidelines

## Tech Stack

- Next.js 14 (App Router)
- TypeScript 5.5
- Prisma ORM
- Vitest for testing
- Tailwind CSS

## Code Style

- Use functional components with hooks
- Prefer server components by default, add `"use client"` only when needed
- Keep API routes in `app/api/` directory
- Use Zod for all input validation
- Co-locate tests with source files (`*.test.ts` next to `*.ts`)

## Testing

- Run `npm test` before committing
- Write unit tests for utility functions
- Write integration tests for API routes
- Use `@testing-library/react` for component tests

## Pull Requests

- Keep PRs focused on a single concern
- Include screenshots for UI changes
- Reference the related issue number
- Ensure CI passes before requesting review

## Architecture Notes

- Authentication uses JWT session tokens (see `src/lib/auth.ts`)
- Database access goes through Prisma client (`src/lib/db.ts`)
- Shared UI components live in `src/components/ui/`
- Business logic lives in `src/lib/services/`
