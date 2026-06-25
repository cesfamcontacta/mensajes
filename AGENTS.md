<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Naming Rules
- Do NOT use the name "smartsalud". Instead, refer to the project as "cesfam-contacta", "CESFAM Contacta" or "Contacta".

# Reglas de Desarrollo del Proyecto
- **Prohibido realizar cambios en la lógica de WhatsApp sin consulta:** No modifiques la estructura de las llamadas a la API de WhatsApp, el mapeo o procesamiento de las variables de mensajes (como el formato del nombre del paciente), ni los nombres de las plantillas de Meta en `actions.ts` o controladores sin preguntar previamente al usuario y obtener su confirmación explícita.
- **Prohibido subir cambios a Git sin autorización explícita:** No realices `git push` ni subas cambios al repositorio remoto sin que el usuario lo haya ordenado o autorizado explícitamente en el turno actual.


