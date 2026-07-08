import type { Portal } from "./db";

export type Visibility = "private" | "shared" | "public";
export type EditScope = "owner" | "members";

export const VISIBILITIES: Visibility[] = ["private", "shared", "public"];
export const EDIT_SCOPES: EditScope[] = ["owner", "members"];

// shared_with（カンマ区切りのuser_no）を配列にする
export function parseSharedWith(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function canViewPortal(portal: Portal, userNo: string): boolean {
  if (portal.userNo === userNo) return true;
  if (portal.visibility === "public") return true;
  if (portal.visibility === "shared") {
    return parseSharedWith(portal.sharedWith).includes(userNo);
  }
  return false;
}

export function canEditPortal(portal: Portal, userNo: string): boolean {
  if (portal.userNo === userNo) return true;
  return portal.editScope === "members" && canViewPortal(portal, userNo);
}
