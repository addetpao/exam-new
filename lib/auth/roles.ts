import type { Database } from "../database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

/**
 * Role hierarchy and permissions
 */
export const ROLE_HIERARCHY = {
  admin: 3,
  content_editor: 2,
  user: 1,
} as const;

/**
 * Role permissions mapping
 */
export const ROLE_PERMISSIONS = {
  admin: [
    "manage_users",
    "manage_content",
    "manage_exams",
    "view_analytics",
    "access_admin_panel",
    "manage_subscriptions",
  ],
  content_editor: ["manage_content", "manage_exams", "view_basic_analytics"],
  user: ["take_exams", "view_progress", "manage_profile"],
} as const;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission as any);
}

/**
 * Check if user role meets minimum required role
 */
export function meetsRoleRequirement(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Get all roles that are equal or higher than the given role
 */
export function getEqualOrHigherRoles(role: UserRole): UserRole[] {
  const roleLevel = ROLE_HIERARCHY[role];

  return (Object.entries(ROLE_HIERARCHY) as [UserRole, number][])
    .filter(([_, level]) => level >= roleLevel)
    .map(([roleName]) => roleName);
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames = {
    admin: "Administrator",
    content_editor: "Content Editor",
    user: "User",
  };

  return displayNames[role] || role;
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions = {
    admin: "Full system access with user and content management capabilities",
    content_editor: "Can create and manage exam content and questions",
    user: "Can take exams and track progress",
  };

  return descriptions[role] || "";
}

/**
 * Validate role value
 */
export function isValidRole(role: string): role is UserRole {
  return Object.keys(ROLE_HIERARCHY).includes(role);
}
