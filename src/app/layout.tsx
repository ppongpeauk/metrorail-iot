import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MotionProvider } from "@/components/providers/motion-provider";
import { QueryProvider } from "@/components/providers/query-provider";

const metroHelvetica = localFont({
  src: [
    {
      path: "../assets/fonts/Helvetica.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Helvetica-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-helvetica",
  display: "swap"
});

const metroHelveticaCondensed = localFont({
  src: [
    {
      path: "../assets/fonts/Helvetica-Condensed.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../assets/fonts/Helvetica-Medium-Condensed.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../assets/fonts/Helvetica-Condensed-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-helvetica-condensed",
  display: "swap",
});

const metroHelveticaCondensedMedium = localFont({
  src: "../assets/fonts/Helvetica-Medium-Condensed.ttf",
  variable: "--font-helvetica-condensed-medium",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WMATA IoT",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${metroHelvetica.variable} ${metroHelveticaCondensed.variable} ${metroHelveticaCondensedMedium.variable} dark`}
    >
      <body className="font-sans">
        <QueryProvider>
          <MotionProvider>{children}</MotionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
