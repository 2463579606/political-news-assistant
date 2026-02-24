// ============================================
// User Routes - 用户相关 API
// ============================================

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { SetApiKeySchema, UpdatePreferencesSchema } from '@pna/shared';
import { db, users } from '../db/connection';
import { eq } from 'drizzle-orm';
import { encrypt } from '../lib/crypto';

const userRoutes = new Hono();

/**
 * GET /user/profile
 * 获取用户信息
 */
userRoutes.get('/profile', async (c) => {
  // TODO: 从 JWT 或 session 获取 userId
  const userId = c.req.header('x-user-id') || 'demo-user';

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // 不返回加密的 API Key
  const { claudeApiKeyEncrypted, ...userSafe } = user;
  return c.json(userSafe);
});

/**
 * PUT /user/api-key
 * 设置 Claude API Key
 */
userRoutes.put('/api-key', zValidator('json', SetApiKeySchema), async (c) => {
  const { apiKey } = c.req.valid('json');

  // TODO: 从 JWT 或 session 获取 userId
  const userId = c.req.header('x-user-id') || 'demo-user';

  const encrypted = encrypt(apiKey);

  await db
    .update(users)
    .set({ claudeApiKeyEncrypted: encrypted, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return c.json({ success: true });
});

/**
 * PUT /user/preferences
 * 更新用户偏好
 */
userRoutes.put('/preferences', zValidator('json', UpdatePreferencesSchema), async (c) => {
  const updates = c.req.valid('json');

  // TODO: 从 JWT 或 session 获取 userId
  const userId = c.req.header('x-user-id') || 'demo-user';

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }

  // 合并偏好
  const currentPreferences = user.preferences as any;
  const newPreferences = { ...currentPreferences, ...updates };

  await db
    .update(users)
    .set({
      preferences: newPreferences as any,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return c.json({ preferences: newPreferences });
});

export { userRoutes };
