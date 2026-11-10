"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { get, SHOP_KEY } from "./api";
import { useAuth } from "./auth";
import { useStoredValue } from "./storage";
import type { Shop } from "./types";

// Which shop the screens are working on.
// Managers: always their own shop. Admin: a chosen shop, or "all" for the business overview.
export function useShopScope() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [stored, setStored] = useStoredValue<string>(SHOP_KEY, "all");

  const { data: shops = [] } = useQuery({
    queryKey: ["shops"],
    queryFn: () => get<Shop[]>("/shop"),
    enabled: !!user,
    staleTime: 60_000,
  });

  const selected = isAdmin ? shops.find((s) => String(s.id) === stored) || null : null;
  const currentShop = isAdmin ? selected : shops[0] || (user?.shop as Shop | undefined) || null;
  const isAll = isAdmin && !selected;

  // Every list, total and report depends on the shop, so switching drops all cached data
  // (except the shop list and logos, which are the same whichever shop is selected)
  const setScope = useCallback(
    (shopId: number | "all") => {
      setStored(String(shopId));
      qc.resetQueries({ predicate: (query) => !["shops", "logos"].includes(String(query.queryKey[0])) });
    },
    [setStored, qc]
  );

  return useMemo(
    () => ({ shops, currentShop, isAll, isAdmin, setScope }),
    [shops, currentShop, isAll, isAdmin, setScope]
  );
}

// ---- "Which shop?" prompt -------------------------------------------------
// askForShop(run) shows the picker (hosted once in the app shell); after a shop is chosen,
// the scope switches to it and `run` continues the action.
type Pending = { action: string; run: () => void } | null;
let pending: Pending = null;
const pendingListeners = new Set<() => void>();

const setPending = (next: Pending) => {
  pending = next;
  pendingListeners.forEach((l) => l());
};

export const shopPrompt = {
  subscribe: (l: () => void) => {
    pendingListeners.add(l);
    return () => pendingListeners.delete(l);
  },
  get: () => pending,
  close: () => setPending(null),
};

// Runs `run` straight away inside a shop; in the admin's all-shops view asks which shop first
export function useShopAction() {
  const { isAll } = useShopScope();
  return useCallback((action: string, run: () => void) => (isAll ? setPending({ action, run }) : run()), [isAll]);
}
