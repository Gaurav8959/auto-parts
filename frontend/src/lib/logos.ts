"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import { get } from "./api";
import { useAuth } from "./auth";
import type { Logos } from "./types";

export const LOGOS_KEY = ["logos"];

// Logos are large and rarely change, so they're fetched once per session and kept until a logo is
// saved (which invalidates LOGOS_KEY), instead of riding along on every settings or shop response
export function useLogos() {
  const { status } = useAuth();
  const { data } = useQuery({
    queryKey: LOGOS_KEY,
    queryFn: () => get<Logos>("/settings/logos"),
    enabled: status === "authenticated",
    staleTime: Infinity,
  });

  const shopLogo = useCallback(
    (shopId?: number | null) => (shopId && data?.shops.find((s) => s.id === shopId)?.logo) || null,
    [data]
  );
  return { business: data?.business || null, shopLogo };
}
