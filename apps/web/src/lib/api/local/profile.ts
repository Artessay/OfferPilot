/** Local-mode profile API. */
import type { ProfileApi } from "@/lib/api/contract";
import { HARD_SKILLS } from "@/lib/ai/skills";
import { getDb } from "@/lib/api/local/db";
import { currentUserId, nowIso, uuid } from "@/lib/api/local/helpers";
import { toProfile } from "@/lib/api/local/mappers";
import type { ProfileRow } from "@/lib/api/local/rows";
import type { Profile, ProfileInput, SkillSuggestions } from "@/lib/api/types";

async function getOrCreate(userId: string): Promise<ProfileRow> {
  const db = await getDb();
  const [existing] = await db.getAllFromIndex("profiles", "byUser", userId);
  if (existing) return existing;
  const row: ProfileRow = {
    id: uuid(),
    userId,
    educationLevel: null,
    school: null,
    major: null,
    graduationYear: null,
    targetRoles: [],
    targetCities: [],
    industries: [],
    skills: [],
    careerInterests: [],
    updatedAt: nowIso(),
  };
  await db.put("profiles", row);
  return row;
}

export const localProfileApi: ProfileApi = {
  async get(): Promise<Profile> {
    return toProfile(await getOrCreate(await currentUserId()));
  },

  async update(input: ProfileInput): Promise<Profile> {
    const userId = await currentUserId();
    const db = await getDb();
    const row = await getOrCreate(userId);
    if (input.educationLevel !== undefined) row.educationLevel = input.educationLevel ?? null;
    if (input.school !== undefined) row.school = input.school ?? null;
    if (input.major !== undefined) row.major = input.major ?? null;
    if (input.graduationYear !== undefined) row.graduationYear = input.graduationYear ?? null;
    if (input.targetRoles !== undefined) row.targetRoles = input.targetRoles;
    if (input.targetCities !== undefined) row.targetCities = input.targetCities;
    if (input.industries !== undefined) row.industries = input.industries;
    if (input.skills !== undefined) row.skills = input.skills;
    if (input.careerInterests !== undefined) row.careerInterests = input.careerInterests;
    row.updatedAt = nowIso();
    await db.put("profiles", row);
    return toProfile(row);
  },

  async suggestSkills(): Promise<SkillSuggestions> {
    const profile = await getOrCreate(await currentUserId());
    const targetText = [...profile.targetRoles, ...profile.industries].join(" ").toLowerCase();
    const existing = new Set(profile.skills.map((s) => s.toLowerCase()));
    const suggestions: string[] = [];
    for (const [canonical, aliases] of Object.entries(HARD_SKILLS)) {
      if (existing.has(canonical.toLowerCase())) continue;
      if ([canonical, ...aliases].some((a) => targetText.includes(a.toLowerCase()))) {
        suggestions.push(canonical);
      }
    }
    const skills = suggestions.length
      ? suggestions
      : ["SQL", "Python", "Excel", "数据分析", "沟通能力"];
    return { skills: skills.slice(0, 10) };
  },
};
