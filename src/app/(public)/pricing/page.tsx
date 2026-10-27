import { redirect } from "next/navigation";

// The plan is shown on the landing page; keep /pricing as a friendly link to it.
export default function PricingPage() {
  redirect("/#pricing");
}
