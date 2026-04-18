import type { Metadata } from "next";
import type { ReactElement, ReactNode } from "react";

import "./globals.css";
import LayoutBody from "@components/LayoutBody";
import Providers from "@components/Providers";
import { auth } from "@root/auth";

export const metadata: Metadata = {
  title: "CWIS Preservation Pipeline Dashboard",
  description: "Operational dashboard for CWIS preservation pipeline documents, reviews, and failures.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>): Promise<ReactElement> {
  await auth();

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Work+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <LayoutBody>{children}</LayoutBody>
        </Providers>
      </body>
    </html>
  );
}