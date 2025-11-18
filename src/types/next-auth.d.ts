declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      email?: string | null;
      name?: string | null;
      role?: string;
    };
  }

  interface User {
    role?: string;
  }

  export type NextAuthOptions = import("next-auth/core/types").AuthOptions;
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    email?: string;
    username?: string;
  }
}
