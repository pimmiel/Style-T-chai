import { getServerSession as nextAuthGetServerSession } from "next-auth";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import LineProvider from "next-auth/providers/line";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import EmailProvider from "next-auth/providers/email";
import { SupabaseAdapter } from "@auth/supabase-adapter";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase";

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

export const authOptions: NextAuthOptions = {
  providers: [
    // Production email/password via bcrypt
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        if (!hasSupabase) return null;
        const db = supabaseAdmin();
        const { data: user } = await db
          .schema("next_auth")
          .from("users")
          .select("id, name, email, image")
          .eq("email", creds.email)
          .single();
        if (!user) return null;
        const { data: credential } = await db
          .from("user_credentials")
          .select("password_hash")
          .eq("user_id", user.id)
          .single();
        if (!credential) return null;
        const ok = await bcrypt.compare(creds.password, credential.password_hash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),

    ...(process.env.GOOGLE_CLIENT_ID ? [GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })] : []),
    ...(process.env.LINE_CLIENT_ID ? [LineProvider({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET!,
    })] : []),
    ...(process.env.FACEBOOK_CLIENT_ID ? [FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    })] : []),
    ...(process.env.APPLE_ID ? [AppleProvider({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET!,
    })] : []),
    ...(hasSupabase && process.env.EMAIL_SERVER ? [EmailProvider({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM ?? "noreply@styletchai.com",
    })] : []),
  ],

  // JWT strategy works with both OAuth and CredentialsProvider.
  // Supabase adapter still stores users/accounts for OAuth; sessions are JWT tokens.
  session: { strategy: "jwt" as const },

  ...(hasSupabase
    ? {
        adapter: SupabaseAdapter({
          url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        }),
      }
    : {}),

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in `user` is populated; persist id into token
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? token.sub ?? "";
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth/signin",
  },
};

export function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}
