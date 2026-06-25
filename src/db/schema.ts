import { pgTable, uuid, text, boolean, integer, date, time, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// 1. Catálogo de Establecimientos
export const establishment = pgTable('establishment', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: text('nombre').notNull(),
  tipo: text('tipo', { enum: ['cesfam', 'cecosf', 'posta', 'junaeb', 'clinica'] }).notNull(),
  parentId: uuid('parent_id'),
  isActive: boolean('is_active').default(true).notNull(),
  pdfName: text('pdf_name'),
})

// Autoreferencia para establecimiento
export const establishmentRelations = relations(establishment, ({ one, many }) => ({
  parent: one(establishment, {
    fields: [establishment.parentId],
    references: [establishment.id],
    relationName: 'establishment_parent',
  }),
  children: many(establishment, {
    relationName: 'establishment_parent',
  }),
}))

// 2. Catálogo de Profesionales
export const professional = pgTable('professional', {
  id: uuid('id').defaultRandom().primaryKey(),
  rut: text('rut').unique().notNull(),
  surname: text('surname').notNull(),
  givenName: text('given_name').notNull(),
  displayName: text('display_name').notNull(),
  fullName: text('full_name').notNull(),
  specialty: text('specialty'),
  isActive: boolean('is_active').default(true).notNull(),
  establecimientoOverrideId: uuid('establecimiento_override_id').references(() => establishment.id),
})

export const professionalRelations = relations(professional, ({ one }) => ({
  establecimientoOverride: one(establishment, {
    fields: [professional.establecimientoOverrideId],
    references: [establishment.id],
  }),
}))

// 3. Catálogo de Pacientes
export const patient = pgTable('patient', {
  id: uuid('id').defaultRandom().primaryKey(),
  rut: text('rut').unique().notNull(),
  surname: text('surname').notNull(),
  givenName: text('given_name').notNull(),
  displayName: text('display_name').notNull(),
  fullName: text('full_name').notNull(),
  primaryPhone: text('primary_phone'),
  socialName: text('social_name'),
  age: integer('age'),
  recordNumber: text('record_number'),
  folderNumber: text('folder_number'),
  cta: text('cta'),
  localObservations: text('local_observations'),
  firstSeen: timestamp('first_seen', { withTimezone: true }).defaultNow().notNull(),
})

// 4. Turnos Médicos (Medical Shift)
export const medicalShift = pgTable('medical_shift', {
  id: uuid('id').defaultRandom().primaryKey(),
  professionalId: uuid('professional_id').notNull().references(() => professional.id),
  specialtyId: uuid('specialty_id'),
  date: date('date').notNull(),
  policlinico: text('policlinico'),
  establecimiento: text('establecimiento'),
  totalPatients: integer('total_patients'),
  totalScheduled: integer('total_scheduled'),
  isLocked: boolean('is_locked').default(false).notNull(),
})

export const medicalShiftRelations = relations(medicalShift, ({ one }) => ({
  professional: one(professional, {
    fields: [medicalShift.professionalId],
    references: [professional.id],
  }),
}))

// 5. Citas Médicas (Appointment)
export const appointment = pgTable('appointment', {
  id: uuid('id').defaultRandom().primaryKey(),
  shiftId: uuid('shift_id').notNull().references(() => medicalShift.id),
  patientId: uuid('patient_id').notNull().references(() => patient.id),
  rescheduledFromId: uuid('rescheduled_from_id'),
  patientRut: text('patient_rut').notNull(),
  patientName: text('patient_name').notNull(),
  time: time('time').notNull(),
  phone: text('phone'),
  service: text('service'),
  status: text('status', { enum: ['pending', 'sent', 'confirmed', 'cancelled', 'rescheduled', 'waiting_reschedule', 'blocked'] }).default('pending').notNull(),
  observations: text('observations'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  confirmedBy: text('confirmed_by'), // patient_whatsapp, admin_web, etc.
  blockageDate: text('blockage_date'),
  pdfGeneratedAt: timestamp('pdf_generated_at', { withTimezone: true }),
  lastMessageStatus: text('last_message_status'), // sent, delivered, read, failed, etc.
})

export const appointmentRelations = relations(appointment, ({ one }) => ({
  shift: one(medicalShift, {
    fields: [appointment.shiftId],
    references: [medicalShift.id],
  }),
  patient: one(patient, {
    fields: [appointment.patientId],
    references: [patient.id],
  }),
}))

// 6. Conversación por Paciente
export const conversation = pgTable('conversation', {
  id: uuid('id').defaultRandom().primaryKey(),
  patientId: uuid('patient_id').references(() => patient.id),
  patientRut: text('patient_rut').unique().notNull(),
  phone: text('phone').notNull(),
  patientName: text('patient_name').notNull(),
  unreadCount: integer('unread_count').default(0).notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }).defaultNow().notNull(),
  lastMessagePreview: text('last_message_preview'),
  priority: text('priority', { enum: ['normal', 'high', 'urgent'] }).default('normal').notNull(),
})

export const conversationRelations = relations(conversation, ({ one }) => ({
  patient: one(patient, {
    fields: [conversation.patientId],
    references: [patient.id],
  }),
}))

// 7. Historial de Mensajes de WhatsApp
export const messageHistory = pgTable('message_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversation.id),
  appointmentId: uuid('appointment_id').references(() => appointment.id),
  wabaMessageId: text('waba_message_id').unique(),
  phone: text('phone').notNull(),
  direction: text('direction', { enum: ['outbound', 'inbound'] }).notNull(),
  messageType: text('message_type').notNull(), // template, button_reply, text, audio, etc.
  status: text('status').notNull(), // sent, delivered, read, failed, received
  content: text('content'),
  templateName: text('template_name'),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  pricingType: text('pricing_type'), // utility, marketing, service
})

export const messageHistoryRelations = relations(messageHistory, ({ one }) => ({
  conversation: one(conversation, {
    fields: [messageHistory.conversationId],
    references: [conversation.id],
  }),
  appointment: one(appointment, {
    fields: [messageHistory.appointmentId],
    references: [appointment.id],
  }),
}))

// 8. Plantillas de Mensajes por Campaña/Operativo
export const campaignTemplate = pgTable('campaign_template', {
  id: uuid('id').defaultRandom().primaryKey(),
  campaignType: text('campaign_type').unique().notNull(), // mamografias, ecografia-mamaria, etc.
  title: text('title').notNull(),
  messageTemplate: text('message_template').notNull(),
})

// 9. Usuarios del sistema
export const systemUser = pgTable('system_user', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  password: text('password').default('Futrono2026').notNull(),
  role: text('role').default('admin').notNull(), // admin, operator
  isActive: boolean('is_active').default(true).notNull(),
})


