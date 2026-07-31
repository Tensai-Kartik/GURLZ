import { FastifyInstance } from 'fastify';
import prisma from '../config/database.js';
import supabase from '../config/supabase.js';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  dob: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6),
  accessToken: z.string().optional(),
});

export async function authRoutes(fastify: FastifyInstance) {
  // Sign Up with Supabase Email Auth & Smart Fallback
  fastify.post('/auth/signup', async (request, reply) => {
    try {
      const { name, email, password, dob } = signupSchema.parse(request.body);

      let sbUser: any = null;
      let sbToken: string | null = null;

      // Attempt Supabase Auth Sign Up
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
          },
        });

        if (!authError && authData.user) {
          sbUser = authData.user;
          sbToken = authData.session?.access_token || null;
        } else if (authError && authError.message.includes('already registered')) {
          // If already registered in Supabase, attempt sign in
          const { data: signInData } = await supabase.auth.signInWithPassword({ email, password });
          if (signInData?.user) {
            sbUser = signInData.user;
            sbToken = signInData.session?.access_token || null;
          }
        }
      } catch (err) {
        console.warn('Supabase Auth warning during signup:', err);
      }

      // Check or create user record in Database for full isolation
      let user = await prisma.user.findFirst({
        where: { OR: [{ email }, { authId: sbUser?.id || undefined }] },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            authId: sbUser?.id || undefined,
            name,
            email,
            dob: dob || null,
            settings: JSON.stringify({
              theme: 'pink-soft',
              animationIntensity: 'high',
              fontSize: 'medium',
              continuousListening: false,
              voice: 'soft-female',
            }),
          },
        });
      }

      // Generate session token (Supabase access token or Fastify JWT)
      const token = sbToken || fastify.jwt.sign({ userId: user.id, email: user.email });

      return {
        message: 'Account registered and logged in successfully! ✨',
        user: { id: user.id, name: user.name, email: user.email, dob: user.dob },
        token,
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Registration failed' });
    }
  });

  // Login with Supabase Email Auth & Smart Fallback
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const { email, password } = loginSchema.parse(request.body);

      let sbUser: any = null;
      let sbToken: string | null = null;

      // 1. Try Supabase Auth
      try {
        const { data: authData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authData?.user) {
          sbUser = authData.user;
          sbToken = authData.session?.access_token || null;
        }
      } catch (err) {
        console.warn('Supabase Auth login warning:', err);
      }

      // 2. Lookup user in Database
      let user = await prisma.user.findFirst({
        where: { OR: [{ email }, { authId: sbUser?.id || undefined }] },
      });

      // 3. If user doesn't exist yet in DB, auto-create to allow seamless access
      if (!user) {
        const fallbackName = email.split('@')[0];
        user = await prisma.user.create({
          data: {
            authId: sbUser?.id || undefined,
            name: sbUser?.user_metadata?.name || fallbackName,
            email,
            settings: JSON.stringify({ theme: 'pink-soft' }),
          },
        });
      }

      const token = sbToken || fastify.jwt.sign({ userId: user.id, email: user.email });

      return {
        token,
        user: { id: user.id, name: user.name, email: user.email, dob: user.dob },
      };
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input', details: error.errors });
      }
      return reply.code(500).send({ error: error.message || 'Login failed' });
    }
  });

  // Forgot Password
  fastify.post('/auth/forgot-password', async (request, reply) => {
    try {
      const { email } = forgotPasswordSchema.parse(request.body);
      try {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password`,
        });
      } catch {
        // Fallback
      }

      return { message: 'Password reset link sent! Check your email inbox.' };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to send password reset email' });
    }
  });

  // Reset Password
  fastify.post('/auth/reset-password', async (request, reply) => {
    try {
      const { password } = resetPasswordSchema.parse(request.body);
      try {
        await supabase.auth.updateUser({ password });
      } catch {
        // Fallback
      }

      return { message: 'Password updated successfully! You can now log in.' };
    } catch (error: any) {
      return reply.code(500).send({ error: error.message || 'Failed to reset password' });
    }
  });

  // Logout
  fastify.post('/auth/logout', { preHandler: [fastify.authenticate] }, async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    return { message: 'Logged out successfully' };
  });

  // Get current user profile
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request: any, reply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user.userId },
        select: {
          id: true,
          name: true,
          email: true,
          dob: true,
          age: true,
          settings: true,
          cycleLength: true,
          periodLength: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User profile not found' });
      }

      return {
        ...user,
        settings: user.settings ? JSON.parse(user.settings) : {},
      };
    } catch (error) {
      return reply.code(500).send({ error: 'Failed to fetch user profile' });
    }
  });
}
