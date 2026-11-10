import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Anuphan, JetBrains_Mono, Unbounded } from "next/font/google";
import "../globals.css";
import { ParticleField } from "@/components/ParticleField";
import { getDictionary, hasLocale, locales } from "./dictionaries";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
});

const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: { languages: { th: "/th", en: "/en" } },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();

  return (
    <html
      lang={lang}
      data-scroll-behavior="smooth"
      className={`${unbounded.variable} ${anuphan.variable} ${jetbrains.variable}`}
    >
      <body>
        <ParticleField />
        {children}
      </body>
    </html>
  );
}
