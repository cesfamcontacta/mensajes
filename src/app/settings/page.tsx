'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { 
  Users, 
  Megaphone, 
  PlusCircle, 
  Trash2, 
  Check, 
  AlertTriangle,
  UserPlus,
  Mail,
  Shield,
  FileText,
  Info,
  Pencil,
  X
} from 'lucide-react'
import { 
  getSystemUsers, 
  createSystemUser, 
  deleteSystemUser, 
  updateSystemUser,
  getAllCampaignTemplates, 
  createCampaign, 
  deleteCampaign,
  saveCampaignTemplate
} from '@/app/actions'

interface User {
  id: string
  name: string
  email: string
  role: string
  password?: string
  isActive: boolean
}

interface Campaign {
  id: string
  campaignType: string
  title: string
  messageTemplate: string
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'campaigns'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isPending, startTransition] = useTransition()

  // User form state
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('admin')
  const [userPassword, setUserPassword] = useState('')
  const [userError, setUserError] = useState('')
  const [userSuccess, setUserSuccess] = useState('')

  // Edit User state
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editUserName, setEditUserName] = useState('')
  const [editUserEmail, setEditUserEmail] = useState('')
  const [editUserRole, setEditUserRole] = useState('admin')
  const [editUserPassword, setEditUserPassword] = useState('')

  // Campaign form state
  const [campaignTitle, setCampaignTitle] = useState('')
  const [campaignType, setCampaignType] = useState('')
  const [campaignTemplate, setCampaignTemplate] = useState('')
  const [campaignError, setCampaignError] = useState('')
  const [campaignSuccess, setCampaignSuccess] = useState('')

  // Edit template state
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null)
  const [editingTemplateText, setEditingTemplateText] = useState('')


  // Fetch initial data
  const loadData = async () => {
    const fetchedUsers = await getSystemUsers()
    const fetchedCampaigns = await getAllCampaignTemplates()
    setUsers(fetchedUsers)
    setCampaigns(fetchedCampaigns)
  }

  useEffect(() => {
    loadData()
  }, [])

  // Auto-generate slug/type from campaign title
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value
    setCampaignTitle(title)
    
    // Convert to slug: lowercase, replace spaces/accents/special chars with hyphens
    const slug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
      .trim()
      .replace(/\s+/g, "-") // Replace spaces with single hyphen
    
    setCampaignType(slug)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setUserError('')
    setUserSuccess('')

    if (!userName.trim() || !userEmail.trim()) {
      setUserError('Por favor completa todos los campos requeridos.')
      return
    }

    startTransition(async () => {
      const res = await createSystemUser(userName, userEmail, userRole, userPassword)
      if (res.success) {
        setUserSuccess('Usuario creado exitosamente.')
        setUserName('')
        setUserEmail('')
        setUserRole('admin')
        setUserPassword('')
        loadData()
      } else {
        setUserError(res.error || 'Error al crear el usuario.')
      }
    })
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUserName.trim() || !editUserEmail.trim()) {
      alert('Nombre y correo son requeridos.')
      return
    }

    startTransition(async () => {
      const res = await updateSystemUser(
        editingUserId!,
        editUserName,
        editUserEmail,
        editUserRole,
        editUserPassword
      )
      if (res.success) {
        setEditingUserId(null)
        setEditUserName('')
        setEditUserEmail('')
        setEditUserRole('admin')
        setEditUserPassword('')
        loadData()
      } else {
        alert('Error al actualizar el usuario.')
      }
    })
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return

    startTransition(async () => {
      const res = await deleteSystemUser(id)
      if (res.success) {
        loadData()
      } else {
        alert('Error al eliminar usuario')
      }
    })
  }

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setCampaignError('')
    setCampaignSuccess('')

    if (!campaignTitle.trim() || !campaignType.trim() || !campaignTemplate.trim()) {
      setCampaignError('Por favor completa todos los campos del formulario.')
      return
    }

    startTransition(async () => {
      const res = await createCampaign(campaignTitle, campaignType, campaignTemplate)
      if (res.success) {
        setCampaignSuccess('Campaña creada exitosamente.')
        setCampaignTitle('')
        setCampaignType('')
        setCampaignTemplate('')
        loadData()
      } else {
        setCampaignError(res.error || 'Error al crear la campaña (¿el identificador ya existe?).')
      }
    })
  }

  const handleDeleteCampaign = async (id: string, title: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la campaña "${title}"?`)) return

    startTransition(async () => {
      const res = await deleteCampaign(id)
      if (res.success) {
        loadData()
      } else {
        alert('Error al eliminar la campaña')
      }
    })
  }

  const handleEditSave = async (campaignType: string) => {
    if (!editingTemplateText.trim()) {
      alert('La plantilla no puede estar vacía.')
      return
    }

    startTransition(async () => {
      const res = await saveCampaignTemplate(campaignType, editingTemplateText)
      if (res.success) {
        setEditingCampaignId(null)
        loadData()
      } else {
        alert(res.error || 'Error al guardar la plantilla.')
      }
    })
  }


  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Configuración del Sistema
        </h1>
        <p className="text-slate-600 dark:text-zinc-400 mt-1">
          Administra los usuarios autorizados del sistema y configura las campañas u operativos de salud de forma dinámica.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'users'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Usuarios del Sistema
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 text-sm font-semibold transition-all ${
            activeTab === 'campaigns'
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Megaphone className="h-4 w-4" />
          Gestión de Campañas
        </button>
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create User Form */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-500" />
              Agregar Usuario
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Registra un nuevo usuario para otorgarle acceso a la plataforma.
            </p>

            <form onSubmit={handleAddUser} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="juan.perez@cesfam.cl"
                    className="w-full text-sm pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Contraseña (Por defecto: Futrono2026)
                </label>
                <input
                  type="text"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  placeholder="Futrono2026"
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Rol del Sistema
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full text-sm pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white appearance-none cursor-pointer"
                  >
                    <option value="admin">Administrador</option>
                    <option value="operator">Operador / Gestor</option>
                  </select>
                </div>
              </div>

              {userError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              {userSuccess && (
                <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{userSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Crear Usuario'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              Usuarios Registrados
            </h2>

            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-400 uppercase bg-slate-50 dark:bg-zinc-900/50">
                    <th className="px-6 py-4">Usuario</th>
                    <th className="px-6 py-4">Correo</th>
                    <th className="px-6 py-4">Rol</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {users.map((u) => (
                    <React.Fragment key={u.id}>
                      <tr className="text-sm hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-all">
                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                          {u.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-zinc-400">
                          {u.email}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            u.role === 'admin' 
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' 
                              : 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                          }`}>
                            {u.role === 'admin' ? 'Administrador' : 'Operador'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5 mt-1.5">
                          <button
                            onClick={() => {
                              setEditingUserId(u.id)
                              setEditUserName(u.name)
                              setEditUserEmail(u.email)
                              setEditUserRole(u.role)
                              setEditUserPassword('')
                            }}
                            className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                            title="Editar usuario"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {editingUserId === u.id && (
                        <tr>
                          <td colSpan={4} className="px-6 py-4 bg-slate-50/60 dark:bg-zinc-950/40">
                            <form onSubmit={handleUpdateUser} className="space-y-3 p-3 bg-white dark:bg-zinc-900 border border-emerald-500/20 rounded-xl max-w-xl">
                              <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">
                                Modificar Datos del Usuario
                              </span>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nombre</label>
                                  <input 
                                    type="text"
                                    value={editUserName}
                                    onChange={(e) => setEditUserName(e.target.value)}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Correo</label>
                                  <input 
                                    type="email"
                                    value={editUserEmail}
                                    onChange={(e) => setEditUserEmail(e.target.value)}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Rol</label>
                                  <select
                                    value={editUserRole}
                                    onChange={(e) => setEditUserRole(e.target.value)}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white"
                                  >
                                    <option value="admin">Administrador</option>
                                    <option value="operator">Operador</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nueva Contraseña (Opcional)</label>
                                  <input 
                                    type="text"
                                    value={editUserPassword}
                                    placeholder="Dejar en blanco para no cambiar"
                                    onChange={(e) => setEditUserPassword(e.target.value)}
                                    className="w-full text-xs p-2 border border-slate-200 dark:border-zinc-800 rounded bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="px-3 py-1 text-xxs font-semibold border border-slate-200 dark:border-zinc-800 text-slate-500 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="submit"
                                  disabled={isPending}
                                  className="px-3 py-1 text-xxs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded transition-all cursor-pointer"
                                >
                                  {isPending ? 'Guardando...' : 'Actualizar'}
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Campaigns */}
      {activeTab === 'campaigns' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Campaign Form */}
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-emerald-500" />
              Nueva Campaña
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Crea un nuevo operativo de salud y define el mensaje de WhatsApp que se enviará a sus pacientes.
            </p>

            <form onSubmit={handleAddCampaign} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Título del Operativo
                </label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={handleTitleChange}
                  placeholder="Ej: Operativo Dental"
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5 flex items-center justify-between">
                  <span>Identificador único (Slug)</span>
                  <span className="text-[10px] text-slate-400 lowercase italic">Auto-generado</span>
                </label>
                <input
                  type="text"
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  placeholder="ej: operativo-dental"
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Mensaje de Campaña (Template)
                </label>
                <textarea
                  value={campaignTemplate}
                  onChange={(e) => setCampaignTemplate(e.target.value)}
                  rows={6}
                  placeholder="Hola {{nombre}}, le recordamos que tiene agendada su hora..."
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 dark:text-white font-sans"
                />
                
                {/* Info Variables */}
                <div className="mt-2 p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200/60 dark:border-zinc-800/80 rounded-xl space-y-1.5 text-[11px] text-slate-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1 font-semibold text-slate-900 dark:text-white mb-1">
                    <Info className="h-3.5 w-3.5 text-emerald-500" />
                    Variables Soportadas:
                  </div>
                  <div><code className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded font-mono">{"{{nombre}}"}</code> - Nombre del paciente</div>
                  <div><code className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded font-mono">{"{{fecha}}"}</code> - Fecha de la cita (DD-MM-YYYY)</div>
                  <div><code className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded font-mono">{"{{hora}}"}</code> - Hora de la cita (HH:MM)</div>
                  <div><code className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 px-1 py-0.5 rounded font-mono">{"{{establecimiento}}"}</code> - Lugar del operativo</div>
                </div>
              </div>

              {campaignError && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{campaignError}</span>
                </div>
              )}

              {campaignSuccess && (
                <div className="p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{campaignSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isPending ? 'Guardando...' : 'Crear Campaña'}
              </button>
            </form>
          </div>

          {/* Campaigns List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-emerald-500" />
              Campañas Activas
            </h2>

            <div className="grid grid-cols-1 gap-4">
              {campaigns.map((c) => (
                <div 
                  key={c.id} 
                  className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                        {c.title}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 uppercase font-semibold tracking-wider">
                          {c.campaignType}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">
                        Ruta del operativo: <span className="font-mono">/operativos/{c.campaignType}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCampaignId(c.id)
                          setEditingTemplateText(c.messageTemplate)
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all cursor-pointer"
                        title="Editar plantilla"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCampaign(c.id, c.title)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                        title="Eliminar campaña"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {editingCampaignId === c.id ? (
                    <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-zinc-950/50 rounded-xl border border-emerald-500/30">
                      <span className="block text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Editando Plantilla
                      </span>
                      <textarea
                        value={editingTemplateText}
                        onChange={(e) => setEditingTemplateText(e.target.value)}
                        rows={5}
                        className="w-full text-xs p-2.5 border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors font-sans"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingCampaignId(null)}
                          className="px-3 py-1 text-xxs font-semibold border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleEditSave(c.campaignType)}
                          disabled={isPending}
                          className="px-3 py-1 text-xxs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md transition-all cursor-pointer"
                        >
                          {isPending ? 'Guardando...' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200/60 dark:border-zinc-800/40 relative">
                      <span className="absolute top-2.5 right-3 text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Plantilla
                      </span>
                      <pre className="text-xs font-sans text-slate-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed pr-10">
                        {c.messageTemplate}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
              
              {campaigns.length === 0 && (
                <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl border border-slate-200/60 dark:border-zinc-800/50 text-center text-slate-400 italic">
                  No hay campañas registradas. Usa el formulario para crear una.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
