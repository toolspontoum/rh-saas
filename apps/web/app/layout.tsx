import "./globals.css";
import type { ReactNode } from "react";

import { PLATFORM_NAME } from "../lib/brand";

export const metadata = {
  title: `${PLATFORM_NAME} - Web`,
  description: "Painel operacional"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

