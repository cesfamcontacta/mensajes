import { isDbSeeded, seedData, getDashboardStats, getAppointments } from './actions'
import { Calendar, CheckCircle2, AlertCircle, XCircle, RefreshCw, MessageSquare, Database, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default async function Home() {
  const seeded = await isDbSeeded()

  if (!seeded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-xl mx-auto px-4">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-xl shadow-emerald-500/20 text-white mb-6">
          <Database className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-4">
          Inicializa tu Base de Datos
        </h1>
        <p className="text-slate-600 dark:text-zinc-400 mb-8 leading-relaxed">
          Para comenzar a explorar el sistema local de CESFAM Contacta, necesitamos cargar algunos datos iniciales de prueba (Establecimientos, Profesionales, Citas y Chats).
        </p>
        <form action={async () => {
          'use server'
          await seedData()
        }}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-600/10 hover:shadow-emerald-600/20 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            <Sparkles className="h-5 w-5" />
            Cargar Datos de Prueba
          </button>
        </form>
      </div>
    )
  }

  const stats = await getDashboardStats()
  const appointments = await getAppointments()

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard General
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">
            Panel de supervisión y control de confirmaciones para el CESFAM.
          </p>
        </div>

        <form action={async () => {
          'use server'
          await seedData()
        }}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Restablecer Datos
          </button>
        </form>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Citas */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-5">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Total Citas
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
              {stats.total}
            </span>
          </div>
        </div>

        {/* Card 2: Confirmadas */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-5">
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Confirmadas
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-slate-900 dark:text-white">
                {stats.confirmed}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                {stats.confirmationRate}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Pendientes */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-5">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-500 flex items-center justify-center shrink-0">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Pendientes
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
              {stats.pending}
            </span>
          </div>
        </div>

        {/* Card 4: Canceladas */}
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm flex items-center gap-5">
          <div className="h-12 w-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
              Canceladas
            </span>
            <span className="text-2xl font-bold text-slate-900 dark:text-white mt-1 block">
              {stats.cancelled}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Upcoming and Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Quick Actions & Status */}
        <div className="space-y-6">
          <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-6 rounded-3xl text-white shadow-xl shadow-emerald-600/15 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10">
              <MessageSquare className="h-48 w-48" />
            </div>
            <h3 className="text-xl font-bold mb-2">Simulador Activo</h3>
            <p className="text-emerald-100 text-sm leading-relaxed mb-6">
              Puedes realizar flujos completos de notificación de citas y respuestas rápidas de pacientes simulando WhatsApp en tiempo real.
            </p>
            <div className="flex gap-3">
              <Link
                href="/appointments"
                className="inline-flex items-center justify-center px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/10"
              >
                Enviar Alertas
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center justify-center px-4 py-2 bg-emerald-700/40 hover:bg-emerald-700/60 border border-emerald-400/20 text-white text-xs font-bold rounded-xl transition-all"
              >
                Ir al Chat
              </Link>
            </div>
          </div>

          {/* Quick Stats overview */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm">
            <h3 className="font-bold text-slate-950 dark:text-white mb-4">Estado de Envío</h3>
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span> Notificaciones Enviadas
                </span>
                <span className="font-semibold">{stats.sent}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500"></span> Pendientes de Notificar
                </span>
                <span className="font-semibold">{stats.pending}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Confirmaciones Totales
                </span>
                <span className="font-semibold">{stats.confirmed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Recent Appointments list */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-slate-950 dark:text-white">Citas del Día</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Listado general de citas agendadas.</p>
            </div>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
            >
              Ver todas
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-800/50">
            {appointments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-zinc-500 py-4 text-center">No hay citas registradas hoy.</p>
            ) : (
              appointments.slice(0, 5).map((app) => (
                <div key={app.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="font-semibold text-sm text-slate-900 dark:text-white block truncate">
                      {app.patientName}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-zinc-500 block truncate mt-0.5">
                      {app.service} • {app.professionalName} ({app.specialty})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                      {app.time.slice(0, 5)}
                    </span>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize shrink-0 ${
                        app.status === 'confirmed'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : app.status === 'sent'
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                          : app.status === 'cancelled'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
                      }`}
                    >
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
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
