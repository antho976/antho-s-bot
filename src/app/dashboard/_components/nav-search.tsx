"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/** Shares the nav search query between the top-bar input and the sidebar results. */
const Ctx = createContext<{ query: string; setQuery: (q: string) => void } | null>(null);

export function NavSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return <Ctx.Provider value={{ query, setQuery }}>{children}</Ctx.Provider>;
}

export function useNavSearch() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useNavSearch must be used within NavSearchProvider");
  return ctx;
}
