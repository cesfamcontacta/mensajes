import { getAppointments, sendWhatsAppNotification } from '../actions'
import { Calendar, User, UserCheck, Stethoscope, Clock, MapPin, Send, CheckCircle, AlertCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'

export default async function AppointmentsPage() {
  const appointments = await getAppointments()

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Citas y Turnos Médicos
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">
            Gestión integral de citas y envío de notificaciones de WhatsApp para confirmación.
          </p>
        </div>
        
        <Link
          href="/appointments/upload"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all cursor-pointer"
        >
          <FileSpreadsheet className="h-4.5 w-4.5" />
          Cargar Excel
        </Link>
      </div>

      {/* Appointments List */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-zinc-800/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Listado de Citas Agendadas</h2>
          <span className="text-xs font-semibold bg-slate-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-slate-600 dark:text-zinc-400">
            {appointments.length} Citas en total
          </span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
          {appointments.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-zinc-500">
              <Calendar className="h-12 w-12 mx-auto text-slate-400 mb-4 opacity-50" />
              <p className="font-medium">No se encontraron citas agendadas.</p>
              <p className="text-sm mt-1 text-slate-400">Restablece los datos de prueba en el Dashboard principal.</p>
            </div>
          ) : (
            appointments.map((app) => (
              <div key={app.id} className="p-6 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Patient and details */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                      {app.patientName}
                    </h3>
                    <span className="text-xs text-slate-500 dark:text-zinc-500 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono">
                      {app.patientRut}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm text-slate-600 dark:text-zinc-400">
                    <span className="flex items-center gap-2">
                      <Stethoscope className="h-4 w-4 text-slate-400 shrink-0" />
                      <strong>Servicio:</strong> {app.service}
                    </span>
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400 shrink-0" />
                      <strong>Médico:</strong> {app.professionalName} ({app.specialty})
                    </span>
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                      <strong>Hora y Fecha:</strong> {app.date} a las {app.time.slice(0, 5)} hrs
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                      <strong>Lugar:</strong> {app.establecimiento} ({app.policlinico})
                    </span>
                  </div>

                  {app.observations && (
                    <p className="text-xs text-slate-500 dark:text-zinc-500 italic bg-slate-50 dark:bg-zinc-800/30 p-2.5 rounded-xl border border-slate-100 dark:border-zinc-800/30">
                      Observación: {app.observations}
                    </p>
                  )}
                </div>

                {/* Status & Actions */}
                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 shrink-0">
                  {/* Status Badge */}
                  <span
                    className={`text-xs font-semibold px-3.5 py-1.5 rounded-full capitalize flex items-center gap-1.5 ${
                      app.status === 'confirmed'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : app.status === 'sent'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                        : app.status === 'cancelled'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20'
                    }`}
                  >
                    {app.status === 'pending' && <AlertCircle className="h-3.5 w-3.5" />}
                    {app.status === 'sent' && <Send className="h-3.5 w-3.5" />}
                    {app.status === 'confirmed' && <CheckCircle className="h-3.5 w-3.5" />}
                    {app.status === 'cancelled' && <XCircle className="h-3.5 w-3.5" />}

                    {app.status === 'pending'
                      ? 'pendiente'
                      : app.status === 'sent'
                      ? 'enviado'
                      : app.status === 'confirmed'
                      ? 'confirmado'
                      : app.status === 'cancelled'
                      ? 'cancelado'
                      : app.status}
                  </span>

                  {/* Actions Form */}
                  {app.status === 'pending' ? (
                    <form action={async () => {
                      'use server'
                      await sendWhatsAppNotification(app.id)
                    }}>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Notificar por WhatsApp
                      </button>
                    </form>
                  ) : app.status === 'sent' ? (
                    <span className="text-xs text-slate-500 dark:text-zinc-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Esperando respuesta...
                    </span>
                  ) : app.status === 'confirmed' ? (
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                      <UserCheck className="h-3.5 w-3.5" />
                      Paciente Confirmado
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 dark:text-zinc-500">
                      Sin acciones adicionales
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
