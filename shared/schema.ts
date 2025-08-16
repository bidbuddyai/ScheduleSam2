import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const actionItemStatusEnum = pgEnum("action_item_status", ["Open", "In Progress", "Closed"]);
export const openItemStatusEnum = pgEnum("open_item_status", ["Open", "Closed"]);
export const userRoleEnum = pgEnum("user_role", ["Admin", "Standard", "Viewer"]);
export const fileTypeEnum = pgEnum("file_type", ["Audio", "Attachment"]);

// Tables
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  colorPrimary: text("color_primary").notNull().default("#03512A"),
  colorSecondary: text("color_secondary").notNull().default("#1C7850"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  seqNum: integer("seq_num").notNull(),
  date: text("date").notNull(),
  time: text("time").notNull(),
  location: text("location").notNull(),
  preparedBy: text("prepared_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  role: text("role").notNull(),
  name: text("name").notNull(),
  company: text("company").notNull(),
  presentBool: boolean("present_bool").notNull().default(false)
});

export const agendaItems = pgTable("agenda_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  topicOrder: integer("topic_order").notNull(),
  title: text("title").notNull(),
  discussion: text("discussion"),
  decision: text("decision")
});

export const actionItems = pgTable("action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  agendaItemId: varchar("agenda_item_id").references(() => agendaItems.id),
  action: text("action").notNull(),
  owner: text("owner").notNull(),
  ballInCourt: text("ball_in_court").notNull(),
  dueDate: text("due_date"),
  status: actionItemStatusEnum("status").notNull().default("Open"),
  notes: text("notes"),
  sourceMeetingId: varchar("source_meeting_id").references(() => meetings.id)
});

export const openItems = pgTable("open_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  sourceMeetingId: varchar("source_meeting_id").references(() => meetings.id).notNull(),
  item: text("item").notNull(),
  owner: text("owner").notNull(),
  ballInCourt: text("ball_in_court").notNull(),
  targetClose: text("target_close"),
  status: openItemStatusEnum("status").notNull().default("Open"),
  notes: text("notes")
});

export const rfis = pgTable("rfis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  submittedDate: text("submitted_date"),
  responseDue: text("response_due"),
  status: text("status").notNull(),
  impact: text("impact"),
  owner: text("owner").notNull(),
  ballInCourt: text("ball_in_court").notNull(),
  notes: text("notes")
});

export const submittals = pgTable("submittals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  number: text("number").notNull(),
  title: text("title").notNull(),
  specSection: text("spec_section"),
  requiredDate: text("required_date"),
  submittedDate: text("submitted_date"),
  reviewStatus: text("review_status").notNull(),
  resubmittalNeededBool: boolean("resubmittal_needed_bool").notNull().default(false),
  owner: text("owner").notNull(),
  ballInCourt: text("ball_in_court").notNull()
});

export const fabrication = pgTable("fabrication", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  component: text("component").notNull(),
  vendor: text("vendor").notNull(),
  fabStart: text("fab_start"),
  fabFinish: text("fab_finish"),
  shipDate: text("ship_date"),
  needBy: text("need_by"),
  risks: text("risks"),
  owner: text("owner").notNull(),
  ballInCourt: text("ball_in_court").notNull()
});

export const distribution = pgTable("distribution", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  recipient: text("recipient").notNull(),
  email: text("email").notNull(),
  sentBool: boolean("sent_bool").notNull().default(false)
});

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").references(() => meetings.id).notNull(),
  type: fileTypeEnum("type").notNull(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  transcription: text("transcription"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  role: userRoleEnum("role").notNull().default("Standard")
});

// Schedule Management Tables
export const projectSchedules = pgTable("project_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  scheduleType: text("schedule_type").notNull(), // 'CPM' or '3_WEEK_LOOKAHEAD'
  version: integer("version").notNull().default(1),
  dataDate: text("data_date").notNull(),
  startDate: text("start_date").notNull(),
  finishDate: text("finish_date").notNull(),
  fileUrl: text("file_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

export const scheduleActivities = pgTable("schedule_activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").references(() => projectSchedules.id).notNull(),
  activityId: text("activity_id").notNull(),
  activityName: text("activity_name").notNull(),
  activityType: text("activity_type"),
  originalDuration: integer("original_duration"),
  remainingDuration: integer("remaining_duration"),
  startDate: text("start_date"),
  finishDate: text("finish_date"),
  totalFloat: integer("total_float"),
  status: text("status"), // 'Not Started', 'In Progress', 'Completed'
  predecessors: text("predecessors"),
  successors: text("successors"),
  notes: text("notes")
});

export const scheduleUpdates = pgTable("schedule_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").references(() => projectSchedules.id).notNull(),
  meetingId: varchar("meeting_id").references(() => meetings.id),
  updateType: text("update_type").notNull(), // 'AI_GENERATED', 'MANUAL', 'MEETING_DISCUSSION'
  updateDescription: text("update_description").notNull(),
  affectedActivities: text("affected_activities"), // JSON array of activity IDs
  oldValues: text("old_values"), // JSON of previous values
  newValues: text("new_values"), // JSON of new values
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Insert schemas
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true });
export const insertMeetingSchema = createInsertSchema(meetings).omit({ id: true, createdAt: true });
export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true });
export const insertAgendaItemSchema = createInsertSchema(agendaItems).omit({ id: true });
export const insertActionItemSchema = createInsertSchema(actionItems).omit({ id: true });
export const insertOpenItemSchema = createInsertSchema(openItems).omit({ id: true });
export const insertRfiSchema = createInsertSchema(rfis).omit({ id: true });
export const insertSubmittalSchema = createInsertSchema(submittals).omit({ id: true });
export const insertFabricationSchema = createInsertSchema(fabrication).omit({ id: true });
export const insertDistributionSchema = createInsertSchema(distribution).omit({ id: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProjectScheduleSchema = createInsertSchema(projectSchedules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScheduleActivitySchema = createInsertSchema(scheduleActivities).omit({ id: true });
export const insertScheduleUpdateSchema = createInsertSchema(scheduleUpdates).omit({ id: true, createdAt: true });

// Types
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Attendance = typeof attendance.$inferSelect;
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type AgendaItem = typeof agendaItems.$inferSelect;
export type InsertAgendaItem = z.infer<typeof insertAgendaItemSchema>;
export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type OpenItem = typeof openItems.$inferSelect;
export type InsertOpenItem = z.infer<typeof insertOpenItemSchema>;
export type Rfi = typeof rfis.$inferSelect;
export type InsertRfi = z.infer<typeof insertRfiSchema>;
export type Submittal = typeof submittals.$inferSelect;
export type InsertSubmittal = z.infer<typeof insertSubmittalSchema>;
export type Fabrication = typeof fabrication.$inferSelect;
export type InsertFabrication = z.infer<typeof insertFabricationSchema>;
export type Distribution = typeof distribution.$inferSelect;
export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ProjectSchedule = typeof projectSchedules.$inferSelect;
export type InsertProjectSchedule = z.infer<typeof insertProjectScheduleSchema>;
export type ScheduleActivity = typeof scheduleActivities.$inferSelect;
export type InsertScheduleActivity = z.infer<typeof insertScheduleActivitySchema>;
export type ScheduleUpdate = typeof scheduleUpdates.$inferSelect;
export type InsertScheduleUpdate = z.infer<typeof insertScheduleUpdateSchema>;
