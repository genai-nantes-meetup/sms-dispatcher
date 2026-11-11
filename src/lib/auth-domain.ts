export const ALLOWED_DOMAINS = ["samuel-berthe.fr", "explorethevault.ai"];
export const RESTRICTED_MSG =
  "This app is restricted to @samuel-berthe.fr and @explorethevault.ai accounts.";
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  return ALLOWED_DOMAINS.includes(parts[1].toLowerCase());
}
