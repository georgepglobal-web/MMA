"use client";

import { PageProvider } from "../contexts/PageContext";
import Navigation from "./Navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageProvider>
      <Navigation />
      <main>{children}</main>
    </PageProvider>
  );
}
