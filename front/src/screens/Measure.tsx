import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Campagne } from "@achirah/shared";
import { Tabs } from "../components/ui/Tabs.js";
import { clientCampagnes } from "../lib/resources/campagnes.js";
import { clientPlateformesContenu, clientCanaux } from "../lib/resources/referentiels.js";
import { NiveauMesure, type ChampKpi } from "./measure/NiveauMesure.js";
import { ConsolidationCampagne } from "./measure/ConsolidationCampagne.js";
import { Integrations } from "./measure/Integrations.js";

const CHAMPS_SOCIAL: ChampKpi[] = [
  { cle: "followers", label: "Followers" },
  { cle: "reach", label: "Reach" },
  { cle: "vues", label: "Vues" },
  { cle: "engagement", label: "Engagement (%)" },
  { cle: "saves", label: "Saves" },
  { cle: "shares", label: "Shares" },
];
const CHAMPS_PAID: ChampKpi[] = [
  { cle: "spend", label: "Spend (DT)" },
  { cle: "cpm", label: "CPM" },
  { cle: "ctr", label: "CTR (%)" },
  { cle: "cpc", label: "CPC" },
  { cle: "cac", label: "CAC" },
  { cle: "conversions", label: "Conversions" },
];
const CHAMPS_SITE: ChampKpi[] = [
  { cle: "sessions", label: "Sessions" },
  { cle: "conversion", label: "Taux de conversion (%)" },
  { cle: "commandes", label: "Commandes" },
  { cle: "ca_dt", label: "CA (DT)" },
  { cle: "aov", label: "AOV (DT)" },
  { cle: "taux_confirmation_cod", label: "Confirmation COD (%)" },
  { cle: "taux_retour", label: "Taux de retour (%)" },
];

/** MEASURE (E27) — Social/Paid/Site en mode manuel ou connecté, consolidation par campagne, Intégrations (E28). */
export function Measure() {
  const { t } = useTranslation();
  const [onglet, setOnglet] = useState<"social" | "paid" | "site" | "consolidation" | "integrations">("social");
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [plateformesSocial, setPlateformesSocial] = useState<{ valeur: string; label: string }[]>([]);
  const [canauxPaid, setCanauxPaid] = useState<{ valeur: string; label: string }[]>([]);

  useEffect(() => {
    clientCampagnes.lister().then(setCampagnes);
    clientPlateformesContenu.lister().then((liste) => setPlateformesSocial(liste.map((p) => ({ valeur: p.nom.toLowerCase(), label: p.nom }))));
    clientCanaux.lister().then((liste) =>
      setCanauxPaid(liste.filter((c) => c.nom.toLowerCase().includes("ads")).map((c) => ({ valeur: c.nom.toLowerCase().replace(/\s+/g, "_"), label: c.nom }))),
    );
  }, []);

  return (
    <div>
      <Tabs
        valeur={onglet}
        onChange={setOnglet}
        onglets={[
          { id: "social", label: t("mesure.onglets.social") },
          { id: "paid", label: t("mesure.onglets.paid") },
          { id: "site", label: t("mesure.onglets.site") },
          { id: "consolidation", label: t("mesure.onglets.consolidation") },
          { id: "integrations", label: t("mesure.onglets.integrations") },
        ]}
      />
      {onglet === "social" && <NiveauMesure plateformes={plateformesSocial} champs={CHAMPS_SOCIAL} campagnes={campagnes} />}
      {onglet === "paid" && <NiveauMesure plateformes={canauxPaid.length ? canauxPaid : [{ valeur: "meta_ads", label: "Meta Ads" }, { valeur: "tiktok_ads", label: "TikTok Ads" }]} champs={CHAMPS_PAID} campagnes={campagnes} />}
      {onglet === "site" && <NiveauMesure plateformes={[{ valeur: "shopify", label: "Shopify" }]} champs={CHAMPS_SITE} campagnes={campagnes} />}
      {onglet === "consolidation" && <ConsolidationCampagne campagnes={campagnes} />}
      {onglet === "integrations" && <Integrations />}
    </div>
  );
}
