import { createBrowserClient } from "@supabase/ssr";
import { createMockClient } from "./mock-client";

const isLocal =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project");

// Singleton: return the same instance to avoid infinite re-render loops
// when used inside React components with useCallback/useEffect dependencies.
let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (cachedClient) return cachedClient;

  if (isLocal) {
    cachedClient = createMockClient() as unknown as ReturnType<typeof createBrowserClient>;
  } else {
    cachedClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  return cachedClient;
}
