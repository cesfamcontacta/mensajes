import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { LayoutDashboard, Calendar, MessageSquare, Settings } from 'lucide-react'
import { getAllCampaignTemplates } from '@/app/actions'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'CESFAM Contacta - Sistema de Citas y Mensajería',
  description: 'Gestión local de citas médicas y simulación de WhatsApp para CESFAM',
}

const colorMap: Record<string, string> = {
  'mamografias': 'bg-pink-500',
  'ecografia-mamaria': 'bg-purple-500',
  'ecografia-abdominal': 'bg-blue-500',
  'oftalmologia': 'bg-teal-500',
  'otorrino': 'bg-amber-500'
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const campaigns = await getAllCampaignTemplates()

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 font-sans">
        {/* Navigation Sidebar */}
        <aside className="w-64 border-r border-slate-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md flex flex-col fixed inset-y-0 left-0 z-20">
          <div className="p-6 border-b border-slate-200/80 dark:border-zinc-800/80">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-bold text-lg">
                C
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                  CESFAM
                </span>
                <span className="block text-xs font-semibold text-emerald-500 -mt-1 tracking-wider uppercase">
                  Contacta
                </span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {/* Hidden Dashboard as requested
            <Link
              href="/"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-all group"
            >
              <LayoutDashboard className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              Dashboard
            </Link>
            */}
            {/* Hidden navigation items as requested
            <Link
              href="/appointments"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-all group"
            >
              <Calendar className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              Citas y Turnos
            </Link>
            <Link
              href="/chat"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-all group"
            >
              <MessageSquare className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
              Conversaciones
            </Link>
            */}

            <div>
              <span className="px-4 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">
                Operativos de Salud
              </span>
              <div className="space-y-0.5">
                {campaigns.map((campaign) => {
                  const dotColor = colorMap[campaign.campaignType] || 'bg-emerald-500'
                  return (
                    <Link
                      key={campaign.id}
                      href={`/operativos/${campaign.campaignType}`}
                      className="flex items-center gap-3 px-4 py-2 text-xs font-medium rounded-xl text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white transition-all"
                    >
                      <span className={`h-2 w-2 rounded-full ${dotColor} shrink-0`}></span>
                      {campaign.title}
                    </Link>
                  )
                })}
                {campaigns.length === 0 && (
                  <span className="px-4 py-2 text-xs text-slate-400 block italic">
                    Sin operativos
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200/80 dark:border-zinc-800/80">
              <Link
                href="/settings"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/50 transition-all group"
              >
                <Settings className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                Configuración
              </Link>
            </div>
          </nav>

          {/* Modo Local indicator card removed */}
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 pl-64 min-h-screen flex flex-col">
          <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

