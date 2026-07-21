import type { Request, Response, NextFunction } from 'express';
/**
 * Lightweight request-body validation without adding a new dependency.
 * For each required field, checks that it exists and is not an empty string.
 * Returns a 400 with the list of missing fields if validation fails.
 */
export declare function requireFields(fields: string[]): (req: Request, res: Response, next: NextFunction) => void;
/** Basic guard so IDs used in path params look sane before hitting the DB. */
export declare function requireIdParam(paramName?: string): (req: Request, res: Response, next: NextFunction) => void;
/** Wraps an async route handler so thrown errors reach Express's error handler
 *  instead of crashing the process or hanging the request. */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
