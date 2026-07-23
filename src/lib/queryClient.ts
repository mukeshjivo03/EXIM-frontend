import { QueryClient } from "@tanstack/react-query";

/** Shared React Query client for the app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // HANA queries are relatively expensive; keep results fresh for a minute
      // and don't hammer the backend on window focus.
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
