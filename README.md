# 🐾 LukeApp

**¿A quién le toca sacar al perro hoy?** Turnos de paseo para toda la familia: quién lo saca,
quién lo sacó, qué pasa si alguien no puede y avisos que no se pueden ignorar.

Gratis y para compartir: cualquier familia puede crear su grupo y sumar a los suyos con un código.

## Qué hace

- **Hoy**: a quién le toca, con un botón gigante **“✅ Ya lo saqué”** y otro de **“No puedo hoy”**.
- **Turnos**: los próximos días. Tocás uno para **“No puedo”** (pasa al instante a otro) o
  **cambiarlo por otro día** (el otro tiene que aceptar).
- **Historial**: qué pasó cada día, en frases, con paseos y faltas por persona.
- **Familia**: código para invitar, avisos, miembros, reglas, “¿Cómo funciona?” y un juego.
- **Reglas configurables**: horarios (uno o varios por día), días fijos por persona, orden de rotación.
- **Paseo de deuda** 🐾: si termina el día sin confirmar, quien faltó carga con el próximo paseo de otra persona.
- **Racha** 🔥: días seguidos sin faltas.
- **Avisos insistentes**: 10 min antes, a la hora y cada 5 minutos (con botones “Ya lo saqué / 10 min más”
  en la propia notificación); a los 100 minutos se avisa al resto y a los 160 minutos, a toda la familia.
- **Ingreso simple**: código de familia → elegís tu cara → PIN de 4 números. El admin además tiene email.

Especificación de la app anterior: [docs/especificacion-app-actual.md](docs/especificacion-app-actual.md) ·
Propuesta y decisiones: [docs/propuesta-rediseno.md](docs/propuesta-rediseno.md)

## Probarla ya (modo demo)

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 y entrá con el código **LUKE-4821** (familia de ejemplo). En modo demo
todo se guarda en ese navegador y no hay avisos push reales.

## Ponerla en marcha de verdad

1. **Supabase** (gratis): creá un proyecto en https://supabase.com.
   - SQL Editor → pegá y corré [`supabase/migrations/20261119000000_init.sql`](supabase/migrations/20261119000000_init.sql).
   - Authentication → Sign In / Providers → activá **Allow anonymous sign-ins** (lo usan los
     miembros que entran con código + PIN) y, si querés, desactivá “Confirm email” para que el admin entre al toque.
2. **Claves de avisos**: `npx web-push generate-vapid-keys`.
3. **Vercel** (gratis): importá el repo de GitHub y cargá las variables de [`.env.example`](.env.example).
4. **Cron de avisos**: en Supabase → SQL Editor corré [`supabase/cron.sql`](supabase/cron.sql)
   con la URL de Vercel y tu `CRON_SECRET`.
5. Abrí la app en el celular, **creá tu familia** y compartí el código.
   En iPhone: Safari → Compartir → **Agregar a inicio** (sin esto iOS no permite avisos).

## Desarrollo

```bash
npm test        # lógica de turnos, castigos, racha y plan de avisos
npm run lint
npm run build
```

- `src/lib/domain/` — lógica pura (sin React ni base de datos), con tests.
- `src/lib/store/` — datos: `demo.ts` (localStorage) y `supabase.ts`.
- `src/components/` — pantallas.
- `src/app/api/` — `cron/tick` (avisos y castigos cada 5 min), `notify` (avisos inmediatos),
  `push/action` (botones de la notificación).
- `public/sw.js` — service worker de los avisos.
