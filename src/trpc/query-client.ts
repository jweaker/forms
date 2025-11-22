import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // Increased to 60 seconds for better caching
        gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
        refetchOnWindowFocus: false, // Reduce unnecessary refetches
        refetchOnMount: false, // Don't refetch on component mount if data exists
        retry: 1, // Reduce retry attempts for faster failure feedback
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
