import type { Metadata } from "next";
import { Anuphan, Newsreader } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";
import type { Lang } from "@/lib/i18n";

const anuphan = Anuphan({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin", "thai"],
  variable: "--font-anuphan",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "500"],
  variable: "--font-newsreader",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Style T-chai — แชร์ไอเดียแฟชั่น",
  description: "แพลตฟอร์มแชร์ไอเดียแฟชั่น outfit lookbook และเคล็ดลับการแต่งตัวจากชุมชน",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang: Lang = (await cookies()).get("lang")?.value === "en" ? "en" : "th";

  return (
    <html
      lang={lang}
      className={`${anuphan.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <Providers initialLang={lang}>
          <Navbar />
          <main className="flex-1">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
