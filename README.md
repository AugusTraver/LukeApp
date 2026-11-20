# LukeApp

**¿A quién le toca sacar al perro hoy?** Turnos de paseo para toda la familia: quién lo saca,
quién lo sacó, qué pasa si alguien no puede y avisos que no se pueden ignorar.

Gratis y para compartir: cualquier familia puede crear su grupo y sumar a los suyos con un código.

## Qué hace

- **Hoy**: a quién le toca, con un botón grande **“Ya lo saqué”** y otro de **“No puedo hoy”**.
- **Turnos**: los próximos días. Tocás uno para **“No puedo”** (pasa al instante a otro) o
  **cambiarlo por otro día** (el otro tiene que aceptar).
- **Historial**: qué pasó cada día, en frases, con paseos y faltas por persona.
- **Familia**: código para invitar, avisos, integrantes, reglas, “¿Cómo funciona?” y un juego.
- **Varios perros**: los que salen juntos comparten paseo; un perro que sale aparte tiene sus propios
  horarios y turnos (arriba se elige de cuál se ven).
- **Vacaciones o “no estoy”**: se cargan los días que alguien no está y sus turnos se reparten solos,
  sin contar como falta.
- **Reglas configurables**: horarios (uno o varios por día), días fijos por persona, orden de rotación.
- **Paseo de deuda**: si termina el día sin confirmar, quien faltó carga con el próximo paseo de otra persona.
- **Racha**: días seguidos sin faltas.
- **Avisos insistentes**: 10 min antes, a la hora y cada 5 minutos (con botones “Ya lo saqué / 10 min más”
  en la propia notificación); a los 100 minutos se avisa al resto y a los 160 minutos, a toda la familia.
- **Prepará tu celular**: guía para instalar la app (iPhone, Android, computadora), activar los avisos
  y mandarse uno de prueba antes del primer paseo.
- **Ingreso simple**: código de familia → elegís tu avatar → PIN de 4 números. El admin además tiene
  email, con “Olvidé mi contraseña”.
- **Sin conexión**: muestra lo último guardado y se actualiza sola cuando vuelve internet.
- **Salir o borrar**: cualquiera puede salir de la familia; el admin puede borrarla con todo su historial.

Especificación de la app anterior: [docs/especificacion-app-actual.md](docs/especificacion-app-actual.md) ·
Propuesta y decisiones: [docs/propuesta-rediseno.md](docs/propuesta-rediseno.md)

## Probarla ya (modo demo)

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 y entrá con el código **LUKE-4821** (familia de ejemplo). En modo demo
todo se guarda en ese navegador y no hay avisos push reales. Si ya tenés Supabase configurado,
`NEXT_PUBLIC_DEMO=1` fuerza el modo demo sin tocar los datos reales.

## Ponerla en marcha de verdad

1. **Supabase** (gratis): creá un proyecto en https://supabase.com.
   - SQL Editor → corré, en orden, los archivos de [`supabase/migrations/`](supabase/migrations/):
     `20261119000000_init.sql`, `20261120000000_dogs_absences_leave.sql`, `20261120010000_my_avatar.sql` y
     `20261120020000_service_role_grants.sql`.
   - Authentication → Sign In / Providers → activá **Allow anonymous sign-ins** (lo usan los
     miembros que entran con código + PIN) y desactivá **Confirm email** para que el admin entre al toque.
   - Authentication → URL Configuration → **Site URL** = la dirección de la app, y en **Redirect URLs**
     agregá `https://TU-APP.vercel.app/**` (y `http://localhost:3000/**` para probar). Sin esto,
     el enlace de “Olvidé mi contraseña” no vuelve a la app.
   - Para que el email de “Olvidé mi contraseña” llegue a cualquier familia, configurá un SMTP propio
     (Authentication → Emails → SMTP Settings; por ejemplo Resend, que es gratis). El correo que trae
     Supabase de fábrica solo manda a los integrantes de tu cuenta de Supabase y pocos por hora.
2. **Claves de avisos**: `npx web-push generate-vapid-keys`.
3. **Vercel** (gratis): importá el repo de GitHub y cargá las variables de [`.env.example`](.env.example).
4. **Cron de avisos**: en Supabase → SQL Editor corré [`supabase/cron.sql`](supabase/cron.sql)
   reemplazando solo la URL de Vercel (la clave la genera la base de datos).
5. Abrí la app en el celular, **creá tu familia** y compartí el código. La pantalla Hoy guía a cada
   persona para instalar la app y probar los avisos.

## Desarrollo

```bash
npm test        # lógica de turnos, vacaciones, varios perros, castigos, racha y plan de avisos
npm run lint
npm run build
```

- `src/lib/domain/` — lógica pura (sin React ni base de datos), con tests. `calendars.ts` arma la
  “vista” de cada grupo de perros; el resto de la lógica trabaja sobre esa vista.
- `src/lib/store/` — datos: `demo.ts` (localStorage) y `supabase.ts`.
- `src/components/` — pantallas.
- `src/app/api/` — `cron/tick` (avisos y castigos cada 5 min), `notify` (avisos inmediatos),
  `push/action` (botones de la notificación).
- `public/sw.js` — service worker de los avisos.
