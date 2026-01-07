"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type PageType = "home" | "log" | "history" | "avatar" | "ranking";

interface PageContextType {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<PageType>("home");

  return (
    <PageContext.Provider value={{ currentPage, setCurrentPage }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePage() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error("usePage must be used within a PageProvider");
  }
  return context;
}
