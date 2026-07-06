import type { Metadata } from "next";
import "./globals.css";
import AppThemeProvider from "@/components/AppThemeProvider";

export const metadata: Metadata = {
  title: "webportal - メモボード",
  description: "リンクメモ・画像・リッチテキストを自由に配置できるメモボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppThemeProvider>{children}</AppThemeProvider>
      </body>
    </html>
  );
}
