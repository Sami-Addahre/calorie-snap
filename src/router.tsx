import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function FullPagePending() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-surface px-8 py-10 text-center shadow-sm">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-lime border-t-transparent" role="status" />
        <p className="text-sm font-medium text-foreground">Sto caricando la tua sessione...</p>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: FullPagePending,
    defaultPendingMinMs: 100,
  });

  return router;
};
