import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { type NextAuthOptions, getServerSession } from 'next-auth';
import EmailProvider from 'next-auth/providers/email';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { createTransport } from 'nodemailer';

const emailServer = process.env.EMAIL_SERVER;
const emailFrom = process.env.EMAIL_FROM ?? 'no-reply@local.test';

const transport = emailServer
  ? createTransport(emailServer)
  : createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'database' },
  providers: [
    EmailProvider({
      from: emailFrom,
      sendVerificationRequest: async ({ identifier, url }) => {
        const result = await transport.sendMail({
          to: identifier,
          from: emailFrom,
          subject: 'Tu acceso a Triskelium Life',
          text: `Accedé con este enlace: ${url}`,
        });
        if (process.env.NODE_ENV !== 'production') {
          console.info('Email de verificación enviado', result.message?.toString());
        }
      },
    }),
  ],
  pages: {
    signIn: '/sign-in',
  },
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id;
      }
      return session;
    },
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = (user as { id: string }).id;
      }
      return token;
    },
  },
};

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authOptions.providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const getAuthSession = () => getServerSession(authOptions);
