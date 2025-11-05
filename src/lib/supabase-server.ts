import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function createSupabaseServerClient() {
  const { getToken } = await auth();
  // Use the Clerk → Supabase Third-Party Auth token template when available
  // See SUPABASE_CLERK_SETUP.md
  let token: string | null = null;
  try {
    token = await getToken({ template: "supabase" });
  } catch (e) {
    // When the template is not configured, Clerk can throw (e.g. Not Found)
    token = null;
  }

  if (token) {
    // Use third-party auth token from Clerk (preferred)
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            cache: "no-store",
          });
        },
      },
    });
  }

  if (supabaseServiceRoleKey) {
    // Fallback: use service role on the server (bypasses RLS)
    return createClient(supabaseUrl, supabaseServiceRoleKey, {
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            cache: "no-store",
          });
        },
      },
    });
  }

  // Final fallback: unauthenticated anon client (will likely be blocked by RLS)
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          cache: "no-store",
        });
      },
    },
  });
}


