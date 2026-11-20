# LukeApp 2.0 — Propuesta de rediseño

## ✅ Decisiones tomadas (19/11/2026)
- Funciones nuevas de la v1: **recordatorio insistente**, **racha de Luke** y **castigo por paseo no realizado**.
- Ingreso: **cara + PIN** de 4 números.
- Estética: **cálida naranja**.
- Tecnología: **Next.js + Supabase + Vercel**, instalable como PWA, con Web Push.

- **Sin migración**: el historial anterior no se importa.
- **Multifamilia**: cualquier familia puede usarla. No se vende, se presta a amigos y otras familias.
- **Alarmas**: por ahora no hay alarma con sonido; en su lugar, notificaciones **casi imposibles de ignorar**.

### Familias (grupos) — todo configurable
- **Registrarse**: el administrador crea su cuenta con email y contraseña (sirve para recuperarla).
- **Crear familia**: nombre de la familia, nombre y foto del perro, y **horarios de paseo**
  (uno o varios por día; por ejemplo, 17:20).
- **Miembros**, cada uno con un rol:
  - **Admin**: configura todo. Puede ser también paseador.
  - **Paseador**: entra en la rotación de turnos.
  - **Observador**: solo mira y recibe avisos de faltas (como SilHect).
- **Invitar**: el admin comparte un **link o código de familia** (por ejemplo, `LUKE-4821`). En su
  celular, cada uno entra con el código, elige su cara y crea su PIN de 4 números.
- **Reglas de turnos configurables**:
  - **Días fijos**: cada día de la semana puede tener un paseador fijo (por ejemplo, lunes Augus).
  - **Días que rotan**: se reparten en orden entre los paseadores que rotan (A, B, C, A, B…),
    siguiendo de una semana a la otra. Con 2 personas y 5 días rotativos da exactamente la
    regla actual (el orden se invierte cada semana).
  - Activar o desactivar el castigo, la racha y los avisos insistentes.
- **La familia de Augus** se crea primero: Augus (admin y paseador), Lucio (paseador),
  SilHect (observador), perro Luke, paseo a las 17:20, lunes fijo Augus, martes fijo Lucio.

### Notificaciones imposibles de ignorar
- **17:10**: "En 10 minutos, Luke te espera".
- **17:20**: aviso con vibración larga, fijo en pantalla y con los botones **"✅ Ya lo saqué"** y
  **"⏰ 10 min más"**, que funcionan desde la notificación.
- **Cada 5 minutos** se repite (reemplazando el anterior para no llenar la bandeja) hasta que confirme o posponga.
- **18:00**: aviso insistente al responsable. **19:00**: se le pide al resto de los paseadores que lo
  cubran. **20:00**: aviso al admin y los observadores.
- **Fin del día sin confirmar**: se aplica el castigo y se avisa a todos.
- La activación es **un solo interruptor**, con una pantalla de ayuda si el teléfono bloquea los avisos.

### Castigo por paseo no realizado (confirmado)
Si termina el día y el responsable no confirmó el paseo:
- **Paseo de deuda**: el próximo turno del otro hermano pasa al que falló, y el otro tiene ese día libre.
  No hay compensación. Se ve en el calendario con la etiqueta "Deuda 🐾".
- La **racha de Luke** vuelve a cero y la app muestra a Luke triste con el nombre de quien falló ("Luke se quedó esperando…").
- SilHect recibe un aviso y el fallo queda en un **contador del mes** ("Faltas: Lucio 1").
- Si el responsable avisa "No puedo" **antes** de las 17:20, no hay castigo: es una excepción normal.

## Idea central
**Una pantalla, una pregunta: "¿A quién le toca hoy?"** y un botón gigante para responderla.
Todo lo demás queda un toque más abajo. Pensada primero para el celular y para gente que
no sabe de tecnología.

## Qué se mantiene igual
- El algoritmo de turnos: lunes Augus, martes Lucio y de miércoles a domingo alternan, con el
  orden invertido cada semana.
