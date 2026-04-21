"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { Button } from "@/components/ui/button";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="icon"
      onClick={toggleTheme}
      className="relative"
      title={resolvedTheme === "light" ? "Bật Dark Mode" : "Bật Light Mode"}
      aria-label="Toggle theme"
    >
      {/* Sun icon */}
      <Sun
        className={`w-5 h-5 absolute transition-all duration-300 ${
          resolvedTheme === "light"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-0"
        }`}
      />
      {/* Moon icon */}
      <Moon
        className={`w-5 h-5 absolute transition-all duration-300 ${
          resolvedTheme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        }`}
      />
    </Button>
  );
}
