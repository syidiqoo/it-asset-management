"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.toggle("dark");
    try {
      window.localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {
      // localStorage bisa tidak tersedia (mode privat); abaikan.
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={toggleTheme}
      aria-label="Ganti tema terang atau gelap"
      title="Ganti tema terang / gelap"
    >
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  );
}
