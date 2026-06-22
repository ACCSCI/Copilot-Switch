import { createRoute } from '@tanstack/react-router';
import { AddProviderPage } from '@/pages/AddProviderPage';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/add',
  component: AddProviderPage,
});
