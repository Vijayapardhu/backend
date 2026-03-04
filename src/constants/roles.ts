export enum UserRole {
  USER = 'USER',
  VENDOR = 'VENDOR',
  ADMIN = 'ADMIN',
}

export const ROLE_HIERARCHY = {
  [UserRole.ADMIN]: 3,
  [UserRole.VENDOR]: 2,
  [UserRole.USER]: 1,
} as const;

export const ROLE_PERMISSIONS = {
  [UserRole.USER]: [
    'read:properties',
    'read:temples',
    'create:bookings',
    'read:bookings:own',
    'update:bookings:own',
    'create:reviews',
    'read:wishlist',
    'create:wishlist',
    'delete:wishlist',
  ],
  [UserRole.VENDOR]: [
    'read:properties',
    'read:temples',
    'create:properties',
    'read:properties:own',
    'update:properties:own',
    'delete:properties:own',
    'read:bookings:own',
    'update:bookings:own',
    'read:dashboard:own',
  ],
  [UserRole.ADMIN]: [
    'read:all',
    'create:all',
    'update:all',
    'delete:all',
    'approve:vendors',
    'approve:properties',
    'manage:users',
    'read:analytics',
  ],
} as const;

export const hasPermission = (
  role: UserRole,
  permission: string
): boolean => {
  const permissions: readonly string[] = ROLE_PERMISSIONS[role] || [];
  return (
    permissions.includes('read:all') ||
    permissions.includes('create:all') ||
    permissions.includes('update:all') ||
    permissions.includes('delete:all') ||
    permissions.includes(permission)
  );
};
