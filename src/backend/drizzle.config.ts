import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema-sqlite.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: './political_news.db',
  },
} satisfies Config;
