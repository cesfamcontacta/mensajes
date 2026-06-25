'use server'

import { db } from '@/db/db'
import * as schema from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Action to check if database is already seeded
export async function isDbSeeded() {
  const result = await db.select({ count: sql<number>`count(*)` }).from(schema.establishment)
  return result[0].count > 0
}

// Action to Seed Data
export async function seedData() {
  try {
    // Clear existing data in reverse dependency order
    await db.delete(schema.messageHistory)
    await db.delete(schema.appointment)
    await db.delete(schema.conversation)
    await db.delete(schema.medicalShift)
    await db.delete(schema.patient)
    await db.delete(schema.professional)
    await db.delete(schema.establishment)
    await db.delete(schema.campaignTemplate)
    await db.delete(schema.systemUser)

    // Seed default system user
    await db.insert(schema.systemUser).values({
      name: 'Claudio Alvarado Muñoz',
      email: 'claudio@cesfam.cl',
      role: 'admin',
      isActive: true,
    })

    // Seed default campaign templates
    const defaultTemplates = [
      {
        campaignType: 'mamografias',
        title: 'Mamografías',
        messageTemplate: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Mamografia el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      {
        campaignType: 'ecografia-mamaria',
        title: 'Ecografía Mamaria',
        messageTemplate: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Ecografia Mamaria el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      {
        campaignType: 'ecografia-abdominal',
        title: 'Ecografía Abdominal',
        messageTemplate: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Ecografia Abdominal el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nRecuerde asistir con 6 horas de ayuno.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      {
        campaignType: 'oftalmologia',
        title: 'Oftalmología',
        messageTemplate: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Oftalmologia el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      {
        campaignType: 'otorrino',
        title: 'Otorrino',
        messageTemplate: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Otorrino el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      }
    ];

    await db.insert(schema.campaignTemplate).values(defaultTemplates)


    // 1. Create Establishments
    const [cesfam] = await db.insert(schema.establishment).values({
      nombre: 'CESFAM Dr. Juan Carlos Baeza',
      tipo: 'cesfam',
      isActive: true,
    }).returning()

    const [cecosf] = await db.insert(schema.establishment).values({
      nombre: 'CECOSF Los Arrayanes',
      tipo: 'cecosf',
      parentId: cesfam.id,
      isActive: true,
    }).returning()

    const [posta] = await db.insert(schema.establishment).values({
      nombre: 'Posta Rural El Salto',
      tipo: 'posta',
      parentId: cesfam.id,
      isActive: true,
    }).returning()

    // 2. Create Professionals
    const [prof1] = await db.insert(schema.professional).values({
      rut: '12345678-5',
      surname: 'Pérez',
      givenName: 'María',
      displayName: 'Dra. María Pérez',
      fullName: 'María Teresa Pérez González',
      specialty: 'Medicina General',
      establecimientoOverrideId: cesfam.id,
    }).returning()

    const [prof2] = await db.insert(schema.professional).values({
      rut: '16000000-7',
      surname: 'Muñoz',
      givenName: 'Carlos',
      displayName: 'Dr. Carlos Muñoz',
      fullName: 'Carlos Andrés Muñoz Rojas',
      specialty: 'Pediatría',
      establecimientoOverrideId: cecosf.id,
    }).returning()

    const [prof3] = await db.insert(schema.professional).values({
      rut: '18000000-3',
      surname: 'Tapia',
      givenName: 'Ana',
      displayName: 'Matrona Ana Tapia',
      fullName: 'Ana Luisa Tapia Soto',
      specialty: 'Obstetricia y Ginecología',
      establecimientoOverrideId: posta.id,
    }).returning()

    try {
      revalidatePath('/')
    } catch (e) {
      // Ignore invariant error when run via standalone script
    }
    return { success: true }
  } catch (error) {
    console.error('Error seeding data:', error)
    return { success: false, error: String(error) }
  }
}

// Action to get dashboard analytics
export async function getDashboardStats() {
  try {
    const totalAppointments = await db.select({ count: sql<number>`count(*)` }).from(schema.appointment)
    const confirmedCount = await db.select({ count: sql<number>`count(*)` }).from(schema.appointment).where(eq(schema.appointment.status, 'confirmed'))
    const pendingCount = await db.select({ count: sql<number>`count(*)` }).from(schema.appointment).where(eq(schema.appointment.status, 'pending'))
    const cancelledCount = await db.select({ count: sql<number>`count(*)` }).from(schema.appointment).where(eq(schema.appointment.status, 'cancelled'))
    const sentCount = await db.select({ count: sql<number>`count(*)` }).from(schema.appointment).where(eq(schema.appointment.status, 'sent'))

    const total = totalAppointments[0]?.count || 0
    const confirmed = confirmedCount[0]?.count || 0
    const pending = pendingCount[0]?.count || 0
    const cancelled = cancelledCount[0]?.count || 0
    const sent = sentCount[0]?.count || 0

    const confirmationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0

    return {
      total,
      confirmed,
      pending,
      cancelled,
      sent,
      confirmationRate,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return { total: 0, confirmed: 0, pending: 0, cancelled: 0, sent: 0, confirmationRate: 0 }
  }
}

// Action to get appointments with detailed join
export async function getAppointments() {
  try {
    const appointmentsList = await db.select({
      id: schema.appointment.id,
      time: schema.appointment.time,
      status: schema.appointment.status,
      phone: schema.appointment.phone,
      service: schema.appointment.service,
      observations: schema.appointment.observations,
      sentAt: schema.appointment.sentAt,
      confirmedAt: schema.appointment.confirmedAt,
      patientName: schema.patient.displayName,
      patientRut: schema.patient.rut,
      professionalName: schema.professional.displayName,
      specialty: schema.professional.specialty,
      date: schema.medicalShift.date,
      establecimiento: schema.medicalShift.establecimiento,
      policlinico: schema.medicalShift.policlinico,
    })
    .from(schema.appointment)
    .innerJoin(schema.patient, eq(schema.appointment.patientId, schema.patient.id))
    .innerJoin(schema.medicalShift, eq(schema.appointment.shiftId, schema.medicalShift.id))
    .innerJoin(schema.professional, eq(schema.medicalShift.professionalId, schema.professional.id))
    .orderBy(schema.appointment.time)

    return appointmentsList
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return []
  }
}

// Action to get all conversations
export async function getConversations() {
  try {
    return await db.select().from(schema.conversation).orderBy(desc(schema.conversation.lastMessageAt))
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return []
  }
}

// Action to get messages for a conversation
export async function getConversationMessages(conversationId: string) {
  try {
    return await db.select()
      .from(schema.messageHistory)
      .where(eq(schema.messageHistory.conversationId, conversationId))
      .orderBy(schema.messageHistory.id) // incremental sequence or uuid order
  } catch (error) {
    console.error('Error fetching message history:', error)
    return []
  }
}

// Helper function to call the Meta WhatsApp Business Cloud API
async function callWhatsAppApi(to: string, payload: any) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneId) {
    console.log('[WhatsApp API Setup] Credentials not configured in .env.local. Operating in Simulation Mode.')
    return null
  }

  try {
    // Standardize phone number format for Chile (e.g. +56-9-3462-1210 -> 56934621210)
    const cleanPhone = to.replace(/[\s\-\+]/g, '').trim()
    const url = `https://graph.facebook.com/v22.0/${phoneId}/messages`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        ...payload,
      }),
    })

    const data = await response.json()
    console.log('[WhatsApp API Response]:', JSON.stringify(data, null, 2))
    return data
  } catch (error) {
    console.error('[WhatsApp API Request Error]:', error)
    return null
  }
}

