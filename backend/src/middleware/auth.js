import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import supabase from '../config/supabase.js';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
export async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }
        const token = authHeader.split(' ')[1];
        let userId = null;
        let email = null;
        let authId = null;
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.userId;
            email = decoded.email;
        }
        catch {
            // Fallback to Supabase authentication token check
            const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
            if (error || !sbUser) {
                return res.status(401).json({ error: 'Invalid authentication token' });
            }
            authId = sbUser.id;
            email = sbUser.email || '';
            let dbUser = await prisma.user.findFirst({
                where: { OR: [{ authId: sbUser.id }, { email: sbUser.email || '' }] }
            });
            if (!dbUser && sbUser.email) {
                dbUser = await prisma.user.create({
                    data: {
                        authId: sbUser.id,
                        email: sbUser.email,
                        name: sbUser.user_metadata?.name || sbUser.email.split('@')[0],
                        settings: JSON.stringify({ theme: 'pink-soft', animationIntensity: 'high', fontSize: 'medium' }),
                    }
                });
            }
            if (dbUser) {
                userId = dbUser.id;
            }
        }
        if (!userId) {
            return res.status(401).json({ error: 'User not found in system' });
        }
        req.user = {
            userId,
            email: email || '',
            authId: authId || undefined,
        };
        next();
    }
    catch (err) {
        return res.status(401).json({ error: 'Unauthorized access' });
    }
}
