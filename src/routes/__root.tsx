import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-black text-accent glow-cyan">404</h1>
        <h2 className="mt-4 text-xl">Signal lost</h2>
        <p className="mt-2 text-sm text-muted-foreground font-mono">
          The route you tried to reach is not in the topology.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm bg-accent px-4 py-2 text-sm font-bold uppercase tracking-widest text-black transition hover:brightness-110"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-display tracking-widest text-accent-2">System fault</h1>
        <p className="mt-2 text-sm text-muted-foreground font-mono">
          A runtime error interrupted the simulation.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-sm bg-accent px-4 py-2 text-sm font-bold uppercase tracking-widest text-black hover:brightness-110"
          >
            Retry
          </button>
          <a href="/" className="rounded-sm border border-border bg-panel px-4 py-2 text-sm font-bold uppercase tracking-widest hover:border-accent">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NetRouteX — Interactive Network Routing Simulator" },
      { name: "description", content: "Build networks, run Dijkstra, BFS, DFS and Bellman-Ford, and watch shortest-path routing come alive. A DSA teaching simulator." },
      { name: "author", content: "NetRouteX" },
      { property: "og:title", content: "NetRouteX — Interactive Network Routing Simulator" },
      { property: "og:description", content: "Build networks, run Dijkstra, BFS, DFS and Bellman-Ford, and watch shortest-path routing come alive. A DSA teaching simulator." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "NetRouteX — Interactive Network Routing Simulator" },
      { name: "twitter:description", content: "Build networks, run Dijkstra, BFS, DFS and Bellman-Ford, and watch shortest-path routing come alive. A DSA teaching simulator." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/e3048a71-fcf7-4956-8d5f-0737710db0c8" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/e3048a71-fcf7-4956-8d5f-0737710db0c8" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