// Action to simulate sending outbound WhatsApp message to a patient
export async function sendWhatsAppNotification(appointmentId: string) {
  try {
    // 1. Get Appointment details with professional and shift details
    const fullAppList = await db.select({
      id: schema.appointment.id,
      time: schema.appointment.time,
      status: schema.appointment.status,
      phone: schema.appointment.phone,
      service: schema.appointment.service,
      observations: schema.appointment.observations,
      patientName: schema.patient.displayName,
      patientRut: schema.patient.rut,
      patientId: schema.appointment.patientId,
      specialty: schema.professional.specialty,
      date: schema.medicalShift.date,
      establecimiento: schema.medicalShift.establecimiento,
      policlinico: schema.medicalShift.policlinico,
      patientPhone: schema.patient.primaryPhone,
    })
    .from(schema.appointment)
    .innerJoin(schema.patient, eq(schema.appointment.patientId, schema.patient.id))
    .innerJoin(schema.medicalShift, eq(schema.appointment.shiftId, schema.medicalShift.id))
    .innerJoin(schema.professional, eq(schema.medicalShift.professionalId, schema.professional.id))
    .where(eq(schema.appointment.id, appointmentId))
    .limit(1);

    const app = fullAppList[0];
    if (!app) return { success: false, error: 'Appointment not found' }

    // 2. Get or create conversation for patient
    let [conv] = await db.select().from(schema.conversation).where(eq(schema.conversation.patientId, app.patientId)).limit(1)
    if (!conv) {
      const [newConv] = await db.insert(schema.conversation).values({
        patientId: app.patientId,
        patientRut: app.patientRut,
        phone: app.phone || app.patientPhone || '+56999999999',
        patientName: app.patientName,
        unreadCount: 0,
      }).returning()
      conv = newConv
    }

    // Determine custom template message if it is a campaign/operative
    let campaignType: string | null = null;
    const serviceLower = (app.service || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const specialtyLower = (app.specialty || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const combined = `${serviceLower} ${specialtyLower}`;

    if (combined.includes('ecografia mamaria') || combined.includes('eco mamaria')) {
      campaignType = 'ecografia-mamaria';
    } else if (combined.includes('ecografia abdominal') || combined.includes('eco abdominal')) {
      campaignType = 'ecografia-abdominal';
    } else if (combined.includes('mamografia')) {
      campaignType = 'mamografias';
    } else if (combined.includes('oftalmologia') || combined.includes('oftalmologo') || combined.includes('uapo') || combined.includes('vicios de refraccion')) {
      campaignType = 'oftalmologia';
    } else if (combined.includes('otorrino') || combined.includes('otorrinolaringologia') || combined.includes('uaporrino')) {
      campaignType = 'otorrino';
    }

    let messageContent = `Hola ${app.patientName}, confirmamos su cita para el servicio de ${app.service} a las ${app.time}. Responda SI para confirmar o NO para cancelar.`;

    if (campaignType) {
      const templateObj = await getCampaignTemplate(campaignType);
      if (templateObj) {
        let formattedDate = app.date || '';
        if (formattedDate.includes('-')) {
          const parts = formattedDate.split('-');
          if (parts.length === 3 && parts[0].length === 4) {
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
        // Extract only the first name and convert to Title Case
        const firstNameRaw = (app.patientName || '').trim().split(' ')[0] || '';
        const firstName = firstNameRaw.charAt(0).toUpperCase() + firstNameRaw.slice(1).toLowerCase();

        messageContent = templateObj.messageTemplate
          .replace(/\{\{nombre\}\}/g, firstName)
          .replace(/\{\{fecha\}\}/g, formattedDate)
          .replace(/\{\{hora\}\}/g, (app.time || '').slice(0, 5))
          .replace(/\{\{establecimiento\}\}/g, app.establecimiento || '')
          .replace(/\{\{box\}\}/g, app.policlinico || '')
          .replace(/\{\{servicio\}\}/g, app.service || '')
          .replace(/\{\{rut\}\}/g, app.patientRut || '')
          .replace(/\{\{telefono\}\}/g, app.phone || app.patientPhone || '');
      }
    }

    // 3. Insert into message history
    const [msg] = await db.insert(schema.messageHistory).values({
      conversationId: conv.id,
      appointmentId: app.id,
      phone: conv.phone,
      direction: 'outbound',
      messageType: 'template',
      status: 'sent',
      content: messageContent,
      templateName: campaignType ? `operative_${campaignType}` : 'appointment_confirmation',
    }).returning()

    // 4. Update appointment status
    await db.update(schema.appointment).set({
      status: 'sent',
      sentAt: new Date(),
      lastMessageStatus: 'sent',
    }).where(eq(schema.appointment.id, appointmentId))

    // 5. Update conversation last message preview
    await db.update(schema.conversation).set({
      lastMessageAt: new Date(),
      lastMessagePreview: `Notificación enviada: ${app.service}`,
    }).where(eq(schema.conversation.id, conv.id))

    // 6. Make the real WhatsApp Cloud API Call using our approved Meta Template
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      let formattedDate = app.date || '';
      if (formattedDate.includes('-')) {
        const parts = formattedDate.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Extract first name and title case
      const firstNameRaw = (app.patientName || '').trim().split(' ')[0] || '';
      const firstName = firstNameRaw.charAt(0).toUpperCase() + firstNameRaw.slice(1).toLowerCase();
      
      const campaignName = campaignType === 'mamografias' ? 'Mamografías' : 
                           campaignType === 'ecografia-mamaria' ? 'Ecografía Mamaria' :
                           campaignType === 'ecografia-abdominal' ? 'Ecografía Abdominal' :
                           campaignType === 'oftalmologia' ? 'Oftalmología' :
                           campaignType === 'otorrino' ? 'Otorrino' : (app.service || 'Operativo Médico');

      // The observations/indicaciones variables mapping
      const observationsText = app.observations || 'Favor presentarse 15 minutos antes.';

      const payload = {
        type: 'template',
        template: {
          name: 'reminder_operative_v2',
          language: {
            code: 'es' // Spanish
          },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: firstName },              // {{1}}
                { type: 'text', text: campaignName },           // {{2}}
                { type: 'text', text: formattedDate },          // {{3}}
                { type: 'text', text: (app.time || '').slice(0, 5) }, // {{4}}
                { type: 'text', text: app.establecimiento || 'CESFAM' }  // {{5}}
              ]
            }
          ]
        }
      }
      
      callWhatsAppApi(conv.phone, payload)
    }

    revalidatePath('/')
    return { success: true, message: msg }
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error)
    return { success: false, error: String(error) }
  }
}

