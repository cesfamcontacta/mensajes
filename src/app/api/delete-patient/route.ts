import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import * as schema from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rut = searchParams.get('rut')

  if (!rut) {
    return NextResponse.json({ error: 'RUT parameter is required' }, { status: 400 })
  }

  try {
    console.log('Production: Searching and deleting patient with RUT:', rut)

    const patients = await db.select().from(schema.patient).where(eq(schema.patient.rut, rut))

    if (patients.length === 0) {
      return NextResponse.json({ success: false, message: 'Patient not found' })
    }

    for (const patient of patients) {
      // 1. Delete message history
      const conversations = await db.select().from(schema.conversation).where(eq(schema.conversation.patientId, patient.id))
      for (const conv of conversations) {
        await db.delete(schema.messageHistory).where(eq(schema.messageHistory.conversationId, conv.id))
      }
      // 2. Delete conversations
      await db.delete(schema.conversation).where(eq(schema.conversation.patientId, patient.id))
      // 3. Delete appointments
      await db.delete(schema.appointment).where(eq(schema.appointment.patientId, patient.id))
      // 4. Delete patient
      await db.delete(schema.patient).where(eq(schema.patient.id, patient.id))
    }

    return NextResponse.json({ success: true, message: `Deleted patient with RUT ${rut} and all related records.` })
  } catch (error) {
    console.error('Error deleting patient in production:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 })
  }
}
