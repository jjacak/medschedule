import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  date,
  time,
  integer,
  boolean,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["doctor", "receptionist"]);

export const scheduleRuleTypeEnum = pgEnum("schedule_rule_type", [
  "recurring",
  "one_time",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "awaiting_approval",
  "cancelled",
]);

export const clinicAccessStatusEnum = pgEnum("clinic_access_status", [
  "active",
  "revoked",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "expired",
]);

export const cancellationRequestStatusEnum = pgEnum(
  "cancellation_request_status",
  ["pending", "confirmed"]
);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clinics = pgTable("clinics", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export const clinicAccess = pgTable("clinic_access", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id),
  receptionistId: uuid("receptionist_id")
    .notNull()
    .references(() => users.id),
  status: clinicAccessStatusEnum("status").notNull().default("active"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: invitationStatusEnum("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
});

export const scheduleRules = pgTable("schedule_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => users.id),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id),
  type: scheduleRuleTypeEnum("type").notNull(),
  // 0 = Sunday … 6 = Saturday; null when type = one_time
  dayOfWeek: integer("day_of_week"),
  // null when type = recurring
  specificDate: date("specific_date"),
  slotFrom: time("slot_from").notNull(),
  slotTo: time("slot_to").notNull(),
  slotDurationMin: integer("slot_duration_min").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => users.id),
  scheduleRuleId: uuid("schedule_rule_id")
    .notNull()
    .references(() => scheduleRules.id),
  apptDate: date("appt_date").notNull(),
  apptTime: time("appt_time").notNull(),
  patientName: text("patient_name").notNull(),
  note: text("note"),
  status: appointmentStatusEnum("status").notNull().default("scheduled"),
  cancelledBy: uuid("cancelled_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cancellationRequests = pgTable("cancellation_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => users.id),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id),
  targetDate: date("target_date").notNull(),
  // null = cały dzień
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  reason: text("reason"),
  status: cancellationRequestStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const delayAlerts = pgTable("delay_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  doctorId: uuid("doctor_id")
    .notNull()
    .references(() => users.id),
  clinicId: uuid("clinic_id")
    .notNull()
    .references(() => clinics.id),
  alertDate: date("alert_date").notNull(),
  message: text("message"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
