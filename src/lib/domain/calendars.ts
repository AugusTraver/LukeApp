// Varios perros por familia. Los perros que comparten calendario salen juntos; un perro que
// sale aparte tiene su propio calendario. Toda la lógica de turnos trabaja sobre una "vista"
// de un calendario, así que no necesita saber que hay varios.
import type { Calendar, Dog, Family, FamilyData } from "./types";
import { MAIN } from "./types";

export const calOf = (x: { calendarId?: string }) => x.calendarId ?? MAIN;

/** Todos los calendarios: el principal (guardado en los campos de la familia) y los extra. */
export function allCalendars(f: Family): Calendar[] {
  const main: Calendar = { id: MAIN, walkTimes: f.walkTimes, fixedDays: f.fixedDays, rotation: f.rotation, rotationAnchor: f.rotationAnchor };
  return [main, ...(f.calendars ?? []).filter((c) => c.id !== MAIN)];
}

export function allDogs(f: Family): Dog[] {
  const cals = new Set(allCalendars(f).map((c) => c.id));
  const dogs = (f.dogs ?? []).filter((d) => d.name.trim());
  if (dogs.length === 0) return [{ id: "dog-1", name: f.dogName, coat: f.dogCoat, calendarId: MAIN }];
  return dogs.map((d) => (cals.has(d.calendarId) ? d : { ...d, calendarId: MAIN }));
}

/** "Luke", "Luke y Mora", "Luke, Mora y Tito" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

/** Calendarios con al menos un perro, en orden (el principal primero). */
export function activeCalendars(f: Family): { calendar: Calendar; dogs: Dog[]; name: string }[] {
  const dogs = allDogs(f);
  return allCalendars(f)
    .map((calendar) => {
      const ds = dogs.filter((d) => d.calendarId === calendar.id);
      return { calendar, dogs: ds, name: joinNames(ds.map((d) => d.name)) };
    })
    .filter((c) => c.dogs.length > 0 || c.calendar.id === MAIN);
}

/** Los datos de la familia vistos desde un calendario. */
export function calendarView(data: FamilyData, calendarId: string = MAIN): FamilyData {
  const f = data.family;
  const cals = activeCalendars(f);
  const c = cals.find((x) => x.calendar.id === calendarId) ?? cals[0];
  const id = c.calendar.id;
  const mine = <T extends { calendarId?: string }>(xs: T[]) => xs.filter((x) => calOf(x) === id);
  return {
    ...data,
    family: {
      ...f,
      calendarId: id,
      dogName: c.name || f.dogName,
      dogCoat: c.dogs[0]?.coat ?? f.dogCoat,
      walkTimes: c.calendar.walkTimes,
      fixedDays: c.calendar.fixedDays,
      rotation: c.calendar.rotation,
      rotationAnchor: c.calendar.rotationAnchor,
      startDate: c.calendar.startDate && c.calendar.startDate > f.startDate ? c.calendar.startDate : f.startDate,
    },
    overrides: mine(data.overrides),
    swaps: mine(data.swaps),
    confirmations: mine(data.confirmations),
  };
}

/** Coats de los perros de la vista (para dibujarlos juntos). */
export function viewCoats(f: Family): string[] {
  const id = f.calendarId ?? MAIN;
  const coats = allDogs(f)
    .filter((d) => d.calendarId === id)
    .map((d) => d.coat);
  return coats.length ? coats : [f.dogCoat];
}

/**
 * Arma la familia para guardar a partir de calendarios y perros.
 * El principal vuelve a los campos de siempre; los demás van a `calendars`.
 * Se descartan calendarios sin perros.
 */
export function withCalendars(f: Family, calendars: Calendar[], dogs: Dog[]): Family {
  const main = calendars.find((c) => c.id === MAIN) ?? allCalendars(f)[0];
  const used = new Set(dogs.map((d) => d.calendarId));
  const extra = calendars.filter((c) => c.id !== MAIN && used.has(c.id));
  const mainDog = dogs.find((d) => d.calendarId === MAIN) ?? dogs[0];
  const { calendarId: _view, ...rest } = f;
  void _view;
  return {
    ...rest,
    dogName: mainDog?.name ?? f.dogName,
    dogCoat: mainDog?.coat ?? f.dogCoat,
    walkTimes: main.walkTimes,
    fixedDays: main.fixedDays,
    rotation: main.rotation,
    rotationAnchor: main.rotationAnchor,
    calendars: extra,
    dogs: dogs.map((d) => (d.calendarId === MAIN || extra.some((c) => c.id === d.calendarId) ? d : { ...d, calendarId: MAIN })),
  };
}

/** Familia "guardable" a partir de cualquier vista. */
export function storedFamily(f: Family): Family {
  return withCalendars(f, allCalendars(f), allDogs(f));
}

/** Suma o saca a alguien de los turnos de todos los calendarios. */
export function setWalksEverywhere(f: Family, memberId: string, walks: boolean): Family {
  const cals = allCalendars(f).map((c) => {
    const inRotation = c.rotation.includes(memberId);
    if (walks && !inRotation) return { ...c, rotation: [...c.rotation, memberId] };
    if (!walks) return { ...c, rotation: c.rotation.filter((x) => x !== memberId), fixedDays: c.fixedDays.map((x) => (x === memberId ? null : x)) };
    return c;
  });
  return withCalendars(f, cals, allDogs(f));
}

export function removeMemberEverywhere(f: Family, memberId: string): Family {
  return setWalksEverywhere(f, memberId, false);
}

/** Calendario nuevo con las mismas reglas que otro. Empieza a contar desde `startDate` (hoy). */
export function newCalendarFrom(base: Calendar, id: string, startDate?: string): Calendar {
  return { ...base, id, walkTimes: [...base.walkTimes], fixedDays: [...base.fixedDays], rotation: [...base.rotation], ...(startDate ? { startDate } : {}) };
}
