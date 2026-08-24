import { TachesBoard } from "./TachesBoard.js";

export function OngletTachesCampagne({ campagneId, campagneNom }: { campagneId: string; campagneNom: string }) {
  return <TachesBoard campagneId={campagneId} campagneNom={campagneNom} />;
}
