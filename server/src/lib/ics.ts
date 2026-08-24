import type { taches, shootings } from "../db/schema.js";

type Tache = typeof taches.$inferSelect;
type Shooting = typeof shootings.$inferSelect;

function echapper(texte: string): string {
  return texte.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function plierLigne(ligne: string): string {
  // RFC 5545 : lignes repliées à 75 octets.
  if (ligne.length <= 75) return ligne;
  const morceaux: string[] = [];
  let reste = ligne;
  while (reste.length > 75) {
    morceaux.push(reste.slice(0, 75));
    reste = " " + reste.slice(75);
  }
  morceaux.push(reste);
  return morceaux.join("\r\n");
}

function dateJournee(iso: string): string {
  return iso.replace(/-/g, "");
}

function dateTimeUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

interface OptionsEvenement {
  campagneNom?: string;
  assignesNoms?: string[];
  lieu?: string | null;
  deepLink: string;
}

/** UID stable `tache-{uuid}@achirah-hq` (§4.6) — modifications propagées, zéro doublon. */
export function genererVevent(tache: Tache, shooting: Shooting | null, options: OptionsEvenement): string {
  const uid = `tache-${tache.id}@achirah-hq`;
  const resume = `[${tache.type}] ${tache.titre}`;
  const descriptionParties = [
    options.campagneNom ? `Campagne: ${options.campagneNom}` : null,
    options.assignesNoms?.length ? `Assignés: ${options.assignesNoms.join(", ")}` : null,
    options.lieu ? `Lieu: ${options.lieu}` : null,
    `Lien: ${options.deepLink}`,
  ].filter((v): v is string => !!v);

  const lignes = ["BEGIN:VEVENT", `UID:${uid}`];

  if (shooting) {
    const debut = new Date(`${tache.date_echeance}T09:00:00Z`);
    const fin = new Date(debut.getTime() + shooting.duree_min * 60 * 1000);
    lignes.push(`DTSTART:${dateTimeUtc(debut.toISOString())}`);
    lignes.push(`DTEND:${dateTimeUtc(fin.toISOString())}`);
  } else {
    lignes.push(`DTSTART;VALUE=DATE:${dateJournee(tache.date_echeance)}`);
  }

  const prefixe = tache.statut === "fait" ? "✓ " : "";
  lignes.push(`SUMMARY:${echapper(prefixe + resume)}`);
  lignes.push(`DESCRIPTION:${descriptionParties.map(echapper).join("\\n")}`);
  if (options.lieu) lignes.push(`LOCATION:${echapper(options.lieu)}`);
  lignes.push(`DTSTAMP:${dateTimeUtc(tache.updated_at)}`);
  lignes.push("END:VEVENT");

  return lignes.map(plierLigne).join("\r\n");
}

export function genererFluxIcs(vevents: string[]): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Achirah HQ//FR",
    "CALSCALE:GREGORIAN",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function genererIcsUnitaire(vevent: string, alarmeMoins24h = true): string {
  const lignes = vevent.split("\r\n");
  if (alarmeMoins24h) {
    lignes.splice(lignes.length - 1, 0, "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Rappel", "END:VALARM");
  }
  return genererFluxIcs([lignes.join("\r\n")]);
}
