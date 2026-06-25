<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Naming Rules
- Do NOT use the name "smartsalud". Instead, refer to the project as "cesfam-contacta", "CESFAM Contacta" or "Contacta".

# Reglas de Desarrollo del Proyecto
- **Prohibido realizar cambios en la lógica de WhatsApp sin consulta:** No modifiques la estructura de las llamadas a la API de WhatsApp, el mapeo o procesamiento de las variables de mensajes (como el formato del nombre del paciente), ni los nombres de las plantillas de Meta en `actions.ts` o controladores sin preguntar previamente al usuario y obtener su confirmación explícita.
- **Prohibido subir cambios a Git sin autorización explícita:** No realices `git push` ni subas cambios al repositorio remoto sin que el usuario lo haya ordenado o autorizado explícitamente en el turno actual.
- **Alineación de Rejillas (Grid Layouts) y Tablas:** Cuando diseñes cabeceras/resúmenes de datos y tablas de detalles que deban alinearse horizontalmente columna por columna:
  1. **Contenedor de Scroll Único**: Tanto la cabecera (disparador del acordeón) como el listado de detalles deben compartir el mismo contenedor externo con scroll horizontal (`overflow-x-auto`) y el mismo ancho mínimo (`min-w-[...]`). Si la cabecera no está dentro de este scroll, se descuadrará con el listado al reducir el tamaño de la pantalla.
  2. **Evitar Especificidad Conflictiva de Tailwind**: No uses paddings horizontales combinados con sobreescrituras en la misma línea (por ejemplo, evitar `px-5 pl-14`). En su lugar, usa la declaración explícita de `pl-14 pr-5` en todas las filas para asegurar que la cuadrícula comience exactamente en la misma coordenada horizontal a nivel de píxel.
  3. **Control del Contenido Rígido**: Al definir columnas de cuadrícula con fracciones (`fr`), ten en cuenta que contenidos que no pueden romperse ni encogerse (como botones con `whitespace-nowrap`) forzarán a esa columna a ensancharse en pantallas angostas, distorsionando las proporciones con respecto a otras filas. Asegúrate de darles suficiente peso en la fracción o incrementar el ancho mínimo total para albergar el contenido.
- **No usar Linear:** En este proyecto NO se utiliza la plataforma Linear para la gestión de tareas o control de cambios. Ignora cualquier credencial o configuración global relacionada con Linear, no intentes consumir su API ni hagas mención de ella.


