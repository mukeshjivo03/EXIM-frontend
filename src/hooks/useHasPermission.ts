import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

type PermissionCheck = {
  resource: string;
  action?: string;
};

export function useHasPermission() {
  const { permissions } = useAuth();

  const hasPermission = useCallback(
    (resource: string, action = "view"): boolean => {
      const actions = permissions[resource];
      if (!actions) return false;
      return actions.map((a) => a.toLowerCase()).includes(action.toLowerCase());
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (checks: PermissionCheck[]): boolean =>
      checks.some((check) => hasPermission(check.resource, check.action ?? "view")),
    [hasPermission]
  );

  const hasAllPermissions = useCallback(
    (checks: PermissionCheck[]): boolean =>
      checks.every((check) => hasPermission(check.resource, check.action ?? "view")),
    [hasPermission]
  );

  return { hasPermission, hasAnyPermission, hasAllPermissions };
}

