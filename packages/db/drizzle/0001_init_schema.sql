DROP TABLE IF EXISTS "alerts";

--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('doctor', 'receptionist');

--> statement-breakpoint
CREATE TYPE "public"."schedule_rule_type" AS ENUM('recurring', 'one_time');

--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'awaiting_approval', 'cancelled');

--> statement-breakpoint
CREATE TYPE "public"."clinic_access_status" AS ENUM('active', 'revoked');

--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('pending', 'accepted', 'expired');

--> statement-breakpoint
CREATE TYPE "public"."cancellation_request_status" AS ENUM('pending', 'confirmed');

--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);

--> statement-breakpoint
CREATE TABLE "clinic_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"receptionist_id" uuid NOT NULL,
	"status" "clinic_access_status" DEFAULT 'active' NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"status" "invitation_status" DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "invitations_token_unique" UNIQUE("token")
);

--> statement-breakpoint
CREATE TABLE "schedule_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"type" "schedule_rule_type" NOT NULL,
	"day_of_week" integer,
	"specific_date" date,
	"slot_from" time NOT NULL,
	"slot_to" time NOT NULL,
	"slot_duration_min" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);

--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"schedule_rule_id" uuid NOT NULL,
	"appt_date" date NOT NULL,
	"appt_time" time NOT NULL,
	"patient_name" text NOT NULL,
	"note" text,
	"status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
	"cancelled_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "cancellation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"target_date" date NOT NULL,
	"appointment_id" uuid,
	"reason" text,
	"status" "cancellation_request_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
CREATE TABLE "delay_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"alert_date" date NOT NULL,
	"message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "clinic_access" ADD CONSTRAINT "clinic_access_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "clinic_access" ADD CONSTRAINT "clinic_access_receptionist_id_users_id_fk" FOREIGN KEY ("receptionist_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "schedule_rules" ADD CONSTRAINT "schedule_rules_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_schedule_rule_id_schedule_rules_id_fk" FOREIGN KEY ("schedule_rule_id") REFERENCES "public"."schedule_rules"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "delay_alerts" ADD CONSTRAINT "delay_alerts_doctor_id_users_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "delay_alerts" ADD CONSTRAINT "delay_alerts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;
