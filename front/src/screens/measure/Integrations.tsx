import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PLATEFORME_INTEGRATION, type Integration } from "@achirah/shared";
import { Dialog } from "../../components/ui/Dialog.js";
import { Champ, ChampTexte, BoutonPrimaire, BoutonSecondaire } from "../../components/ui/Champ.js";
import { useToast } from "../../lib/toast-context.js";
import { ApiError } from "../../lib/api.js";
import { clientIntegrations } from "../../lib/resources/mesure.js";

const CHAMPS_PAR_PLATEFORME: Record<string, string[]> = {
  shopify: ["boutique", "access_token"],
  meta: ["access_token"],
  tiktok: ["access_token", "advertiser_id"],
  ga4: ["access_token", "property_id"],
};

const COULEUR_STATUT: Record<string, string> = { connectee: "text-olive", deconnectee: "text-dim", erreur: "text-danger-fg" };

export function Integrations() {
  const { t } = useTranslation();
  const { toaster } = useToast();
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [dialogue, setDialogue] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [enCours, setEnCours] = useState(false);

  const charger = () => clientIntegrations.lister().then(setIntegrations);
  useEffect(() => {
    charger();
  }, []);

  function statutDe(plateforme: string): Integration | undefined {
    return integrations?.find((i) => i.plateforme === plateforme);
  }

  async function connecter() {
    if (!dialogue) return;
    setEnCours(true);
    try {
      await clientIntegrations.connecter(dialogue, credentials);
      setDialogue(null);
      setCredentials({});
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    } finally {
      setEnCours(false);
    }
  }

  async function sync(id: string) {
    try {
      await clientIntegrations.sync(id);
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  async function deconnecter(id: string) {
    try {
      await clientIntegrations.deconnecter(id);
      charger();
    } catch (err) {
      toaster(err instanceof ApiError ? err.message : t("commun.erreur_generique"), { type: "erreur" });
    }
  }

  return (
    <div>
      <p className="mb-4 text-sm text-dim">{t("mesure.integrations.prerequis")}</p>
      <div className="flex flex-col gap-2">
        {PLATEFORME_INTEGRATION.map((plateforme) => {
          const integration = statutDe(plateforme);
          return (
            <div key={plateforme} className="rounded-card border border-line bg-panel p-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-off">{t(`mesure.plateformes.${plateforme}`)}</span>
                <span className={`text-xs font-medium ${COULEUR_STATUT[integration?.statut ?? "deconnectee"]}`}>{t(`mesure.integrations.statuts.${integration?.statut ?? "deconnectee"}`)}</span>
              </div>
              {integration?.derniere_erreur && <p className="mb-2 text-xs text-danger-fg">{integration.derniere_erreur}</p>}
              {integration?.dernier_sync && <p className="mb-2 text-xs text-dim">{t("mesure.integrations.dernier_sync")} : {new Date(integration.dernier_sync).toLocaleString()}</p>}
              <div className="flex gap-2">
                {!integration || integration.statut === "deconnectee" ? (
                  <BoutonSecondaire type="button" onClick={() => setDialogue(plateforme)}>
                    {t("mesure.integrations.connecter")}
                  </BoutonSecondaire>
                ) : (
                  <>
                    <BoutonSecondaire type="button" onClick={() => void sync(integration.id)}>
                      {t("mesure.integrations.sync")}
                    </BoutonSecondaire>
                    <BoutonSecondaire type="button" onClick={() => void deconnecter(integration.id)}>
                      {t("mesure.integrations.deconnecter")}
                    </BoutonSecondaire>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog ouvert={!!dialogue} onFermer={() => setDialogue(null)} titre={dialogue ? t(`mesure.plateformes.${dialogue}`) : ""}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void connecter();
          }}
        >
          {dialogue &&
            CHAMPS_PAR_PLATEFORME[dialogue]!.map((champ) => (
              <Champ key={champ} label={t(`mesure.integrations.champs.${champ}`)}>
                <ChampTexte required value={credentials[champ] ?? ""} onChange={(e) => setCredentials((c) => ({ ...c, [champ]: e.target.value }))} />
              </Champ>
            ))}
          <div className="mt-4 flex justify-end gap-2">
            <BoutonSecondaire type="button" onClick={() => setDialogue(null)}>
              {t("commun.annuler")}
            </BoutonSecondaire>
            <BoutonPrimaire type="submit" disabled={enCours}>
              {t("mesure.integrations.connecter")}
            </BoutonPrimaire>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
