export const TEMPLATE_VARIABLES = [
  { key: "$firstname", label: "First name" },
  { key: "$lastname", label: "Last name" },
  { key: "$fullname", label: "First + last name" },
] as const;

export function fillTemplate(text: string, r: { first_name: string; last_name: string }): string {
  const v: Record<string, string> = {
    firstname: r.first_name, lastname: r.last_name, fullname: `${r.first_name} ${r.last_name}`.trim(),
  };
  return text.replace(/\$(firstname|lastname|fullname)\b/gi, (_, k: string) => v[k.toLowerCase()] ?? "");
}