// Action to simulate receiving an inbound WhatsApp message from a patient
export async function simulatePatientResponse(conversationId: string, text: string) {
  try {
    const [conv] = await db.select().from(schema.conversation).where(eq(schema.conversation.id, conversationId)).limit(1)
    if (!conv) return { success: false, error: 'Conversation not found' }

    // Insert message history
    await db.insert(schema.messageHistory).values({
      conversationId: conv.id,
      phone: conv.phone,
      direction: 'inbound',
      messageType: 'text',
      status: 'received',
      content: text,
    })

    // Process intent
    const cleanText = text.toLowerCase().trim()
    const isConfirm = cleanText === 'si' || cleanText === 'sí' || cleanText.includes('confirmo') || cleanText.includes('confirmar') || cleanText.includes('asistire') || cleanText.includes('asistiré')
    const isCancel = cleanText === 'no' || cleanText.includes('cancelo') || cleanText.includes('cancelar') || cleanText.includes('no asistire') || cleanText.includes('no asistiré')

    // Find the latest 'sent' appointment for this patient
    const [latestAppointment] = await db.select()
      .from(schema.appointment)
      .where(eq(schema.appointment.patientId, conv.patientId || ''))
      .orderBy(desc(schema.appointment.time)) // or order by sentAt
      .limit(1)

    if (latestAppointment) {
      if (isConfirm) {
        await db.update(schema.appointment).set({
          status: 'confirmed',
          confirmedAt: new Date(),
          confirmedBy: 'patient_whatsapp',
        }).where(eq(schema.appointment.id, latestAppointment.id))
      } else if (isCancel) {
        await db.update(schema.appointment).set({
          status: 'cancelled',
          cancelledAt: new Date(),
        }).where(eq(schema.appointment.id, latestAppointment.id))
      }
    }

    // Update conversation
    await db.update(schema.conversation).set({
      lastMessageAt: new Date(),
      lastMessagePreview: text,
      unreadCount: conv.unreadCount + 1,
    }).where(eq(schema.conversation.id, conv.id))

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error simulating patient response:', error)
    return { success: false, error: String(error) }
  }
}

