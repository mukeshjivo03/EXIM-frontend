import { useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

type PermissionCheck = {
  resource: string;
  action?: string;
};

const RESOURCE_ALIASES: Record<string, string[]> = {
  domesticcontract: ["domesticcontracts"],
  domesticcontracts: ["domesticcontract"],
  domesticreport: ["domesticreports"],
  domesticreports: ["domesticreport"],
  director_inventory: ["director_inventorty", "directorinventory", "directorinventorty"],
  director_inventorty: ["director_inventory", "directorinventory", "directorinventorty"],
  directorinventory: ["director_inventory", "director_inventorty", "directorinventorty"],
  directorinventorty: ["director_inventory", "director_inventorty", "directorinventory"],
  director_report: ["directorreport"],
  directorreport: ["director_report"],
};

export function useHasPermission() {
  const { permissions } = useAuth();

  const hasPermission = useCallback(
    (resource: string, action = "view"): boolean => {
      const normalizedAction = action.toLowerCase();
      const resourcesToCheck = [resource, ...(RESOURCE_ALIASES[resource] ?? [])];
      const fallbackActionsForView = ["sync", "fetch"];

      return resourcesToCheck.some((key) => {
        const actions = permissions[key];
        if (!actions) return false;
        const normalizedActions = actions.map((a) => a.toLowerCase());
        if (normalizedActions.includes(normalizedAction)) return true;
        if (normalizedAction === "view") {
          return fallbackActionsForView.some((fallbackAction) =>
            normalizedActions.includes(fallbackAction)
          );
        }
        return false;
      });
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
