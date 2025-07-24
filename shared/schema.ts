import { pgTable, text, serial, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  experience: text("experience").notNull(),
  previousJobs: text("previous_jobs"),
  trainingAvailable: text("training_available").notNull(),
  startDate: text("start_date").notNull(),
  hoursPerWeek: text("hours_per_week").notNull(),
  workspaceSpace: text("workspace_space").notNull(),
  workspaceDescription: text("workspace_description"),
  idFrontFilename: text("id_front_filename"),
  idBackFilename: text("id_back_filename"),
  trainingAgreement: text("training_agreement").notNull(),
  workspaceAgreement: text("workspace_agreement").notNull(),
  reliabilityAgreement: text("reliability_agreement").notNull(),
  privacyAgreement: text("privacy_agreement").notNull(),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  submittedAt: true,
}).extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  address: z.string().min(10, "Please enter your complete address"),
  experience: z.string().min(1, "Please select your experience level"),
  trainingAvailable: z.string().min(1, "Please select your training availability"),
  startDate: z.string().min(1, "Please select your preferred start date"),
  hoursPerWeek: z.string().min(1, "Please select your availability"),
  workspaceSpace: z.string().min(1, "Please confirm your workspace availability"),
  trainingAgreement: z.literal("true", { errorMap: () => ({ message: "You must agree to the training commitment" }) }),
  workspaceAgreement: z.literal("true", { errorMap: () => ({ message: "You must confirm your workspace requirements" }) }),
  reliabilityAgreement: z.literal("true", { errorMap: () => ({ message: "You must agree to the reliability commitment" }) }),
  privacyAgreement: z.literal("true", { errorMap: () => ({ message: "You must agree to the privacy policy" }) }),
});

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
