import { redirect } from "next/navigation";

export default function LegacyPremiumRedirect() {
  redirect("/dashboard/planos");
}
