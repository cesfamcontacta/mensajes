import { db } from './src/db/db'
import * as schema from './src/db/schema'
import { eq } from 'drizzle-orm'

async function run() {
  const rut = '16200950-8'
  console.log(`Buscando paciente con RUT: ${rut}...`)
  
  const patientsList = await db.select().from(schema.patient).where(eq(schema.patient.rut, rut))
  const patientObj = patientsList[0]
  
  if (!patientObj) {
    console.log(`No se encontró paciente con RUT ${rut}`)
    return
  }

  console.log(`Paciente encontrado: ${patientObj.displayName} (ID: ${patientObj.id})`)

  // Delete message history associated with this patient's appointments
  const appointmentsList = await db.select().from(schema.appointment).where(eq(schema.appointment.patientId, patientObj.id))
  for (const app of appointmentsList) {
    console.log(`Borrando historial de mensajes para la cita ID: ${app.id}`)
    await db.delete(schema.messageHistory).where(eq(schema.messageHistory.appointmentId, app.id))
  }

  // Delete message history that might just be associated with the conversation
  const convsList = await db.select().from(schema.conversation).where(eq(schema.conversation.patientId, patientObj.id))
  for (const conv of convsList) {
    console.log(`Borrando historial de mensajes para la conversación ID: ${conv.id}`)
    await db.delete(schema.messageHistory).where(eq(schema.messageHistory.conversationId, conv.id))
  }

  // Delete conversations
  console.log(`Borrando conversaciones...`)
  await db.delete(schema.conversation).where(eq(schema.conversation.patientId, patientObj.id))

  // Delete appointments
  console.log(`Borrando citas...`)
  await db.delete(schema.appointment).where(eq(schema.appointment.patientId, patientObj.id))

  // Delete patient
  console.log(`Borrando registro de paciente...`)
  await db.delete(schema.patient).where(eq(schema.patient.id, patientObj.id))

  // Also clean medical shifts count for mamografias
  console.log(`Buscando jornadas médicas...`)
  const shifts = await db.select().from(schema.medicalShift)
  for (const sh of shifts) {
    await db.update(schema.medicalShift).set({ totalScheduled: 0 }).where(eq(schema.medicalShift.id, sh.id))
  }

  console.log('¡Proceso completado con éxito! Todos los registros del paciente y sus citas han sido eliminados.')
}

run().catch(err => {
  console.error('Error running script:', err)
})
