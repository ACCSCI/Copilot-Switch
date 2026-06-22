import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: () => <div className="p-8">404 - 页面不存在</div>,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </div>
  );
}
