import { redirect } from "next/navigation";
import { isBetaMode } from "@/lib/beta-mode";
import BetaRequestForm from "./BetaRequestForm";

export const dynamic = "force-dynamic";

export default function RequestAccessPage() {
  if (!isBetaMode) {
    redirect("/signup");
  }

  return <BetaRequestForm />;
}