// Action to clear conversation unread count
export async function markConversationAsRead(conversationId: string) {
  try {
    await db.update(schema.conversation).set({
      unreadCount: 0,
    }).where(eq(schema.conversation.id, conversationId))
    return { success: true }
  } catch (error) {
    console.error('Error marking conversation as read:', error)
    return { success: false, error: String(error) }
  }
}

// Action to import parsed appointments from Excel
export async function importAppointmentsFromExcel(rows: any[], overrideCampaignType?: string) {
  try {
    for (const row of rows) {
      // Find keys case-insensitively and remove accents
      const getVal = (possibleKeys: string[]) => {
        for (const k of Object.keys(row)) {
          const normalizedKey = k.toLowerCase().trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (possibleKeys.includes(normalizedKey)) {
            return row[k];
          }
        }
        return undefined;
      };

      const rutPaciente = String(getVal(['rut paciente', 'rut', 'rut_paciente', 'paciente_rut', 'rut_pac', 'rut pac']) || '').trim();
      const nombrePaciente = String(getVal(['nombre paciente', 'nombre', 'paciente', 'nombre_paciente', 'nom_pac', 'nombre pac', 'nombre y apellidos', 'nombre y apellido']) || '').trim();
      let telefono = String(getVal(['telefono', 'celular', 'phone', 'contacto', 'tel']) || '').trim();
      const edadStr = getVal(['edad', 'age', 'edad_paciente']);
      let rawFecha = String(getVal(['fecha cita', 'fecha', 'fecha_cita', 'date', 'fec_cita', 'fecha_atencion']) || '').trim();
      let rawHora = String(getVal(['hora cita', 'hora', 'hora_cita', 'time', 'hor_cita', 'hora_atencion']) || '').trim();
      const profesionalNombre = String(getVal(['profesional', 'medico', 'médico', 'nombre profesional', 'nombre medico', 'professional', 'doctor', 'prof']) || '').trim();
      const especialidad = String(getVal(['especialidad', 'specialty', 'esp']) || '').trim();
      const servicio = String(getVal(['servicio', 'service', 'srv']) || '').trim();
      const establecimientoNombre = String(getVal(['establecimiento', 'centro', 'establishment', 'cesfam', 'lugar', 'est']) || '').trim();
      const box = String(getVal(['box', 'policlinico', 'policlínico', 'box/policlinico', 'box_atencion']) || '').trim();
      const observaciones = String(getVal(['observaciones', 'observacion', 'observations', 'notas', 'obs']) || '').trim();

      // Clean date/time if combined or containing spaces
      if (rawFecha.includes(' ')) {
        const parts = rawFecha.split(' ');
        rawFecha = parts[0];
        if (!rawHora) {
          rawHora = parts[1];
        }
      }
      if (rawHora.includes(' ')) {
        const parts = rawHora.split(' ');
        if (parts[0].includes('-') || parts[0].includes('/')) {
          rawHora = parts[1];
        } else {
          rawHora = parts[0];
        }
      }

      if (!rutPaciente || !nombrePaciente || !rawFecha || !rawHora) {
        continue; // Skip invalid rows
      }

      let mappedService = servicio || 'Atención General';
      let mappedSpecialty = especialidad || 'Medicina General';
      
      if (overrideCampaignType) {
        const campaignTitles: Record<string, string> = {
          'mamografias': 'Mamografías',
          'ecografia-mamaria': 'Ecografía Mamaria',
          'ecografia-abdominal': 'Ecografía Abdominal',
          'oftalmologia': 'Oftalmología',
          'otorrino': 'Otorrino'
        };
        mappedService = campaignTitles[overrideCampaignType] || overrideCampaignType;
        mappedSpecialty = campaignTitles[overrideCampaignType] || overrideCampaignType;
      }

      // Format telephone (e.g. +569xxxxxxx)
      if (telefono && !telefono.startsWith('+')) {
        const cleanPhone = telefono.replace(/\D/g, '');
        if (cleanPhone.length === 9) {
          telefono = `+56${cleanPhone}`;
        } else if (cleanPhone.length === 8) {
          telefono = `+569${cleanPhone}`;
        } else if (cleanPhone.length > 9) {
          // If already has country code but no '+' sign, e.g. 569xxxxxxx
          if (cleanPhone.startsWith('56')) {
            telefono = `+${cleanPhone}`;
          }
        }
      }

      // 1. Get or Create Establishment
      const estName = establecimientoNombre || 'CESFAM Dr. Juan Carlos Baeza';
      const estList = await db.select().from(schema.establishment)
        .where(sql`lower(${schema.establishment.nombre}) = lower(${estName})`).limit(1);
      let est = estList[0];
      if (!est) {
        const [newEst] = await db.insert(schema.establishment).values({
          nombre: estName,
          tipo: 'cesfam',
          isActive: true,
        }).returning();
        est = newEst;
      }

      // 2. Get or Create Professional
      const profName = profesionalNombre || 'Médico General';
      const profList = await db.select().from(schema.professional)
        .where(sql`lower(${schema.professional.fullName}) = lower(${profName})`).limit(1);
      let prof = profList[0];
      if (!prof) {
        const dummyRut = `PROF-${Math.floor(1000000 + Math.random() * 9000000)}-${Math.floor(Math.random() * 10)}`;
        const names = profName.split(' ');
        const surname = names.slice(1).join(' ') || 'General';
        const givenName = names[0] || 'Médico';
        const [newProf] = await db.insert(schema.professional).values({
          rut: dummyRut,
          surname,
          givenName,
          displayName: profName,
          fullName: profName,
          specialty: mappedSpecialty,
          establecimientoOverrideId: est.id,
        }).returning();
        prof = newProf;
      }

      // 3. Get or Create Patient
      const patList = await db.select().from(schema.patient)
        .where(eq(schema.patient.rut, rutPaciente)).limit(1);
      let pat = patList[0];
      const namesPat = nombrePaciente.split(' ');
      const surnamePat = namesPat.slice(1).join(' ') || 'Paciente';
      const givenNamePat = namesPat[0] || 'Paciente';
      const parsedAge = edadStr ? parseInt(String(edadStr), 10) : null;
      if (!pat) {
        const [newPat] = await db.insert(schema.patient).values({
          rut: rutPaciente,
          surname: surnamePat,
          givenName: givenNamePat,
          displayName: nombrePaciente,
          fullName: nombrePaciente,
          primaryPhone: telefono || null,
          age: parsedAge,
        }).returning();
        pat = newPat;
      } else {
        // Update phone and age if they are newer/provided
        await db.update(schema.patient).set({
          primaryPhone: telefono || pat.primaryPhone,
          age: parsedAge || pat.age,
        }).where(eq(schema.patient.id, pat.id));
      }

      // 4. Create or Find Shift
      // Normalize Date to YYYY-MM-DD
      let normalizedDate = rawFecha;
      if (rawFecha.includes('-') || rawFecha.includes('/')) {
        const separator = rawFecha.includes('-') ? '-' : '/';
        const parts = rawFecha.split(separator);
        if (parts.length === 3) {
          let y = parts[2];
          let m = parts[1];
          let d = parts[0];
          
          if (parts[0].length === 4) {
            y = parts[0];
            m = parts[1];
            d = parts[2];
          } else {
            if (y.length === 2) {
              y = `20${y}`;
            }
            // Smart swap for MM-DD-YY vs DD-MM-YY formats
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            if (p0 > 12) {
              // DD-MM-YY
              d = parts[0];
              m = parts[1];
            } else if (p1 > 12) {
              // MM-DD-YY
              d = parts[1];
              m = parts[0];
            }
          }
          normalizedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }

      const shiftList = await db.select().from(schema.medicalShift)
        .where(sql`${schema.medicalShift.professionalId} = ${prof.id}::uuid AND ${schema.medicalShift.date} = ${normalizedDate}`).limit(1);
      let shift = shiftList[0];
      if (!shift) {
        const [newShift] = await db.insert(schema.medicalShift).values({
          professionalId: prof.id,
          date: normalizedDate,
          policlinico: box || 'Sector General',
          establecimiento: est.nombre,
          totalPatients: 10,
          totalScheduled: 0, // Will be incremented on appointment insertion if new
        }).returning();
        shift = newShift;
      }

      // 5. Create or Update Appointment
      // Normalize Time format: HH:MM:SS or HH:MM
      let normalizedTime = rawHora;
      if (rawHora.length === 5) {
        normalizedTime = `${rawHora}:00`;
      } else if (rawHora.length > 8) {
        normalizedTime = rawHora.substring(0, 8);
      }

      // Check if appointment already exists for this patient, shift, and time
      const existingAppList = await db.select().from(schema.appointment)
        .where(
          sql`${schema.appointment.patientId} = ${pat.id}::uuid AND ${schema.appointment.shiftId} = ${shift.id}::uuid AND ${schema.appointment.time} = ${normalizedTime}`
        ).limit(1);

      const existingApp = existingAppList[0];

      if (existingApp) {
        // If it exists, we update the details (phone, service, observations) but preserve status & do not increment totalScheduled
        await db.update(schema.appointment).set({
          phone: telefono || existingApp.phone,
          service: mappedService || existingApp.service,
          observations: observaciones || existingApp.observations,
        }).where(eq(schema.appointment.id, existingApp.id));
      } else {
        // If it doesn't exist, we insert it
        await db.insert(schema.appointment).values({
          shiftId: shift.id,
          patientId: pat.id,
          patientRut: pat.rut,
          patientName: pat.displayName,
          time: normalizedTime,
          phone: telefono || null,
          service: mappedService,
          status: 'pending',
          observations: observaciones || null,
        });

        // Increment totalScheduled on the shift since it's a new appointment
        await db.update(schema.medicalShift).set({
          totalScheduled: (shift.totalScheduled || 0) + 1
        }).where(eq(schema.medicalShift.id, shift.id));
      }

      // 6. Create Conversation if doesn't exist
      const convList = await db.select().from(schema.conversation)
        .where(eq(schema.conversation.patientId, pat.id)).limit(1);
      if (convList.length === 0) {
        await db.insert(schema.conversation).values({
          patientId: pat.id,
          patientRut: pat.rut,
          phone: telefono || '+56999999999',
          patientName: pat.displayName,
          unreadCount: 0,
          lastMessagePreview: 'Cita importada desde Excel',
        });
      }
    }
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Error importing from excel:', error);
    return { success: false, error: String(error) };
  }
}

// Campaign templates retrieval/fallback
export async function getCampaignTemplate(campaignType: string) {
  try {
    const list = await db.select().from(schema.campaignTemplate)
      .where(eq(schema.campaignTemplate.campaignType, campaignType)).limit(1);
    
    if (list.length > 0) {
      return list[0];
    }
    
    // Fallback/Default template
    const defaultTemplates: Record<string, { title: string, template: string }> = {
      'mamografias': {
        title: 'Mamografías',
        template: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Mamografia el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      'ecografia-mamaria': {
        title: 'Ecografía Mamaria',
        template: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Ecografia Mamaria el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      'ecografia-abdominal': {
        title: 'Ecografía Abdominal',
        template: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Ecografia Abdominal el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nRecuerde asistir con 6 horas de ayuno.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      'oftalmologia': {
        title: 'Oftalmología',
        template: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Oftalmologia el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      },
      'otorrino': {
        title: 'Otorrino',
        template: 'Hola {{nombre}}, le recordamos que tiene agendada su hora para el Operativo de Otorrino el dia {{fecha}} a las {{hora}} hrs en {{establecimiento}}.\n\nFavor responder SI para confirmar o NO si no puede asistir.'
      }
    };
    
    const def = defaultTemplates[campaignType] || {
      title: campaignType.toUpperCase(),
      template: 'Hola {{nombre}}, le recordamos su cita de {{servicio}} para el día {{fecha}} a las {{hora}} hrs en {{establecimiento}} ({{box}}). Responda SI para confirmar o NO.'
    };
    
    const [inserted] = await db.insert(schema.campaignTemplate).values({
      campaignType,
      title: def.title,
      messageTemplate: def.template
    }).returning();
    
    return inserted;
  } catch (error) {
    console.error('Error fetching campaign template:', error);
    return null;
  }
}

// Campaign templates updates
export async function saveCampaignTemplate(campaignType: string, templateText: string) {
  try {
    const list = await db.select().from(schema.campaignTemplate)
      .where(eq(schema.campaignTemplate.campaignType, campaignType)).limit(1);
    
    if (list.length > 0) {
      await db.update(schema.campaignTemplate)
        .set({ messageTemplate: templateText })
        .where(eq(schema.campaignTemplate.campaignType, campaignType));
    } else {
      const titles: Record<string, string> = {
        'mamografias': 'Mamografías',
        'ecografia-mamaria': 'Ecografía Mamaria',
        'ecografia-abdominal': 'Ecografía Abdominal',
        'oftalmologia': 'Oftalmología',
        'otorrino': 'Otorrino'
      };
      await db.insert(schema.campaignTemplate).values({
        campaignType,
        title: titles[campaignType] || campaignType.toUpperCase(),
        messageTemplate: templateText
      });
    }
    revalidatePath(`/operativos/${campaignType}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving campaign template:', error);
    return { success: false, error: String(error) };
  }
}

// Get appointments matching a specific campaign filter
export async function getAppointmentsByCampaign(campaignType: string) {
  try {
    const appointmentsList = await getAppointments();
    
    return appointmentsList.filter(app => {
      const serviceLower = (app.service || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const specialtyLower = (app.specialty || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const combined = `${serviceLower} ${specialtyLower}`;
      
      switch (campaignType) {
        case 'mamografias':
          return combined.includes('mamografia');
        case 'ecografia-mamaria':
          return combined.includes('ecografia mamaria') || combined.includes('eco mamaria');
        case 'ecografia-abdominal':
          return combined.includes('ecografia abdominal') || combined.includes('eco abdominal');
        case 'oftalmologia':
          return combined.includes('oftalmologia') || combined.includes('oftalmologo') || combined.includes('uapo') || combined.includes('vicios de refraccion');
        case 'otorrino':
          return combined.includes('otorrino') || combined.includes('otorrinolaringologia') || combined.includes('uaporrino');
        default: {
          const cleanCampaignType = campaignType.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-/g, ' ');
          const words = cleanCampaignType.split(' ').filter(w => w.length > 2);
          if (words.length > 0) {
            return words.some(word => combined.includes(word));
          }
          return combined.includes(cleanCampaignType);
        }
      }
    });
  } catch (error) {
    console.error('Error fetching campaign appointments:', error);
    return [];
  }
}

// 9. System Users CRUD actions
export async function getSystemUsers() {
  try {
    const users = await db.select().from(schema.systemUser).orderBy(schema.systemUser.name);
    return users;
  } catch (error) {
    console.error('Error getting system users:', error);
    return [];
  }
}

export async function createSystemUser(name: string, email: string, role: string = 'admin', password?: string) {
  try {
    const [user] = await db.insert(schema.systemUser).values({
      name,
      email,
      role,
      password: password || 'Futrono2026',
      isActive: true,
    }).returning();
    revalidatePath('/settings');
    return { success: true, user };
  } catch (error) {
    console.error('Error creating system user:', error);
    return { success: false, error: String(error) };
  }
}

export async function updateSystemUser(id: string, name: string, email: string, role: string, password?: string) {
  try {
    const updates: any = { name, email, role };
    if (password && password.trim()) {
      updates.password = password;
    }
    await db.update(schema.systemUser).set(updates).where(eq(schema.systemUser.id, id));
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error updating system user:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteSystemUser(id: string) {
  try {
    await db.delete(schema.systemUser).where(eq(schema.systemUser.id, id));
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error deleting system user:', error);
    return { success: false, error: String(error) };
  }
}

// Dynamic campaigns CRUD actions
export async function getAllCampaignTemplates() {
  try {
    const list = await db.select().from(schema.campaignTemplate).orderBy(schema.campaignTemplate.title);
    return list;
  } catch (error) {
    console.error('Error getting campaign templates:', error);
    return [];
  }
}

export async function createCampaign(title: string, campaignType: string, messageTemplate: string) {
  try {
    const [campaign] = await db.insert(schema.campaignTemplate).values({
      title,
      campaignType,
      messageTemplate,
    }).returning();
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true, campaign };
  } catch (error) {
    console.error('Error creating campaign template:', error);
    return { success: false, error: String(error) };
  }
}

export async function deleteCampaign(id: string) {
  try {
    await db.delete(schema.campaignTemplate).where(eq(schema.campaignTemplate.id, id));
    revalidatePath('/');
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('Error deleting campaign template:', error);
    return { success: false, error: String(error) };
  }
}

export async function getOrCreateConversationForPatient(patientRut: string) {
  try {
    let [conv] = await db.select().from(schema.conversation).where(eq(schema.conversation.patientRut, patientRut)).limit(1)
    if (!conv) {
      const [patientData] = await db.select().from(schema.patient).where(eq(schema.patient.rut, patientRut)).limit(1)
      if (!patientData) {
        return { success: false, error: 'Patient not found' }
      }
      
      const [appData] = await db.select().from(schema.appointment).where(eq(schema.appointment.patientId, patientData.id)).limit(1)
      
      const [newConv] = await db.insert(schema.conversation).values({
        patientId: patientData.id,
        patientRut: patientData.rut,
        phone: appData?.phone || patientData.primaryPhone || '+56999999999',
        patientName: patientData.displayName,
        unreadCount: 0,
      }).returning()
      conv = newConv
    }
    return { success: true, conversation: conv }
  } catch (error) {
    console.error('Error in getOrCreateConversationForPatient:', error)
    return { success: false, error: String(error) }
  }
}

export async function sendOutboundMessage(conversationId: string, text: string) {
  try {
    const [conv] = await db.select().from(schema.conversation).where(eq(schema.conversation.id, conversationId)).limit(1)
    if (!conv) return { success: false, error: 'Conversation not found' }

    await db.insert(schema.messageHistory).values({
      conversationId: conv.id,
      phone: conv.phone,
      direction: 'outbound',
      messageType: 'text',
      status: 'sent',
      content: text,
    })

    await db.update(schema.conversation).set({
      lastMessagePreview: text,
      lastMessageAt: new Date(),
    }).where(eq(schema.conversation.id, conversationId))

    // Call WhatsApp API for manual outbound text message replies (requires session window open)
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      const payload = {
        type: 'text',
        text: {
          body: text
        }
      }
      callWhatsAppApi(conv.phone, payload)
    }

    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Error sending outbound message:', error)
    return { success: false, error: String(error) }
  }
}

export async function deleteAppointmentsByDateAndCampaign(campaignType: string, dateStr: string) {
  try {
    const campaignApps = await getAppointmentsByCampaign(campaignType)
    const appsToDelete = campaignApps.filter(app => (app.date || 'Sin Fecha') === dateStr)
    
    for (const app of appsToDelete) {
      await db.delete(schema.messageHistory).where(eq(schema.messageHistory.appointmentId, app.id))
      await db.delete(schema.appointment).where(eq(schema.appointment.id, app.id))
    }
    
    revalidatePath('/')
    return { success: true, count: appsToDelete.length }
  } catch (error) {
    console.error('Error deleting appointments by date and campaign:', error)
    return { success: false, error: String(error) }
  }
}

// System user authentication actions
export async function loginAction(email: string, passwordInput: string) {
  try {
    const users = await db.select()
      .from(schema.systemUser)
      .where(eq(schema.systemUser.email, email))
      .limit(1)

    const user = users[0]
    if (!user || !user.isActive) {
      return { success: false, error: 'Usuario no encontrado o inactivo.' }
    }

    if (user.password !== passwordInput) {
      return { success: false, error: 'Contraseña incorrecta.' }
    }

    const cookieStore = await cookies()
    cookieStore.set('session', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })

    return { success: true }
  } catch (error) {
    console.error('Error during login:', error)
    return { success: false, error: 'Error interno en el servidor.' }
  }
}

export async function logoutAction() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('session')
  } catch (error) {
    console.error('Error during logout:', error)
  }
  redirect('/login')
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('session')?.value
    if (!userId) return null

    const users = await db.select()
      .from(schema.systemUser)
      .where(eq(schema.systemUser.id, userId))
      .limit(1)

    return users[0] || null
  } catch (error) {
    console.error('Error retrieving current user:', error)
    return null
  }
}


