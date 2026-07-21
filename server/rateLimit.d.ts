import { Request, Response, NextFunction } from 'express';
export declare function rateLimit({ windowMs, max, message, }?: {
    windowMs?: number;
    max?: number;
    message?: string;
}): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
