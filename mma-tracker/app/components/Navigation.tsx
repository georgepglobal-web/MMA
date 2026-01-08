"use client";

import { useState } from "react";
import { usePage, type PageType } from "../contexts/PageContext";

interface NavItem {
  label: string;
  page: PageType;
}

const navItems: NavItem[] = [
  { label: "Home", page: "home" },
  { label: "Log Session", page: "log" },
  { label: "History", page: "history" },
  { label: "Avatar Evolution", page: "avatar" },
  { label: "Group Ranking", page: "ranking" },
];

export default function Navigation() {
  const { currentPage, setCurrentPage } = usePage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 dark:bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-black/60">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-black dark:text-white">
              FightMate
            </h1>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-1">
            {navItems.map((item) => {
              const isActive = currentPage === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => setCurrentPage(item.page)}
                  className={`
                    px-4 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    }
                  `}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Mobile Navigation Button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 pb-4 pt-4">
            <div className="flex flex-col space-y-1">
              {navItems.map((item) => {
                const isActive = currentPage === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => {
                      setCurrentPage(item.page);
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      px-4 py-2 rounded-md text-base font-medium text-left transition-colors
                      ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                      }
                    `}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