- Las excepciones ("no puedo", el turno pasa al otro al instante) y los intercambios (el otro tiene que aceptar).
- El registro de quién lo sacó y a qué hora, y el estado "No realizado (sin confirmación)".
- Los avisos de las 17:10 y las 17:20.
- SilHect como perfil que mira todo.
- El tono cálido, Luke como protagonista y los minijuegos.

## Navegación nueva (3 pestañas abajo, como cualquier app de celular)
| Pestaña | Contenido |
|---|---|
| 🐾 **Hoy** | Tarjeta enorme con la foto o dibujo de Luke, a quién le toca y el estado. Botones grandes: **"✅ Ya lo saqué"** y **"No puedo hoy"**. Abajo, "Mañana le toca a…". |
| 📅 **Turnos** | Lista simple de los próximos 14 días ("Vie 20 · Lucio"). Al tocar un día: "Cambiar este día" (intercambio o excepción en un solo lugar). Arriba aparece un cartel si hay un intercambio esperando tu respuesta: **[Aceptar] [No puedo]**. |
| 📖 **Historial** | Línea de tiempo en lenguaje natural: "Miércoles 18 · Lucio lo sacó a las 17:19 ✅", "Martes 17 · Nadie confirmó ⚠️". Arriba, un resumen del mes en una frase: "Este mes: Augus 12 paseos, Lucio 9". |

Lo que sale del menú principal: Actividad (se une al Historial), Excepciones (se resuelve desde
el día), la tabla de 7 columnas y el diagnóstico de notificaciones.

## Simplificaciones
- **"Ya lo saqué"** también funciona desde la notificación, sin abrir la app (si el teléfono lo permite).
- **Un solo flujo para cambiar un día**: "¿Qué pasó?" → *No puedo (que lo cubra el otro)* o
  *Quiero cambiarlo por otro día*. Lunes y martes solo muestran la primera opción.
- **Notificaciones**: un solo interruptor "Avisarme" con una explicación de una línea.
  El .ics, Atajos/Automate y el diagnóstico pasan a una sección "Avanzado" escondida.
- **Inicio de sesión más fácil**: elegir tu cara o avatar y escribir un PIN de 4 números, en lugar de usuario
  y contraseña. La sesión queda guardada.
- **Instalable en el celular** (PWA): el ícono de Luke en la pantalla de inicio, como una app.
- Letra grande, alto contraste, textos cortos sin palabras técnicas y nada de tablas.

## Funciones nuevas (para elegir)
1. **Racha de Luke** 🔥: "Luke lleva 12 días seguidos paseando". Motiva sin presionar.
2. **Recordatorio insistente**: si a las 18:00 sigue sin confirmar, le avisa otra vez al responsable;
   a las 19:00, al otro hermano ("¿Lo podés sacar vos?"), y a las 20:00, a SilHect.
3. **Nota del paseo**: al confirmar, un toque opcional para elegir cómo le fue (😄 normal,
   💩 hizo todo, 🐕 se cruzó con otro perro, 🌧️ corto por lluvia) y una foto opcional.
4. **Resumen semanal para SilHect**: los domingos, un mensaje con "Esta semana: 7 de 7 paseos ✅".
5. **Vacaciones / días fuera**: marcar con anticipación "del 3 al 10 no estoy", y la app los
   reasigna sola y lo compensa después.
6. **Más paseos por día** (opcional): por ejemplo, uno a la mañana, si algún día hace falta.

## Estética propuesta
Más luminosa y amigable: fondo crema cálido, acentos naranja y terracota (como la pelota de Luke)
con el verde como color secundario, esquinas muy redondeadas, botones grandes, tipografía redondeada
(por ejemplo, Nunito) y Luke ilustrado con distintas poses según el estado (esperando con la correa,
feliz después del paseo, triste si nadie lo sacó).

## Tecnología sugerida
- **Next.js + TypeScript** como app web instalable (PWA), para que ande en cualquier celular sin tienda de apps.
- **Supabase** (base de datos, inicio de sesión y funciones programadas para los avisos y para
  cerrar el día como "No realizado").
- Notificaciones **Web Push**.
- Hosting en **Vercel**. Gratis para este uso.
- Código en GitHub: AugusTraver/LukeApp.
