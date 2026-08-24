import type { Asset } from "@achirah/shared";
import { api } from "../api.js";

export const clientAssets = {
  parIds: (ids: string[]) => {
    if (ids.length === 0) return Promise.resolve([] as Asset[]);
    return api<{ donnees: Asset[] }>(`/assets?ids=${ids.join(",")}`).then((r) => r.donnees);
  },
};
