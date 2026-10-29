import { OG_SIZE, ogCard } from "@/lib/ogCard";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Free betting odds calculator";

export default function Image() {
  return ogCard({ kicker: "Free tool", title: "Betting odds calculator: fair odds, margin, multi, boost & each-way", foot: "No sign-up needed · Quick Read" });
}
