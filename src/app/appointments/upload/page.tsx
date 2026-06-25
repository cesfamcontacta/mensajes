'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { importAppointmentsFromExcel } from '../../actions'
import { Upload, ArrowLeft, Check, AlertCircle, FileSpreadsheet, Loader2 } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  )
}

function UploadPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<any[] | null>(null)
  const [campaignType, setCampaignType] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const campaignParam = searchParams.get('campaign')
    if (campaignParam) {
      setCampaignType(campaignParam)
    }
  }, [searchParams])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const parseExcel = (selectedFile: File) => {
    setError(null)
    setFile(selectedFile)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) throw new Error('No se pudo leer el archivo')
        
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false })
        
        if (json.length === 0) {
          setError('El archivo Excel está vacío o no tiene el formato correcto.')
          setParsedData(null)
          return
        }
        
        // Basic validation of fields in the first row
        const firstRow = json[0] as any
        const keys = Object.keys(firstRow).map(k => 
          k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        )
        
        const hasRut = keys.some(k => ['rut paciente', 'rut', 'rut_paciente', 'paciente_rut', 'rut_pac', 'rut pac'].includes(k))
        const hasNombre = keys.some(k => ['nombre paciente', 'nombre', 'paciente', 'nombre_paciente', 'nom_pac', 'nombre pac', 'nombre y apellidos', 'nombre y apellido'].includes(k))
        const hasFecha = keys.some(k => ['fecha cita', 'fecha', 'fecha_cita', 'date', 'fec_cita', 'fecha_atencion'].includes(k))
        const hasHora = keys.some(k => ['hora cita', 'hora', 'hora_cita', 'time', 'hor_cita', 'hora_atencion'].includes(k))
        
        if (!hasRut || !hasNombre || !hasFecha || !hasHora) {
          setError('El archivo debe contener al menos las columnas: "RUT Paciente", "Nombre Paciente", "Fecha Cita" y "Hora Cita".')
          setParsedData(null)
          return
        }
        
        setParsedData(json)
      } catch (err) {
        console.error(err)
        setError('Ocurrió un error al analizar el archivo Excel. Asegúrate de que es un archivo válido.')
        setParsedData(null)
      }
    }
    
    reader.onerror = () => {
      setError('Error al leer el archivo.')
    }
    
    reader.readAsBinaryString(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        parseExcel(droppedFile)
      } else {
        setError('Por favor, selecciona solo archivos Excel (.xlsx o .xls).')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      parseExcel(e.target.files[0])
    }
  }

  const handleImport = async () => {
    if (!parsedData) return
    setLoading(true)
    setError(null)
    
    try {
      const plainData = JSON.parse(JSON.stringify(parsedData))
      const res = await importAppointmentsFromExcel(plainData, campaignType || undefined)
      if (res.success) {
        setSuccess(true)
        setTimeout(() => {
          if (campaignType) {
            router.push(`/operativos/${campaignType}`)
          } else {
            router.push('/')
          }
        }, 1500)
      } else {
        setError(res.error || 'Ocurrió un error al guardar los datos en la base de datos.')
      }
    } catch (err) {
      console.error(err)
      setError('Error al comunicarse con el servidor.')
    } finally {
      setLoading(false)
    }
  }

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'RUT Paciente': '12345678-9',
        'Nombre Paciente': 'Juan Pérez',
        'Teléfono': '912345678',
        'Edad': 45,
        'Fecha Cita': '2026-06-25',
        'Hora Cita': '09:30',
        'Profesional': 'Dra. María Pérez',
        'Especialidad': 'Medicina General',
        'Servicio': 'Control Crónicos',
        'Establecimiento': 'CESFAM Dr. Juan Carlos Baeza',
        'Box': 'Box 3',
        'Observaciones': 'Paciente requiere control de presión'
      },
      {
        'RUT Paciente': '19876543-0',
        'Nombre Paciente': 'Lucía Soto',
        'Teléfono': '987654321',
        'Edad': 23,
        'Fecha Cita': '2026-06-25',
        'Hora Cita': '10:15',
        'Profesional': 'Dr. Carlos Muñoz',
        'Especialidad': 'Pediatría',
        'Servicio': 'Control Niño Sano',
        'Establecimiento': 'CECOSF Los Arrayanes',
        'Box': 'Box Pediatría 1',
        'Observaciones': ''
      }
    ]

    const worksheet = XLSX.utils.json_to_sheet(sampleData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Citas')
    XLSX.writeFile(workbook, 'plantilla_citas_cesfam.xlsx')
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in p-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href={campaignType ? `/operativos/${campaignType}` : '/'}
          className="h-10 w-10 border border-slate-200 dark:border-zinc-800 rounded-xl flex items-center justify-center bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Cargar Citas desde Excel
          </h1>
          <p className="text-slate-600 dark:text-zinc-400 mt-1">
            Sube un archivo de Excel para programar de forma masiva citas, profesionales y turnos.
          </p>
        </div>
      </div>

      {/* Main Form Area */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/60 dark:border-zinc-800/50 shadow-sm p-6 space-y-6">
        
        {/* Alerts */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Error de Validación</p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-2xl flex items-start gap-3">
            <Check className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">¡Importación Exitosa!</p>
              <p className="text-xs mt-0.5">Se han importado los registros de forma local. Redirigiendo...</p>
            </div>
          </div>
        )}

        {/* Campaign Selection */}
        {!parsedData && !success && (
          <div className="space-y-2 pb-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
              Asociar a Operativo de Salud (Recomendado si tu Excel no especifica Servicio)
            </label>
            <select
              value={campaignType}
              onChange={(e) => setCampaignType(e.target.value)}
              className="w-full text-sm p-3 border border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50/50 dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">Detectar automáticamente (según columna Servicio/Especialidad del Excel)</option>
              <option value="mamografias">Mamografías</option>
              <option value="ecografia-mamaria">Ecografía Mamaria</option>
              <option value="ecografia-abdominal">Ecografía Abdominal</option>
              <option value="oftalmologia">Oftalmología</option>
              <option value="otorrino">Otorrino</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Si el Excel contiene los datos de la Foto 1 (RUT, Nombre, Fecha, Hora, Teléfono, Establecimiento), selecciona a qué operativo corresponden estas citas para vincularlas directamente.
            </p>
          </div>
        )}

        {/* Drag & Drop Zone */}
        {!parsedData && !success && (
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center transition-all ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/5' 
                : 'border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/10'
            }`}
          >
            <div className="h-16 w-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <Upload className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white mb-1">Arrastra tu archivo aquí</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 mb-6">
              Soporta archivos Excel (.xlsx, .xls) de hasta 10MB
            </p>
            
            <div className="flex gap-4">
              <label className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all">
                Seleccionar Archivo
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".xlsx,.xls"
                  onChange={handleChange}
                />
              </label>
              <button
                onClick={downloadSampleTemplate}
                className="px-5 py-2.5 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Descargar Plantilla
              </button>
            </div>
          </div>
        )}

        {/* Data Preview */}
        {parsedData && !success && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">Previsualización de Datos</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-500">Se encontraron {parsedData.length} registros listos para importar.</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setFile(null)
                    setParsedData(null)
                    setError(null)
                  }}
                  className="px-4 py-2 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cambiar Archivo
                </button>
                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Confirmar e Importar
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="border border-slate-200/60 dark:border-zinc-800/50 rounded-2xl overflow-hidden max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-semibold border-b border-slate-200/60 dark:border-zinc-800/50">
                    <th className="p-3">Paciente</th>
                    <th className="p-3">RUT</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3">Fecha y Hora</th>
                    <th className="p-3">Médico</th>
                    <th className="p-3">Servicio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/50 text-slate-800 dark:text-zinc-300">
                  {parsedData.slice(0, 15).map((row, idx) => {
                    const getVal = (possibleKeys: string[]) => {
                      for (const k of Object.keys(row)) {
                        const normalizedKey = k.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        if (possibleKeys.includes(normalizedKey)) return row[k];
                      }
                      return '';
                    };

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/20">
                        <td className="p-3 font-medium">{getVal(['nombre paciente', 'nombre', 'paciente', 'nombre_paciente', 'nombre y apellidos', 'nombre y apellido'])}</td>
                        <td className="p-3 font-mono">{getVal(['rut paciente', 'rut', 'rut_paciente'])}</td>
                        <td className="p-3">{getVal(['telefono', 'celular', 'phone', 'contacto'])}</td>
                        <td className="p-3">{getVal(['fecha cita', 'fecha'])} {getVal(['hora cita', 'hora'])}</td>
                        <td className="p-3">{getVal(['profesional', 'medico', 'médico'])}</td>
                        <td className="p-3">{getVal(['servicio', 'service'])}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {parsedData.length > 15 && (
                <div className="p-3 text-center bg-slate-50/50 dark:bg-zinc-800/20 border-t border-slate-200/60 dark:border-zinc-800/50 text-slate-500 dark:text-zinc-500 font-medium">
                  Y {parsedData.length - 15} registros más...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Guide Card */}
      <div className="bg-slate-50 dark:bg-zinc-800/30 p-6 rounded-3xl border border-slate-200/60 dark:border-zinc-800/50 space-y-4">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Instrucciones del Formato Excel
        </h3>
        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
          Para garantizar una carga limpia y automática en la base de datos, el archivo cargado debe incluir al menos las siguientes columnas con sus nombres exactos (o equivalentes similares):
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <p className="text-slate-800 dark:text-zinc-200 font-semibold">Columnas Obligatorias:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-zinc-400">
              <li><strong>RUT Paciente</strong> (con guion y dígito verificador)</li>
              <li><strong>Nombre Paciente</strong> (nombre completo)</li>
              <li><strong>Fecha Cita</strong> (formato YYYY-MM-DD o DD-MM-YYYY)</li>
              <li><strong>Hora Cita</strong> (formato HH:MM)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <p className="text-slate-800 dark:text-zinc-200 font-semibold">Columnas Recomendadas/Opcionales:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-zinc-400">
              <li><strong>Teléfono</strong> (ej: +56912345678 o 912345678)</li>
              <li><strong>Profesional</strong> (nombre del médico o matrona)</li>
              <li><strong>Especialidad</strong> y <strong>Servicio</strong></li>
              <li><strong>Establecimiento</strong> y <strong>Box</strong> de atención</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
