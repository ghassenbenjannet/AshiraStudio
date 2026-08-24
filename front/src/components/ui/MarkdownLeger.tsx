import { Fragment } from "react";

/** Rendu du markdown léger (§4.5 : gras **texte** + sauts de ligne) — jamais d'innerHTML (§8.3). */
export function MarkdownLeger({ texte }: { texte: string }) {
  const lignes = texte.split("\n");
  return (
    <>
      {lignes.map((ligne, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {ligne.split(/(\*\*[^*]+\*\*)/g).map((morceau, j) =>
            morceau.startsWith("**") && morceau.endsWith("**") ? <strong key={j}>{morceau.slice(2, -2)}</strong> : <Fragment key={j}>{morceau}</Fragment>,
          )}
        </Fragment>
      ))}
    </>
  );
}
