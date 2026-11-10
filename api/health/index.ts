/**
 * 健康检查 API - 用于诊断问题
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pingDatabase } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const envVars = {
        POSTGRES_URL: !!process.env.POSTGRES_URL,
        POSTGRES_URL_NO_SSL: !!process.env.POSTGRES_URL_NO_SSL,
        DATABASE_URL: !!process.env.DATABASE_URL,
        POSTGRES_HOST: !!process.env.POSTGRES_HOST,
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        GETNOTES_TOKEN: !!process.env.GETNOTES_TOKEN,
        JWT_SECRET: !!process.env.JWT_SECRET,
    };

    // 尝试连接数据库
    let dbStatus = 'not_tested';

    const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NO_SSL
        || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;

    if (connectionString) {
        try {
            await pingDatabase();
            dbStatus = 'connected';
        } catch {
            dbStatus = 'error';
        }
    } else {
        dbStatus = 'no_connection_string';
    }

    return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
            database: dbStatus === 'connected' ? 'ok' : 'error',
            ai: envVars.GEMINI_API_KEY ? 'configured' : 'missing',
            auth: envVars.JWT_SECRET ? 'configured' : 'missing',
        },
    });
}

