import type { ReactNode } from "react";
import { useHasPermission } from "@/hooks/useHasPermission";

type PermissionCheck = {
  resource: string;
  action?: string;
};

interface GuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  resource?: string;
  action?: string;
  anyOf?: PermissionCheck[];
  allOf?: PermissionCheck[];
}

export default function Guard({
  children,
  fallback = null,
  resource,
  action = "view",
  anyOf,
  allOf,
}: GuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useHasPermission();

  let allowed = true;

  if (resource) {
    allowed = hasPermission(resource, action);
  }

  if (allowed && anyOf && anyOf.length > 0) {
    allowed = hasAnyPermission(anyOf);
  }

  if (allowed && allOf && allOf.length > 0) {
    allowed = hasAllPermissions(allOf);
  }

  return <>{allowed ? children : fallback}</>;
}

