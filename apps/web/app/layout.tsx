import type { Metadata } from "next";
import { LucideProvider } from "lucide-react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gerenciador de Arquivos",
  description:
    "Armazenamento de arquivos na nuvem, com um plano gratuito e planos pagos de espaço adicional.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Traço de 1,5px em todo ícone, como manda o design system. */}
        <LucideProvider strokeWidth={1.5}>{children}</LucideProvider>
      </body>
    </html>
  );
}
