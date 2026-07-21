import { cookies } from "next/headers";
import { translations } from "./translations";

export type { Lang } from "./translations";
export { translations } from "./translations";
export type { Translations } from "./translations";

export async function getLang(): Promise<"th" | "en"> {
  const c = await cookies();
  return c.get("lang")?.value === "en" ? "en" : "th";
}

export function getT(lang: "th" | "en") {
  return translations[lang];
}
