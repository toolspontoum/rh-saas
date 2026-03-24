import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "VV Consulting - Web",
  description: "Painel operacional"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

