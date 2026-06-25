import { getCampaignTemplate, getAppointmentsByCampaign } from '../../actions'
import CampaignClientView from './CampaignClientView'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { FileSpreadsheet } from 'lucide-react'

interface PageProps {
  params: Promise<{ type: string }>
}

const colorMap: Record<string, string> = {
  'mamografias': 'bg-pink-600 hover:bg-pink-500 shadow-pink-600/10 hover:shadow-pink-600/20',
  'ecografia-mamaria': 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/10 hover:shadow-purple-600/20',
  'ecografia-abdominal': 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/10 hover:shadow-blue-600/20',
  'oftalmologia': 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/10 hover:shadow-teal-600/20',
  'otorrino': 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10 hover:shadow-amber-600/20'
}

const campaignTitles: Record<string, string> = {
  'mamografias': 'Mamografías',
  'ecografia-mamaria': 'Ecografía Mamaria',
  'ecografia-abdominal': 'Ecografía Abdominal',
  'oftalmologia': 'Oftalmología',
  'otorrino': 'Otorrino'
}

export default async function CampaignPage({ params }: PageProps) {
  const resolvedParams = await params
  const type = resolvedParams.type

  if (!campaignTitles[type]) {
    notFound()
  }

  const template = await getCampaignTemplate(type)
  const appointments = await getAppointmentsByCampaign(type)

  const buttonColor = colorMap[type] || 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10 hover:shadow-emerald-600/20'

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operativo: {campaignTitles[type]}
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">
            Configura la plantilla de WhatsApp y gestiona el envío de notificaciones para este operativo.
          </p>
        </div>
        
        <Link
          href={`/appointments/upload?campaign=${type}`}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all cursor-pointer bg-green-600 hover:bg-green-500 shadow-green-600/10 hover:shadow-green-600/20"
        >
          <FileSpreadsheet className="h-4.5 w-4.5" />
          Cargar Citas
        </Link>
      </div>

      <CampaignClientView 
        campaignType={type} 
        campaignTitle={campaignTitles[type]} 
        initialTemplate={template?.messageTemplate || ''} 
        initialAppointments={appointments}
      />
    </div>
  )
}
