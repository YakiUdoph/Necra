# ADR 0001: Development foundation

- Status: Accepted for T001
- Date: 2026-10-27

## Context

Necra needs a trustworthy agreement-change review foundation without committing early to infrastructure that has not demonstrated value. T001 needs a maintainable web foundation, not persistence, authentication, evidence processing, or the Clocked integration.

## Decision

- Use a single Next.js 16.4.3 App Router application with React 19.3.1 and strict TypeScript 7.0.2.
- Standardize on Node.js 24.18.x LTS and npm with an exact dependency lockfile.
- Use Biome 2.6.3 for linting and formatting, avoiding the peer-version conflict observed between ESLint 10, `eslint-config-next` 16.4.3, and its TypeScript lint dependencies. Use Vitest 5.0.5 for unit tests.
- Use Tailwind CSS 4.3.3 through `@tailwindcss/postcss` 4.3.3 and PostCSS 8.5.31. Keep the product tokens in CSS and use locally maintained presentation styles rather than a component theme.
- Validate optional server configuration with Zod 4.6.7 and guard the environment module with `server-only`.
- Keep the initial deployment shape to one Node.js application. Do not add queues, OCR, background workers, microservices, PostgreSQL, authentication, or object storage in T001.
- Revisit asynchronous work only if measured Clocked or document-processing behavior cannot safely fit a bounded request flow. Record a new ADR before adding infrastructure.

## Official references reviewed

Accessed 2026-10-27:

- Next.js installation and system requirements: https://nextjs.org/docs/app/getting-started/installation
- Next.js Node deployment: https://nextjs.org/docs/app/getting-started/deploying
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables
- Next.js server/client boundaries and `server-only`: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js installation and supported linter choices: https://nextjs.org/docs/app/getting-started/installation
- Node.js release status: https://nodejs.org/en/about/previous-releases
- TypeScript strict mode: https://www.typescriptlang.org/tsconfig/strict
- Vitest getting started and supported releases: https://vitest.dev/guide/ and https://vitest.dev/releases.html
- Biome installation and version pinning: https://biomejs.dev/installation/install-biome/ and https://biomejs.dev/internals/versioning/
- Tailwind CSS for Next.js: https://tailwindcss.com/docs/installation/framework-guides/nextjs

Exact package versions were checked against npm registry metadata on 2026-10-27 before the manifest was written. The initial ESLint/Prettier choice was replaced after npm reported incompatible peer ranges during installation.

## Consequences

- The shell builds and tests without external service credentials.
- No current screen implies that persistence, authentication, Agreement Reality Check, Decision Replay, or Clocked works.
- PostgreSQL, authentication, and private object storage remain future external configuration decisions.
- Node.js 24 is required; environments on another major must switch to the recorded LTS version.
