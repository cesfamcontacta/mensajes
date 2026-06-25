import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/db'
import * as schema from '@/db/schema'
import { eq, desc, or } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

// Verification endpoint for Meta (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Read verification token from environment variables
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'cesfam_contacta_verify_token_2026'

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Webhook Verification]: Verification successful!')
      return new NextResponse(challenge, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    } else {
      console.warn('[Webhook Verification]: Token mismatch or incorrect mode.')
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  return new NextResponse('Bad Request', { status: 400 })
}

// Event receiver endpoint for Meta (POST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Webhook Event Received]:', JSON.stringify(body, null, 2))

    // Verify it is a WhatsApp event
    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ error: 'Not a WhatsApp Business Account object' }, { status: 404 })
    }

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value) {
      return NextResponse.json({ success: true, message: 'No value payload to process' })
    }

    // 1. Process Status Updates (Sent, Delivered, Read, Failed)
    if (value.statuses && value.statuses.length > 0) {
      for (const statusObj of value.statuses) {
        const wabaMessageId = statusObj.id
        const messageStatus = statusObj.status // 'sent', 'delivered', 'read', 'failed'
        
        console.log(`[Webhook Status Update]: Message ID ${wabaMessageId} is now ${messageStatus}`)

        // Update in database (message history)
        const [updatedMsg] = await db
          .update(schema.messageHistory)
          .set({ status: messageStatus })
          .where(eq(schema.messageHistory.wabaMessageId, wabaMessageId))
          .returning()

        // Also update the parent appointment if applicable
        if (updatedMsg && updatedMsg.appointmentId) {
          await db
            .update(schema.appointment)
            .set({ lastMessageStatus: messageStatus })
            .where(eq(schema.appointment.id, updatedMsg.appointmentId))
        }
      }
    }

    // 2. Process Inbound Messages (Received from Patient)
    if (value.messages && value.messages.length > 0) {
      for (const msg of value.messages) {
        const phone = msg.from // e.g., '569XXXXXXXX'
        const wabaMessageId = msg.id
        
        // Extract message content
        let messageText = ''
        let messageType = msg.type || 'text'

        if (msg.type === 'text' && msg.text?.body) {
          messageText = msg.text.body
        } else if (msg.type === 'button' && msg.button?.text) {
          messageText = msg.button.text
          messageType = 'button_reply'
        } else if (msg.type === 'interactive' && msg.interactive?.button_reply?.title) {
          messageText = msg.interactive.button_reply.title
          messageType = 'button_reply'
        } else {
          messageText = `[Received message of type: ${msg.type}]`
        }

        console.log(`[Webhook Message Inbound]: From ${phone} (Type: ${messageType}): "${messageText}"`)

        // Find or create conversation for this phone/patient (with or without '+')
        const phoneWithPlus = phone.startsWith('+') ? phone : `+${phone}`
        const phoneWithoutPlus = phone.replace('+', '')

        let [conv] = await db
          .select()
          .from(schema.conversation)
          .where(
            or(
              eq(schema.conversation.phone, phoneWithPlus),
              eq(schema.conversation.phone, phoneWithoutPlus)
            )
          )
          .limit(1)

        if (!conv) {
          // Attempt to find patient by phone number format (with or without '+')
          let [patientObj] = await db
            .select()
            .from(schema.patient)
            .where(
              or(
                eq(schema.patient.primaryPhone, phoneWithPlus),
                eq(schema.patient.primaryPhone, phoneWithoutPlus)
              )
            )
            .limit(1)

          if (!patientObj) {
            // Find by partial phone or create anonymous patient if not found
            // For now, let's create a stub patient if we don't have one
            const stubRut = `TEMP-${phoneWithoutPlus}`
            const [newPatient] = await db
              .insert(schema.patient)
              .values({
                rut: stubRut,
                surname: 'Paciente',
                givenName: 'Nuevo',
                displayName: 'Nuevo Paciente',
                fullName: 'Nuevo Paciente',
                primaryPhone: phoneWithoutPlus,
              })
              .returning()
            patientObj = newPatient
          }

          const [newConv] = await db
            .insert(schema.conversation)
            .values({
              patientId: patientObj.id,
              patientRut: patientObj.rut,
              phone: patientObj.primaryPhone || phone,
              patientName: patientObj.fullName,
              unreadCount: 0,
            })
            .returning()
          
          conv = newConv
        }

        // Insert to Message History
        await db.insert(schema.messageHistory).values({
          conversationId: conv.id,
          wabaMessageId: wabaMessageId,
          phone: phone,
          direction: 'inbound',
          messageType: messageType,
          status: 'received',
          content: messageText,
        })

        // Process confirmation/cancellation intent
        const cleanText = messageText.toLowerCase().trim()
        const isConfirm = cleanText === 'si' || cleanText === 'sí' || cleanText === '1' || /^1[\s\.,]/.test(cleanText) || cleanText.includes('confirmo') || cleanText.includes('confirmar') || cleanText.includes('asistire') || cleanText.includes('asistiré')
        const isCancel = cleanText === 'no' || cleanText === '2' || /^2[\s\.,]/.test(cleanText) || cleanText.includes('cancelo') || cleanText.includes('cancelar') || cleanText.includes('no asistire') || cleanText.includes('no asistiré')

        // Find the latest appointment for this patient
        const [latestAppointment] = await db
          .select()
          .from(schema.appointment)
          .where(eq(schema.appointment.patientId, conv.patientId || ''))
          .orderBy(desc(schema.appointment.time))
          .limit(1)

        if (latestAppointment) {
          if (isConfirm) {
            await db
              .update(schema.appointment)
              .set({
                status: 'confirmed',
                confirmedAt: new Date(),
                confirmedBy: 'patient_whatsapp',
              })
              .where(eq(schema.appointment.id, latestAppointment.id))
          } else if (isCancel) {
            await db
              .update(schema.appointment)
              .set({
                status: 'cancelled',
                cancelledAt: new Date(),
              })
              .where(eq(schema.appointment.id, latestAppointment.id))
          }
        }

        // Update Conversation Summary
        await db
          .update(schema.conversation)
          .set({
            lastMessageAt: new Date(),
            lastMessagePreview: messageText,
            unreadCount: conv.unreadCount + 1,
          })
          .where(eq(schema.conversation.id, conv.id))
      }
    }

    // Trigger UI updates in Next.js
    revalidatePath('/')
    revalidatePath('/chat')
    revalidatePath('/appointments')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Webhook Error]:', error)
    return NextResponse.json({ error: 'Internal Server Error', details: String(error) }, { status: 500 })
  }
}
