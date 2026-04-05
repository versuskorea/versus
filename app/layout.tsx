import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VERSUS",
  description: "세상의 모든 A vs B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, background: '#F5F5F5' }}>
        {children}
      </body>
    </html>
  );
}