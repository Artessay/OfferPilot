/** Local-mode auth: a single auto-provisioned in-browser profile (no server). */
import type { AuthApi } from "@/lib/api/contract";
import { getDb } from "@/lib/api/local/db";
import {
  currentUserId,
  getMeta,
  nowIso,
  setCurrentUserId,
  setMeta,
  uuid,
} from "@/lib/api/local/helpers";
import { toUserPublic } from "@/lib/api/local/mappers";
import type { UserRow } from "@/lib/api/local/rows";
import { seedInitialData } from "@/lib/api/local/seed";
import type { AuthResult } from "@/lib/api/types";

const SEEDED_KEY = "seeded";
const LOCAL_TOKENS = { accessToken: "local", refreshToken: "local", tokenType: "bearer" };

/** Get or create the single local user, seeding starter data on first run. */
export async function ensureLocalUser(): Promise<UserRow> {
  const db = await getDb();
  const existingId = await getMeta<string>("currentUserId");
  if (existingId) {
    const found = await db.get("users", existingId);
    if (found) return found;
  }
  const user: UserRow = {
    id: uuid(),
    email: null,
    nickname: "本地用户",
    role: "student",
    accountType: "local",
    createdAt: nowIso(),
  };
  await db.put("users", user);
  await setCurrentUserId(user.id);
  if (!(await getMeta<boolean>(SEEDED_KEY))) {
    await seedInitialData(user.id);
    await setMeta(SEEDED_KEY, true);
  }
  return user;
}

function authResult(user: UserRow): AuthResult {
  return { user: toUserPublic(user), tokens: { ...LOCAL_TOKENS } };
}

export const localAuthApi: AuthApi = {
  async register(_email, _password, nickname) {
    const user = await ensureLocalUser();
    if (nickname) {
      user.nickname = nickname;
      await (await getDb()).put("users", user);
    }
    return authResult(user);
  },
  async login(_email, _password) {
    return authResult(await ensureLocalUser());
  },
  async guest() {
    return authResult(await ensureLocalUser());
  },
  async me() {
    const db = await getDb();
    const id = await currentUserId();
    const user = (await db.get("users", id)) ?? (await ensureLocalUser());
    return toUserPublic(user);
  },
};
