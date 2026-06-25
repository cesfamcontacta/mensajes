CREATE TABLE "appointment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"rescheduled_from_id" uuid,
	"patient_rut" text NOT NULL,
	"patient_name" text NOT NULL,
	"time" time NOT NULL,
	"phone" text,
	"service" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"observations" text,
	"sent_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"confirmed_by" text,
	"blockage_date" text,
	"pdf_generated_at" timestamp with time zone,
	"last_message_status" text
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"patient_rut" text NOT NULL,
	"phone" text NOT NULL,
	"patient_name" text NOT NULL,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_message_preview" text,
	"priority" text DEFAULT 'normal' NOT NULL,
	CONSTRAINT "conversation_patient_rut_unique" UNIQUE("patient_rut")
);
--> statement-breakpoint
CREATE TABLE "establishment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text NOT NULL,
	"parent_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"pdf_name" text
);
--> statement-breakpoint
CREATE TABLE "medical_shift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"professional_id" uuid NOT NULL,
	"specialty_id" uuid,
	"date" date NOT NULL,
	"policlinico" text,
	"establecimiento" text,
	"total_patients" integer,
	"total_scheduled" integer,
	"is_locked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"appointment_id" uuid,
	"waba_message_id" text,
	"phone" text NOT NULL,
	"direction" text NOT NULL,
	"message_type" text NOT NULL,
	"status" text NOT NULL,
	"content" text,
	"template_name" text,
	"error_code" text,
	"error_message" text,
	"pricing_type" text,
	CONSTRAINT "message_history_waba_message_id_unique" UNIQUE("waba_message_id")
);
--> statement-breakpoint
CREATE TABLE "patient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rut" text NOT NULL,
	"surname" text NOT NULL,
	"given_name" text NOT NULL,
	"display_name" text NOT NULL,
	"full_name" text NOT NULL,
	"primary_phone" text,
	"social_name" text,
	"age" integer,
	"record_number" text,
	"folder_number" text,
	"cta" text,
	"local_observations" text,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_rut_unique" UNIQUE("rut")
);
--> statement-breakpoint
CREATE TABLE "professional" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rut" text NOT NULL,
	"surname" text NOT NULL,
	"given_name" text NOT NULL,
	"display_name" text NOT NULL,
	"full_name" text NOT NULL,
	"specialty" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"establecimiento_override_id" uuid,
	CONSTRAINT "professional_rut_unique" UNIQUE("rut")
);
--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_shift_id_medical_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."medical_shift"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_patient_id_patient_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patient"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_shift" ADD CONSTRAINT "medical_shift_professional_id_professional_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professional"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_history" ADD CONSTRAINT "message_history_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "professional" ADD CONSTRAINT "professional_establecimiento_override_id_establishment_id_fk" FOREIGN KEY ("establecimiento_override_id") REFERENCES "public"."establishment"("id") ON DELETE no action ON UPDATE no action;