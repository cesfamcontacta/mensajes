'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  saveCampaignTemplate, 
  sendWhatsAppNotification,
  getAppointmentsByCampaign,
  getOrCreateConversationForPatient,
  getConversationMessages,
  sendOutboundMessage,
  simulatePatientResponse,
  deleteAppointmentsByDateAndCampaign
} from '../../actions'
import { FileText, Save, Check, Play, Send, Calendar, Clock, Stethoscope, User, AlertCircle, RefreshCw, Settings, ChevronDown, ChevronUp, X } from 'lucide-react'

const themeConfig: Record<string, {
  primaryBg: string;
  primaryHoverBg: string;
  primaryText: string;
  shadow: string;
  badgeBg: string;
  lightBg: string;
  lightBorder: string;
  lightText: string;
  focusRing: string;
  dotBg: string;
}> = {
  'mamografias': {
    primaryBg: 'bg-pink-600',
    primaryHoverBg: 'hover:bg-pink-500',
    primaryText: 'text-pink-600 dark:text-pink-400',
    shadow: 'shadow-pink-600/10 hover:shadow-pink-600/20',
    badgeBg: 'bg-pink-500',
    lightBg: 'bg-pink-50 dark:bg-pink-950/20',
    lightBorder: 'border-pink-200/50 dark:border-pink-900/30',
    lightText: 'text-pink-700 dark:text-pink-400',
    focusRing: 'focus:ring-pink-500/50',
    dotBg: 'bg-pink-500'
  },
  'ecografia-mamaria': {
    primaryBg: 'bg-purple-600',
    primaryHoverBg: 'hover:bg-purple-500',
    primaryText: 'text-purple-600 dark:text-purple-400',
    shadow: 'shadow-purple-600/10 hover:shadow-purple-600/20',
    badgeBg: 'bg-purple-500',
    lightBg: 'bg-purple-50 dark:bg-purple-950/20',
    lightBorder: 'border-purple-200/50 dark:border-purple-900/30',
    lightText: 'text-purple-700 dark:text-purple-400',
    focusRing: 'focus:ring-purple-500/50',
    dotBg: 'bg-purple-500'
  },
  'ecografia-abdominal': {
    primaryBg: 'bg-blue-600',
    primaryHoverBg: 'hover:bg-blue-500',
    primaryText: 'text-blue-600 dark:text-blue-400',
    shadow: 'shadow-blue-600/10 hover:shadow-blue-600/20',
    badgeBg: 'bg-blue-500',
    lightBg: 'bg-blue-50 dark:bg-blue-950/20',
    lightBorder: 'border-blue-200/50 dark:border-blue-900/30',
    lightText: 'text-blue-700 dark:text-blue-400',
    focusRing: 'focus:ring-blue-500/50',
    dotBg: 'bg-blue-500'
  },
  'oftalmologia': {
    primaryBg: 'bg-teal-600',
    primaryHoverBg: 'hover:bg-teal-500',
    primaryText: 'text-teal-600 dark:text-teal-400',
    shadow: 'shadow-teal-600/10 hover:shadow-teal-600/20',
    badgeBg: 'bg-teal-500',
    lightBg: 'bg-teal-50 dark:bg-teal-950/20',
    lightBorder: 'border-teal-200/50 dark:border-teal-900/30',
    lightText: 'text-teal-700 dark:text-teal-400',
    focusRing: 'focus:ring-teal-500/50',
    dotBg: 'bg-teal-500'
  },
  'otorrino': {
    primaryBg: 'bg-amber-600',
    primaryHoverBg: 'hover:bg-amber-500',
    primaryText: 'text-amber-600 dark:text-amber-400',
    shadow: 'shadow-amber-600/10 hover:shadow-amber-600/20',
    badgeBg: 'bg-amber-500',
    lightBg: 'bg-amber-50 dark:bg-amber-950/20',
    lightBorder: 'border-amber-200/50 dark:border-amber-900/30',
    lightText: 'text-amber-700 dark:text-amber-400',
    focusRing: 'focus:ring-amber-500/50',
    dotBg: 'bg-amber-500'
  }
}

