"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth";
import { ThemeSync, useTheme } from "@/lib/theme";

function ThemedToaster() {
  const { resolved } = useTheme();
  return <Toaster position="bottom-right" richColors closeButton theme={resolved} />;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <ThemeSync />
      {/* once one tooltip is open, neighbours open instantly */}
      <Tooltip.Provider delayDuration={350} skipDelayDuration={400}>
        <AuthProvider>{children}</AuthProvider>
      </Tooltip.Provider>
      <ThemedToaster />
    </QueryClientProvider>
  );
}
