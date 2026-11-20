# LukeApp — Especificación de la app actual (relevamiento)

> Relevado el 19/11/2026 navegando la app publicada con el perfil **Augus**.
> La sección del perfil **SilHect** (padre) queda pendiente.

## 1. Objetivo
Coordinar quién saca a pasear a **Luke** (el perro) todos los días a las **17:20** (hora de Argentina),
dejar registro de que el paseo se hizo y resolver cuando alguien no puede.

## 2. Perfiles
| Perfil  | Rol | Detalle |
|---------|-----|---------|
| Augus   | Paseador | Los **lunes, fijo** |
| Lucio   | Paseador | Los **martes, fijo** |
| SilHect | Padre / supervisión | "Seguimiento completo": ve calendario, historial, excepciones, movimientos y exporta datos |

- Inicio de sesión con usuario + contraseña. La sesión queda guardada en el dispositivo.
- Los datos se comparten entre los tres perfiles.

## 3. Algoritmo de turnos
- **Lunes → Augus** y **Martes → Lucio**, siempre fijos.
- **Miércoles a domingo**: alternan día por día, y el patrón se **invierte cada semana**:
  - Semana A: Mié Lucio · Jue Augus · Vie Lucio · Sáb Augus · Dom Lucio
  - Semana B: Mié Augus · Jue Lucio · Vie Augus · Sáb Lucio · Dom Augus
- Resultado: **7 turnos cada uno cada dos semanas**.
- Ejemplo real: la semana del 16/11/2026 es la semana A; la del 23/11 es la B.
- Las **excepciones** cambian un solo día; los **intercambios** cambian dos.

## 4. Estados de un turno
- **Pendiente**: todavía no llegó o no se confirmó.
- **Realizado**: alguien confirmó que lo sacó (se guarda quién y la hora del aviso).
- **No realizado (sin confirmación)**: terminó el día y nadie confirmó.
- **Sin responsable**: ninguno de los dos puede.
- También hay filtros "No realizado" y "Por confirmar".
- **Cobertura**: lo sacó alguien distinto al responsable original.

Cada turno guarda: fecha, hora (17:20), responsable original, responsable actual,
quién lo sacó, hora de confirmación y estado.

## 5. Excepciones y cambios
### Excepción ("No puedo realizar este paseo")
- Desde el detalle de **tu** turno.
- Pide el motivo ("¿Por qué no podés?").
- El turno pasa **al instante** al otro hermano, **sin pedirle aceptación**. Los demás días no cambian.
- Si ninguno puede, se avisa a la familia (queda "Sin responsable").
- Es la **única** forma de cambiar lunes y martes.

### Intercambio ("Proponer intercambio")
- Elegís uno de tus turnos futuros de miércoles a domingo y escribís el motivo.
- Tu hermano cubre ese día y vos **compensás** el próximo día disponible de él (lo calcula la app).
- El otro tiene que **aceptarlo**. Se aplica al aceptar.
- Ejemplo real: Lucio cubrió el viernes 30/10 y Augus compensó el sábado 31/10.

## 6. Pantallas
1. **Login**: usuario, contraseña e ilustración de Luke.
2. **Resumen** (inicio):
   - Saludo y tarjeta "El paseo de hoy" con estado, hora, quién lo sacó y a qué hora se confirmó.
   - Tarjeta "Un equipo de dos" con quién va mañana.
   - Tira de la semana (lunes a domingo) con responsable y estado.
   - "El equipo en números" (hoy, semana, mes o fechas elegidas): paseos realizados por persona,
     no realizados, coberturas y casos por resolver.
   - Tabla con los últimos paseos.
3. **Calendario**: semana y mes con el responsable de cada día.
4. **Historial de paseos**: tabla filtrable por período, persona y estado, con búsqueda,
   paginación, "Ver detalle" de cada turno y **Exportar CSV**.
5. **Excepciones y cambios**: lista de excepciones informadas, intercambios con su estado
   (aceptado, etc.) y el botón "Proponer intercambio".
6. **Actividad familiar**: registro de movimientos (paseo confirmado, intercambio solicitado o
   aceptado, excepciones) con fecha y hora.
7. **Notificaciones / Recordatorios**:
   - Notificaciones push a las **17:10** ("En 10 minutos, Luke te espera") y a las **17:20**
     ("Es hora del paseo de Luke"), además de avisos cuando te toca cubrir por una excepción.
     Se activan en cada celular y hay un botón para enviar una prueba.
   - Descarga de los próximos 90 días para el calendario del teléfono (.ics), para Augus, Lucio
     o ambos. El archivo no se actualiza solo.
   - **Alarma con sonido** a las 17:20 que repite hasta silenciarla o posponerla. Solo funciona
     con la app abierta. También hay una opción para mantener la pantalla encendida.
   - **Alarma con el celular bloqueado**: Atajos de iPhone o Automate en Android consultan a las
     17:19 si te toca, usando una "clave de conexión" que se puede revocar.
   - Bandeja de avisos recibidos y un **diagnóstico de envíos** (aceptada por el servicio,
     mostrada en el dispositivo, abierta).
8. **Las reglas de la casa**: ventana con los tres perfiles y las reglas.
9. **Jugar con Luke**: cuatro minijuegos ("Luke pastor", "Paseo aventurero", "Buscá la pelota",
   "¡A buscar, Luke!"). También se le puede hacer una caricia a Luke en el dibujo.

## 7. Estética actual
Verdes oscuros, crema y beige, tipografía serif para los títulos, ilustración de un border
collie blanco y negro y textos cálidos ("Luke pone las ganas. Nosotros nos ponemos de acuerdo.").
Diseñada para computadora, con menú lateral; en el celular se ve como una versión achicada.

## 8. Problemas observados (para el rediseño)
- **Demasiada información**: tablas con 7 columnas, métricas, filtros y diagnósticos técnicos.
  Es mucho para alguien que no sabe de tecnología.
- **Notificaciones demasiado complejas**: permisos, pruebas, archivo .ics, alarma con la app
  abierta, Atajos/Automate con clave y una tabla de diagnóstico.
- **Acciones repartidas**: confirmar el paseo, pedir una excepción y proponer un intercambio
  están en lugares distintos.
- Secciones repetidas: Historial, Actividad y "Últimos paseos" del Resumen muestran casi lo mismo.
- No se ve un botón grande y obvio de **"Ya lo saqué"** cuando el paseo está pendiente
  (no se pudo verificar porque el paseo de hoy ya estaba hecho).
- Está pensada para escritorio, pero el uso real es en el celular.

## 9. Perfil SilHect (padre)
- Tiene el mismo menú, pero "Resumen" se llama **"Panel familiar"** ("Todo el equipo, a la vista").
- Además ve contadores de **excepciones de Augus**, **excepciones de Lucio** e **intercambios pendientes**.
- Es **solo lectura**: en el detalle del turno no tiene botones de excepción ni intercambio,
  y no aparece "Proponer intercambio".
- No tiene alarmas de paseo ("SilHect conserva los avisos familiares"). En la bandeja ve los avisos
  de **toda la familia**, con el nombre de cada uno.
- Puede exportar el CSV y descargar el calendario de Augus, de Lucio o de los dos.

## 10. Pendiente de relevar
- Pantalla del paseo de hoy en estado **pendiente** (el botón de confirmar). No se vio porque el
  paseo de hoy ya estaba confirmado.
