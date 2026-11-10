"use client";

import { Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import type { Permission } from "@/lib/permissions";
import { Card } from "../ui/card";
import { Empty } from "../ui/empty";

// Renders children only when the user holds one of the permissions (or is admin when adminOnly)
export function Guard({
  permissions,
  adminOnly,
  children,
}: {
  permissions?: Permission[];
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  const { can, isAdmin } = useAuth();
  const allowed = adminOnly ? isAdmin : !permissions || can(...permissions);

  if (!allowed) {
    return (
      <Card>
        <Empty
          icon={<Lock />}
          title="You don't have access to this page"
          description="Ask the admin to turn on the permission for your account."
        />
      </Card>
    );
  }
  return <>{children}</>;
}
