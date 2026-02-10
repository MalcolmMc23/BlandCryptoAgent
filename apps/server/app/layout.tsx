import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bland Crypto API",
  description: "API server for paper crypto trading demo"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
