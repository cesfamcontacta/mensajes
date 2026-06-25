import { getConversations, getConversationMessages, simulatePatientResponse, markConversationAsRead } from '../actions'
import Link from 'next/link'
import { MessageSquare, Send, CheckCircle2, XCircle, ArrowLeft, RefreshCw, Clock } from 'lucide-react'

interface PageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function ChatPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  const activeId = resolvedSearchParams.id

  if (activeId) {
    // Mark as read first to update the database before fetching the list
    await markConversationAsRead(activeId)
  }

  const conversations = await getConversations()

  // Find active conversation
  const activeConversation = conversations.find(c => c.id === activeId)
  let messages: any[] = []

  if (activeConversation) {
    // Fetch messages
    messages = await getConversationMessages(activeConversation.id)
  }

  return (
    <div className="h-[82vh] flex flex-col space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Bandeja de Conversaciones (WhatsApp)
        </h1>
        <p className="text-slate-600 dark:text-zinc-400 mt-1">
          Simulador de mensajería bidireccional y confirmaciones de pacientes.
        </p>
      </div>

      {/* Main chat layout */}
      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm overflow-hidden flex min-h-0">
        
        {/* Left pane: Conversations list */}
        <aside className="w-80 border-r border-slate-100 dark:border-zinc-800/50 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100 dark:border-zinc-800/50">
            <h2 className="font-bold text-slate-900 dark:text-white">Pacientes Activos</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 dark:divide-zinc-800/30">
            {conversations.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-500 dark:text-zinc-500">
                No hay conversaciones activas. Notifica a un paciente en Citas para iniciar.
              </p>
            ) : (
              conversations.map((conv) => (
                <Link
                  key={conv.id}
                  href={`/chat?id=${conv.id}`}
                  className={`p-4 block transition-all hover:bg-slate-50/80 dark:hover:bg-zinc-800/20 ${
                    conv.id === activeId ? 'bg-slate-100/50 dark:bg-zinc-800/40 border-l-4 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate block">
                      {conv.patientName}
                    </span>
                    {conv.unreadCount > 0 && conv.id !== activeId && (
                      <span className="h-5 min-w-5 px-1 bg-emerald-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-zinc-500 block truncate mt-1">
                    {conv.lastMessagePreview || 'Sin mensajes'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 block mt-2 text-right">
                    {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </aside>

        {/* Right pane: Message details & simulated keyboard */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-zinc-900/10">
          {activeConversation ? (
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Chat header */}
              <div className="p-4 bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {activeConversation.patientName}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-zinc-500 block mt-0.5">
                    Teléfono: {activeConversation.phone} | RUT: {activeConversation.patientRut}
                  </span>
                </div>
              </div>

              {/* Chat messages */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-12">No hay mensajes en esta conversación.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[70%] flex flex-col ${msg.direction === 'inbound' ? 'items-start' : 'items-end'}`}>
                        <div
                          className={`rounded-2xl p-4 text-sm shadow-sm leading-relaxed ${
                            msg.direction === 'inbound'
                              ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white rounded-tl-none border border-slate-100 dark:border-zinc-800/40'
                              : 'bg-emerald-600 text-white rounded-tr-none'
                          }`}
                        >
                          <p>{msg.content}</p>
                          <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px] opacity-70">
                            <Clock className="h-3 w-3" />
                            <span>{msg.status}</span>
                          </div>
                        </div>

                        {/* Interactive WhatsApp simulated Quick Reply buttons */}
                        {msg.direction === 'outbound' && msg.messageType === 'template' && (
                          <div className="mt-2 flex flex-col sm:flex-row gap-2 w-full justify-end">
                            <form action={async () => {
                              'use server'
                              await simulatePatientResponse(activeConversation.id, 'Sí, confirmo la cita')
                            }}>
                              <button
                                type="submit"
                                className="w-full bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-2 px-4 rounded-xl shadow-sm cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Sí, confirmo la cita
                              </button>
                            </form>
                            <form action={async () => {
                              'use server'
                              await simulatePatientResponse(activeConversation.id, 'No, cancelo la cita')
                            }}>
                              <button
                                type="submit"
                                className="w-full bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-850 border border-slate-200 dark:border-zinc-800 text-rose-600 dark:text-rose-400 text-xs font-bold py-2 px-4 rounded-xl shadow-sm cursor-pointer transition-all hover:scale-[1.01] flex items-center justify-center gap-1.5"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                No, cancelo la cita
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Simulated Inbound WhatsApp Reply Panel */}
              <div className="p-4 bg-white dark:bg-zinc-900 border-t border-slate-100 dark:border-zinc-800/50">
                <span className="block text-xs font-bold text-slate-600 dark:text-zinc-400 uppercase tracking-wider mb-3.5">
                  Simular Respuesta Entrante de WhatsApp (Paciente)
                </span>
                
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {/* Quick Confirm */}
                  <form action={async () => {
                    'use server'
                    await simulatePatientResponse(activeConversation.id, 'Sí, confirmo la cita')
                  }}>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold rounded-xl text-xs transition-all border border-emerald-500/20 cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      "Sí, confirmo la cita"
                    </button>
                  </form>

                  {/* Quick Cancel */}
                  <form action={async () => {
                    'use server'
                    await simulatePatientResponse(activeConversation.id, 'No, cancelo la cita')
                  }}>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold rounded-xl text-xs transition-all border border-rose-500/20 cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                      "No, cancelo la cita"
                    </button>
                  </form>

                  {/* Quick Question */}
                  <form action={async () => {
                    'use server'
                    await simulatePatientResponse(activeConversation.id, 'Hola, ¿a qué box tengo que ir?')
                  }}>
                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-semibold rounded-xl text-xs transition-all border border-blue-500/20 cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      "¿A qué box voy?"
                    </button>
                  </form>
                </div>

                {/* Free Text simulated response form */}
                <form
                  action={async (formData: FormData) => {
                    'use server'
                    const text = formData.get('messageText') as string
                    if (text && text.trim()) {
                      await simulatePatientResponse(activeConversation.id, text)
                    }
                  }}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    name="messageText"
                    placeholder="Simula escribir un mensaje del paciente..."
                    className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-slate-800 dark:text-white"
                    required
                  />
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center h-10 w-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-500 dark:text-zinc-500">
              <MessageSquare className="h-16 w-16 text-slate-300 dark:text-zinc-700 mb-4" />
              <p className="font-semibold text-lg">Selecciona un paciente</p>
              <p className="text-sm mt-1 max-w-xs mx-auto">
                Selecciona una conversación del listado izquierdo para revisar el historial o simular mensajes.
              </p>
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
