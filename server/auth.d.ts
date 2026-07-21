export type UserRole = 'admin' | 'manager' | 'viewer';
export declare function hashPassword(password: string, salt?: string): {
    hash: string;
    salt: string;
};
export declare function verifyPassword(password: string, stored: string): boolean;
export declare function generateToken(): string;
/** Invalidate cache for a specific token (call on logout, role change, password change). */
export declare function invalidateAuthCache(token: string): void;
export declare function authenticateRequest(req: any): Promise<{
    userId: string;
    username: string;
    role: UserRole;
} | null>;
/**
 * Same single-query auth check, but returns must_change_password too.
 * Used by the global requirePasswordChanged middleware.
 */
export declare function authenticateRequestFull(token: string): Promise<{
    userId: string;
    role: UserRole;
    mustChangePassword: boolean;
} | null>;
export declare function requireAuth(req: any, res: any, next: any): void;
export declare function requireRole(...allowed: UserRole[]): (req: any, res: any, next: any) => any;
/**
 * Global middleware that blocks all API access (except auth/login/change-password)
 * when the authenticated user still has `must_change_password = true`.
 *
 * Performs its own token check so it works as a global middleware *before*
 * per-route requireAuth runs.  If no token is present, passes through silently.
 */
export declare function requirePasswordChanged(req: any, res: any, next: any): Promise<any>;
export declare function canWrite(userRole: UserRole): boolean;
export declare function canDelete(userRole: UserRole): boolean;
export declare function seedDefaultAdmin(): Promise<void>;
