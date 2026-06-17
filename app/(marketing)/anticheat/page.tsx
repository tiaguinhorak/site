import type { Metadata } from "next";
import { AnticheatPage } from "@/components/sections/anticheat-page";

export const metadata: Metadata = {
  title: "Anticheat — clutchclube",
  description:
    "Baixe o anticheat oficial do clutchclube para CS2. Leve, seguro e obrigatório para o modo competitivo.",
};

export default function Anticheat() {
  return <AnticheatPage />;
}