function toTitleCase(str: string) {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface Appointment {
  id: string
  time: string
  status: string
  phone: string | null
  service: string | null
  observations: string | null
  sentAt: Date | null
  confirmedAt: Date | null
  patientName: string
  patientRut: string
  professionalName: string
  specialty: string | null
  date: string
  establecimiento: string | null
  policlinico: string | null
}

interface CampaignClientViewProps {
  campaignType: string
  campaignTitle: string
  initialTemplate: string
  initialAppointments: Appointment[]
}

export default function CampaignClientView({ 
  campaignType, 
  campaignTitle, 
  initialTemplate, 
  initialAppointments 
}: CampaignClientViewProps) {
  const [template, setTemplate] = useState(initialTemplate)
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments)
  const theme = themeConfig[campaignType] || {
    primaryBg: 'bg-emerald-600',
    primaryHoverBg: 'hover:bg-emerald-500',
    primaryText: 'text-emerald-600 dark:text-emerald-400',
    shadow: 'shadow-emerald-600/10 hover:shadow-emerald-600/20',
    badgeBg: 'bg-emerald-500',
    lightBg: 'bg-emerald-50 dark:bg-emerald-950/20',
    lightBorder: 'border-emerald-200/50 dark:border-emerald-900/30',
    lightText: 'text-emerald-700 dark:text-emerald-400',
    focusRing: 'focus:ring-emerald-500/50',
    dotBg: 'bg-emerald-500'
  }
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendingAll, setSendingAll] = useState(false)
  
  // Group-by-date state
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({})
  const [sendingDate, setSendingDate] = useState<string | null>(null)
  const [deletingDate, setDeletingDate] = useState<string | null>(null)

  const toggleDateCollapse = (dateStr: string) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }))
  }

  // WhatsApp Dialog state & handlers
  const [activeChatPatient, setActiveChatPatient] = useState<{ rut: string; name: string; phone: string } | null>(null)
  const [conversation, setConversation] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessageText, setNewMessageText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  const refreshAppointments = async () => {
    try {
      const updated = await getAppointmentsByCampaign(campaignType)
      setAppointments(updated)
    } catch (e) {
      console.error('Error refreshing appointments:', e)
    }
  }

  const loadChat = async (rut: string) => {
    setLoadingMessages(true)
    try {
      const res = await getOrCreateConversationForPatient(rut)
      if (res.success && res.conversation) {
        setConversation(res.conversation)
        const msgs = await getConversationMessages(res.conversation.id)
        setMessages(msgs)
      } else {
        console.error("Could not load/create conversation", res.error)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (activeChatPatient) {
      loadChat(activeChatPatient.rut)
    } else {
      setConversation(null)
      setMessages([])
    }
  }, [activeChatPatient])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessageText.trim() || !conversation) return
    setSendingMessage(true)
    try {
      const res = await sendOutboundMessage(conversation.id, newMessageText.trim())
      if (res.success) {
        setNewMessageText('')
        const msgs = await getConversationMessages(conversation.id)
        setMessages(msgs)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleSimulateResponse = async (text: string) => {
    if (!conversation) return
    setSendingMessage(true)
    try {
      const res = await simulatePatientResponse(conversation.id, text)
      if (res.success) {
        const msgs = await getConversationMessages(conversation.id)
        setMessages(msgs)
        // Refresh appointments list on simulate to update status icon dynamically
        await refreshAppointments()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSendingMessage(false)
    }
  }


  const handleSaveTemplate = async () => {
    setSavingTemplate(true)
    try {
      const res = await saveCampaignTemplate(campaignType, template)
      if (res.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      } else {
        alert('Error al guardar la plantilla')
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleSendNotification = async (appointmentId: string) => {
    setSendingId(appointmentId)
    try {
      const res = await sendWhatsAppNotification(appointmentId)
      if (res.success) {
        // Update local appointment status to 'sent'
        setAppointments(prev => prev.map(app => 
          app.id === appointmentId ? { ...app, status: 'sent', sentAt: new Date() } : app
        ))
      } else {
        alert(res.error || 'Error al enviar la alerta')
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    } finally {
      setSendingId(null)
    }
  }

  const handleSendAll = async () => {
    const pendingApps = appointments.filter(app => app.status === 'pending')
    if (pendingApps.length === 0) {
      alert('No hay citas pendientes para enviar.')
      return
    }
    
    if (!confirm(`¿Estás seguro de que deseas enviar las alertas de WhatsApp a los ${pendingApps.length} pacientes pendientes?`)) {
      return
    }

    setSendingAll(true)
    try {
      for (const app of pendingApps) {
        await sendWhatsAppNotification(app.id)
        setAppointments(prev => prev.map(a => 
          a.id === app.id ? { ...a, status: 'sent', sentAt: new Date() } : a
        ))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSendingAll(false)
    }
  }

  const handleSendAllForDate = async (dateStr: string) => {
    const dateApps = appointments.filter(app => (app.date || 'Sin Fecha') === dateStr)
    const pendingApps = dateApps.filter(app => app.status === 'pending')
    if (pendingApps.length === 0) {
      alert('No hay citas pendientes para enviar en esta fecha.')
      return
    }
    
    if (!confirm(`¿Estás seguro de que deseas enviar las alertas de WhatsApp a los ${pendingApps.length} pacientes pendientes para el día ${formatReadableDate(dateStr)}?`)) {
      return
    }

    setSendingDate(dateStr)
    try {
      for (const app of pendingApps) {
        await sendWhatsAppNotification(app.id)
        setAppointments(prev => prev.map(a => 
          a.id === app.id ? { ...a, status: 'sent', sentAt: new Date() } : a
        ))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSendingDate(null)
    }
  }

  const handleDeleteAllForDate = async (dateStr: string) => {
    const dateApps = appointments.filter(app => (app.date || 'Sin Fecha') === dateStr)
    if (!confirm(`¿Estás seguro de que deseas ELIMINAR COMPLETAMENTE las ${dateApps.length} citas agendadas para el día ${formatReadableDate(dateStr)}? Esta acción no se puede deshacer.`)) {
      return
    }

    setDeletingDate(dateStr)
    try {
      const res = await deleteAppointmentsByDateAndCampaign(campaignType, dateStr)
      if (res.success) {
        setAppointments(prev => prev.filter(app => (app.date || 'Sin Fecha') !== dateStr))
      } else {
        alert(res.error || 'Error al eliminar las citas')
      }
    } catch (err) {
      console.error(err)
      alert('Error de conexión')
    } finally {
      setDeletingDate(null)
    }
  }

  const formatReadableDate = (dateStr: string) => {
    if (dateStr === 'Sin Fecha') return dateStr
    try {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }
        const formatted = d.toLocaleDateString('es-ES', options)
        return formatted.charAt(0).toUpperCase() + formatted.slice(1)
      }
      return dateStr
    } catch (e) {
      return dateStr
    }
  }

  // Group appointments by date
  const groupedAppointments = appointments.reduce((groups, app) => {
    const dateStr = app.date || 'Sin Fecha'
    if (!groups[dateStr]) {
      groups[dateStr] = []
    }
    groups[dateStr].push(app)
    return groups
  }, {} as Record<string, Appointment[]>)

  // Sort dates chronologically
  const sortedDates = Object.keys(groupedAppointments).sort((a, b) => {
    if (a === 'Sin Fecha') return 1
    if (b === 'Sin Fecha') return -1
    return new Date(a).getTime() - new Date(b).getTime()
  })


  // Get preview based on the first appointment, or placeholder if none
  const sampleApp = appointments[0] || {
    patientName: '[Nombre Paciente]',
    date: '[Fecha Cita]',
    time: '[Hora Cita]',
    establecimiento: '[Establecimiento]',
    policlinico: '[Box/Policlínico]',
    service: '[Servicio]',
    patientRut: '[RUT]',
    phone: '[Teléfono]'
  }

  const getPreviewText = () => {
    return template
      .replace(/\{\{nombre\}\}/g, sampleApp.patientName || '')
      .replace(/\{\{fecha\}\}/g, sampleApp.date || '')
      .replace(/\{\{hora\}\}/g, (sampleApp.time || '').slice(0, 5))
      .replace(/\{\{establecimiento\}\}/g, sampleApp.establecimiento || '')
      .replace(/\{\{box\}\}/g, sampleApp.policlinico || '')
      .replace(/\{\{servicio\}\}/g, sampleApp.service || '')
      .replace(/\{\{rut\}\}/g, sampleApp.patientRut || '')
      .replace(/\{\{telefono\}\}/g, sampleApp.phone || '')
  }

  return (
    <div className="space-y-8">


      {/* Lower Row: Citas del Operativo */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800/50 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white">Citas del Operativo</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mt-0.5">Se encontraron {appointments.length} citas en este filtro.</p>
          </div>
          
          {appointments.some(app => app.status === 'pending') && (
            <button
              onClick={handleSendAll}
              disabled={sendingAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold rounded-xl transition-all shadow-md shadow-blue-600/10 hover:shadow-blue-600/20 cursor-pointer"
            >
              {sendingAll ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Enviando...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Enviar todos
                </>
              )}
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
          {appointments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-zinc-500">
              <AlertCircle className="h-12 w-12 mx-auto text-slate-400 mb-4 opacity-50" />
              <p className="font-medium">No hay citas para {campaignTitle} en este momento.</p>
              <p className="text-sm mt-1 text-slate-400">Prueba importando un archivo Excel con pacientes en esta especialidad.</p>
            </div>
          ) : (
            sortedDates.map((dateStr) => {
              const dateApps = groupedAppointments[dateStr] || []
              const total = dateApps.length
              const sentTotal = dateApps.filter(a => a.status !== 'pending').length
              const confirmedTotal = dateApps.filter(a => a.status === 'confirmed').length
              const cancelledTotal = dateApps.filter(a => a.status === 'cancelled').length
              const pendingDelivery = dateApps.filter(a => a.status === 'pending').length
              const pendingReply = dateApps.filter(a => a.status === 'sent').length
              const isCollapsed = collapsedDates[dateStr] ?? false

              return (
                <div key={dateStr} className="border-b border-slate-100 dark:border-zinc-800/50 last:border-b-0">
                  {/* Date Header Accordion Trigger */}
                  <div 
                    onClick={() => toggleDateCollapse(dateStr)}
                    className="w-full px-6 py-4 bg-slate-50/50 dark:bg-zinc-900/30 hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition-all flex items-center justify-between flex-wrap gap-6 cursor-pointer select-none"
                  >
                    <div className="flex-1 flex items-center gap-3 min-w-0">
                      {isCollapsed ? (
                        <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                      )}
                      
                      {/* 5-Column Grid */}
                      <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                        {/* Col 1: Fecha (col-span-4) */}
                        <div className="col-span-4 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                            Fecha
                          </span>
                          <h3 className="font-bold text-slate-900 dark:text-white text-xs">
                            {formatReadableDate(dateStr)}
                          </h3>
                        </div>

                        {/* Col 2: Confirmados (col-span-2) */}
                        <div className="col-span-2 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                            Confirmados
                          </span>
                          <div className={`flex items-center gap-1 text-xs font-semibold ${theme.primaryText}`}>
                            <Check className={`h-3.5 w-3.5 ${theme.primaryText} stroke-[3.5px] shrink-0`} />
                            <span>{confirmedTotal}</span>
                          </div>
                        </div>

                        {/* Col 3: Cancelados (col-span-2) */}
                        <div className="col-span-2 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">
                            Cancelados
                          </span>
                          <div className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                            <X className="h-3.5 w-3.5 text-red-500 stroke-[3.5px] shrink-0" />
                            <span>{cancelledTotal}</span>
                          </div>
                        </div>

                        {/* Col 4: Pendientes de respuesta (col-span-2) */}
                        <div className="col-span-2 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block whitespace-nowrap">
                            Pendiente respuesta
                          </span>
                          <div className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-500">
                            <X className="h-3.5 w-3.5 text-amber-500 stroke-[3.5px] shrink-0" />
                            <span>{pendingReply}</span>
                          </div>
                        </div>

                        {/* Col 5: Pendientes de entrega (col-span-2) */}
                        <div className="col-span-2 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block whitespace-nowrap">
                            Pendiente entrega
                          </span>
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-905 dark:text-zinc-300">
                            <X className="h-3.5 w-3.5 text-slate-950 dark:text-zinc-500 stroke-[3.5px] shrink-0" />
                            <span>{pendingDelivery}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                      {/* Day Action */}
                      {pendingDelivery > 0 && (
                        <button
                          onClick={() => handleSendAllForDate(dateStr)}
                          disabled={sendingDate !== null || sendingAll || deletingDate !== null}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                        >
                          {sendingDate === dateStr ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" /> Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="h-2.5 w-2.5" /> Enviar día
                            </>
                          )}
                        </button>
                      )}

                      {/* Delete Day Action */}
                      <button
                        onClick={() => handleDeleteAllForDate(dateStr)}
                        disabled={deletingDate !== null || sendingDate !== null || sendingAll}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-[10px] font-bold rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {deletingDate === dateStr ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" /> Eliminando...
                          </>
                        ) : (
                          <>
                            <X className="h-2.5 w-2.5 stroke-[3px]" /> Eliminar día
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Patient List container */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto border-t border-slate-100 dark:border-zinc-800/40">
                      <div className="min-w-[950px] divide-y divide-slate-100 dark:divide-zinc-800/40">
                        {/* Header Row */}
                        <div className="px-5 py-3 bg-slate-50/50 dark:bg-zinc-800/5 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex flex-row items-center gap-4 pl-14 select-none">
                          <div className="w-64 md:w-72 lg:w-80 shrink-0">Paciente</div>
                          <div className="w-28 shrink-0 text-center">RUT</div>
                          <div className="w-24 shrink-0 flex items-center gap-1.5 justify-center">Hora</div>
                          <div className="w-44 md:w-48 shrink-0">Teléfono</div>
                          <div className="w-40 md:w-44 shrink-0">Estado</div>
                          <div className="w-10 shrink-0 text-center">Chat</div>
                        </div>

                        {dateApps.map((app) => (
                          <div key={app.id} className="py-2.5 px-5 hover:bg-slate-50/30 dark:hover:bg-zinc-800/10 transition-all flex flex-row items-center gap-4 pl-14 text-sm text-slate-700 dark:text-zinc-300">
                            <span className="w-64 md:w-72 lg:w-80 shrink-0 font-bold text-slate-900 dark:text-white truncate">{toTitleCase(app.patientName)}</span>
                            
                            <span className="w-28 shrink-0 text-xs text-slate-500 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono text-center">{app.patientRut}</span>
                            
                            <span className="w-24 shrink-0 flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400 justify-center">
                              <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              {app.time.slice(0, 5)} hrs
                            </span>
                            
                            <span className="w-44 md:w-48 shrink-0 flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400">
                              <strong>Teléfono:</strong> {app.phone || 'Sin número'}
                            </span>
                            
                            <div className="w-40 md:w-44 shrink-0 flex items-center">
                              {app.phone ? (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  app.status === 'confirmed' 
                                    ? `text-slate-800 ${theme.lightBg} ${theme.lightBorder} ${theme.lightText}`
                                    : app.status === 'cancelled'
                                    ? 'text-red-700 bg-red-50 border-red-200/50 dark:text-red-400 dark:bg-red-950/20 dark:border-red-900/30'
                                    : app.status === 'sent'
                                    ? 'text-amber-700 bg-amber-50 border-amber-200/50 dark:text-amber-400 dark:bg-amber-950/20 dark:border-amber-900/30'
                                    : 'text-slate-700 bg-slate-100 border-slate-200/50 dark:text-zinc-300 dark:bg-zinc-800 dark:border-zinc-700/30'
                                }`}>
                                  {app.status === 'confirmed' ? (
                                    <>
                                      <Check className={`h-3.5 w-3.5 ${theme.primaryText} stroke-[3.5px] shrink-0`} />
                                      <span>Confirmado</span>
                                    </>
                                  ) : app.status === 'cancelled' ? (
                                    <>
                                      <X className="h-3.5 w-3.5 text-red-500 stroke-[3.5px] shrink-0" />
                                      <span>Cancelado</span>
                                    </>
                                  ) : app.status === 'sent' ? (
                                    <>
                                      <X className="h-3.5 w-3.5 text-amber-500 stroke-[3.5px] shrink-0" />
                                      <span>Pendiente respuesta</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="h-3.5 w-3.5 text-slate-950 dark:text-zinc-500 stroke-[3.5px] shrink-0" />
                                      <span>Pendiente entrega</span>
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-zinc-600 italic">No disponible</span>
                              )}
                            </div>
                            
                            <div className="w-10 shrink-0 flex items-center justify-center">
                              {app.phone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveChatPatient({ rut: app.patientRut, name: app.patientName, phone: app.phone! });
                                  }}
                                  className="inline-flex items-center justify-center p-1 rounded-full text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all cursor-pointer hover:scale-110"
                                  title="Ver chat de WhatsApp"
                                >
                                  <svg className="h-4.5 w-4.5 text-emerald-500 shrink-0" style={{ fill: 'currentColor' }} viewBox="0 0 24 24">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.062 5.248 5.308 0 11.785 0c3.148.002 6.107 1.227 8.328 3.45a11.661 11.661 0 0 1 3.447 8.328c-.004 6.539-5.25 11.787-11.725 11.787-2.007-.001-3.978-.515-5.733-1.498L0 24zM6.463 19.348c1.661.985 3.29 1.479 5.318 1.48 5.326 0 9.66-4.329 9.663-9.66.002-2.585-1.005-5.016-2.836-6.848C16.776 3.488 14.346 2.48 11.782 2.48c-5.33 0-9.666 4.33-9.668 9.663-.001 2.093.556 4.122 1.616 5.923l-.978 3.57 3.668-.962zm10.74-5.263c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.669.149-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* WhatsApp Chat Dialog Modal */}
      {activeChatPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 w-full max-w-lg h-[600px] rounded-3xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200/60 dark:border-zinc-800/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${theme.dotBg} animate-pulse`}></span>
                  {toTitleCase(activeChatPatient.name)}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">
                  Teléfono: {activeChatPatient.phone} | RUT: {activeChatPatient.rut}
                </p>
              </div>
              <button 
                onClick={() => {
                  setActiveChatPatient(null);
                  refreshAppointments();
                }}
                className="p-1.5 hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-full transition-all text-slate-500 dark:text-zinc-400 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-zinc-900/10 flex flex-col">
              {loadingMessages ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span className="text-xs">Cargando conversación...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <p className="text-xs text-slate-400">No hay mensajes en esta conversación.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Envía una alerta de WhatsApp para iniciar la conversación.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[85%] flex flex-col ${msg.direction === 'inbound' ? 'items-start' : 'items-end'}`}>
                      <div
                        className={`rounded-2xl px-3 py-2 text-xs shadow-sm leading-relaxed ${
                          msg.direction === 'inbound'
                            ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-zinc-800/40'
                            : `${theme.primaryBg} text-white rounded-tr-none`
                        }`}
                      >
                        {msg.templateName && (
                          <span className="block text-[8px] opacity-75 uppercase font-bold tracking-wider mb-0.5">
                            Plantilla: {msg.templateName}
                          </span>
                        )}
                        <p className="whitespace-pre-line">{msg.content}</p>
                        <span className="block text-[8px] opacity-60 text-right mt-1">
                          {msg.status === 'received' ? 'Recibido' : msg.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Simulated actions & custom simulation response panel */}
            {conversation && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-900/60 border-t border-slate-100 dark:border-zinc-800/30 flex flex-col gap-2">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simular Respuesta del Paciente:</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSimulateResponse('Sí, confirmo la cita')}
                    disabled={sendingMessage}
                    className={`px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 ${theme.primaryText} text-[10px] font-bold rounded-lg transition-all cursor-pointer`}
                  >
                    Sí, confirmo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateResponse('No, cancelo la cita')}
                    disabled={sendingMessage}
                    className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    No, cancelo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateResponse('¿Me podría reagendar la hora?')}
                    disabled={sendingMessage}
                    className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Pedir Reagendar
                  </button>
                </div>
              </div>
            )}

            {/* Chat Input form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-zinc-950 border-t border-slate-200/60 dark:border-zinc-800/50 flex gap-2">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder={conversation ? "Escribe un mensaje de respuesta..." : "Envía una alerta primero para habilitar el chat"}
                disabled={!conversation || sendingMessage}
                className={`flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 ${theme.focusRing} text-slate-800 dark:text-white`}
              />
              <button
                type="submit"
                disabled={!conversation || !newMessageText.trim() || sendingMessage}
                className={`${theme.primaryBg} ${theme.primaryHoverBg} text-white rounded-xl px-3 py-2 flex items-center justify-center disabled:opacity-40 transition-all cursor-pointer`}
              >
                {sendingMessage ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
