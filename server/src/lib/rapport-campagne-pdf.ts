import PDFDocument from "pdfkit";

export interface RapportCampagneData {
  nom: string;
  dateDebut: string;
  dateFin: string;
  objectif: string;
  rapport: { marche: string; pas_marche: string; decisions: string } | null;
  kpiCibles: Record<string, unknown>;
  resultats: Record<string, unknown>;
  consolidation: {
    budget: { prevu: number; engage: number; reel: number; methode: string };
    reach_cumule: { valeur: number | null; methode: string };
    contenus_publies: { valeur: number | null; methode: string };
    sessions_attribuees: { valeur: number | null; methode: string };
    commandes_attribuees: { valeur: number | null; methode: string };
    ca_attribue: { valeur: number | null; methode: string };
    roas: { valeur: number | null; methode: string };
  };
}

/** Export PDF du rapport de fermeture de campagne (§4.3/§4.9) : rapport 3 champs + KPI + consolidation. */
export function genererRapportCampagnePdf(donnees: RapportCampagneData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 42, autoFirstPage: true });

  doc.fontSize(20).fillColor("#000").text(donnees.nom);
  doc.fontSize(10).fillColor("#666").text(`${donnees.dateDebut} - ${donnees.dateFin} — Objectif : ${donnees.objectif}`);
  doc.fillColor("#000").moveDown(1);

  function titreSection(texte: string) {
    doc.moveDown(0.6).fontSize(13).fillColor("#000").text(texte, { underline: true }).fontSize(10).moveDown(0.3);
  }

  titreSection("Rapport de campagne");
  if (donnees.rapport) {
    doc.font("Helvetica-Bold").text("Ce qui a marché :", { continued: false }).font("Helvetica").text(donnees.rapport.marche).moveDown(0.3);
    doc.font("Helvetica-Bold").text("Ce qui n'a pas marché :").font("Helvetica").text(donnees.rapport.pas_marche).moveDown(0.3);
    doc.font("Helvetica-Bold").text("Décisions :").font("Helvetica").text(donnees.rapport.decisions);
  } else {
    doc.text("Campagne non fermée — rapport non disponible.");
  }

  titreSection("KPI cibles vs résultats");
  const cles = Object.keys(donnees.kpiCibles);
  if (cles.length === 0) doc.text("Aucun KPI ciblé.");
  cles.forEach((cle) => {
    const cible = donnees.kpiCibles[cle];
    const resultat = donnees.resultats[cle];
    doc.text(`${cle} : cible ${String(cible)} — résultat ${resultat !== undefined ? String(resultat) : "—"}`);
  });

  titreSection("Consolidation");
  const c = donnees.consolidation;
  function ligne(label: string, chiffre: { valeur: number | null; methode: string }, unite = "") {
    doc.text(`${label} : ${chiffre.valeur === null ? "—" : `${chiffre.valeur}${unite}`} (${chiffre.methode})`);
  }
  doc.text(`Budget : prévu ${c.budget.prevu} DT — engagé ${c.budget.engage} DT — réel ${c.budget.reel} DT (${c.budget.methode})`);
  ligne("Reach cumulé", c.reach_cumule);
  ligne("Contenus publiés", c.contenus_publies);
  ligne("Sessions attribuées", c.sessions_attribuees);
  ligne("Commandes attribuées", c.commandes_attribuees);
  ligne("CA attribué", c.ca_attribue, " DT");
  ligne("ROAS", c.roas);

  doc.end();
  return doc;
}
