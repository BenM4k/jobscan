import {
  pgTable,
  uuid,
  text,
  boolean,
  pgEnum,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { timestamps } from "./common";
import { job } from "./job";

export const skill = pgTable("skill", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  ...timestamps,
});

export const skillRelationTypeEnum = pgEnum("skill_relation_type", [
  "implies",
  "broader_than",
]);

/** DAG edges for skill hierarchies and implications */
export const skillRelation = pgTable(
  "skill_relation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromSkillId: uuid("from_skill_id")
      .references(() => skill.id)
      .notNull(),
    toSkillId: uuid("to_skill_id")
      .references(() => skill.id)
      .notNull(),
    relationType: skillRelationTypeEnum("relation_type").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("skill_relation_edge_idx").on(
      t.fromSkillId,
      t.toSkillId,
      t.relationType
    ),
    check("skill_relation_no_self_link", sql`${t.fromSkillId} != ${t.toSkillId}`),
  ]
);

export const jobSkill = pgTable(
  "job_skill",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .references(() => job.id)
      .notNull(),
    skillId: uuid("skill_id")
      .references(() => skill.id)
      .notNull(),
    required: boolean("required").default(true).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("job_skill_unique_idx").on(t.jobId, t.skillId),
  ]
);
