import "server-only";
import { db } from "@/services/db";
import { featureFlag, featureFlagAssignment } from "@/services/db/schema";
import { eq, and } from "drizzle-orm";

export type FeatureFlagRow = typeof featureFlag.$inferSelect;
export type FeatureFlagAssignmentRow = typeof featureFlagAssignment.$inferSelect;

export interface UserFeatureFlagView {
  id: string;
  key: string;
  description: string | null;
  enabledGlobally: boolean;
  userOverride: boolean | null;
  effectiveEnabled: boolean;
}

const DEFAULT_FLAGS = [
  {
    key: "hybrid_scoring",
    description: "Combines dense vector similarity (pgvector HNSW) with sparse lexical keywords (tsvector BM25) for ultra-accurate match scoring.",
    enabledGlobally: false,
  },
  {
    key: "new_adapters",
    description: "Trial access to experimental third-party job crawlers and DRC regional job boards.",
    enabledGlobally: false,
  },
];

/**
 * Retrieve a feature flag record by its unique key.
 */
export async function getFeatureFlagByKey(
  key: string
): Promise<FeatureFlagRow | null> {
  const [flag] = await db
    .select()
    .from(featureFlag)
    .where(eq(featureFlag.key, key))
    .limit(1);

  return flag ?? null;
}

/**
 * Retrieve a per-user feature flag assignment override.
 */
export async function getFeatureFlagAssignment(
  featureFlagId: string,
  userId: string
): Promise<FeatureFlagAssignmentRow | null> {
  const [assignment] = await db
    .select()
    .from(featureFlagAssignment)
    .where(
      and(
        eq(featureFlagAssignment.featureFlagId, featureFlagId),
        eq(featureFlagAssignment.userId, userId)
      )
    )
    .limit(1);

  return assignment ?? null;
}

/**
 * Ensures baseline system feature flags exist in the database.
 */
export async function ensureDefaultFeatureFlags(): Promise<void> {
  try {
    for (const def of DEFAULT_FLAGS) {
      const existing = await getFeatureFlagByKey(def.key);
      if (!existing) {
        await db
          .insert(featureFlag)
          .values({
            key: def.key,
            description: def.description,
            enabledGlobally: def.enabledGlobally,
          })
          .onConflictDoNothing();
      }
    }
  } catch (err) {
    console.warn("[Flags DAL] Failed to seed default flags:", err);
  }
}

/**
 * Fetch all feature flags along with the user's specific override state.
 */
export async function getUserFeatureFlagsWithAssignments(
  userId: string
): Promise<UserFeatureFlagView[]> {
  try {
    await ensureDefaultFeatureFlags();

    const flags = await db.select().from(featureFlag);
    const assignments = await db
      .select()
      .from(featureFlagAssignment)
      .where(eq(featureFlagAssignment.userId, userId));

    const assignmentMap = new Map(
      assignments.map((a) => [a.featureFlagId, a.enabled])
    );

    return flags.map((flag) => {
      const userOverride = assignmentMap.has(flag.id)
        ? (assignmentMap.get(flag.id) ?? null)
        : null;

      const effectiveEnabled =
        userOverride !== null ? userOverride : flag.enabledGlobally;

      return {
        id: flag.id,
        key: flag.key,
        description: flag.description,
        enabledGlobally: flag.enabledGlobally,
        userOverride,
        effectiveEnabled,
      };
    });
  } catch (error) {
    console.error("[Flags DAL] Failed to get user flags:", error);
    return [];
  }
}

/**
 * Upsert a per-user override for a feature flag.
 */
export async function upsertUserFeatureFlagAssignment(
  featureFlagId: string,
  userId: string,
  enabled: boolean
): Promise<void> {
  await db
    .insert(featureFlagAssignment)
    .values({
      featureFlagId,
      userId,
      enabled,
    })
    .onConflictDoUpdate({
      target: [featureFlagAssignment.featureFlagId, featureFlagAssignment.userId],
      set: {
        enabled,
        updatedAt: new Date(),
      },
    });
}

/**
 * Delete a user's feature flag override, restoring global default behavior.
 */
export async function deleteUserFeatureFlagAssignment(
  featureFlagId: string,
  userId: string
): Promise<void> {
  await db
    .delete(featureFlagAssignment)
    .where(
      and(
        eq(featureFlagAssignment.featureFlagId, featureFlagId),
        eq(featureFlagAssignment.userId, userId)
      )
    );
}
