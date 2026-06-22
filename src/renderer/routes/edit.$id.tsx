import { createRoute } from '@tanstack/react-router';
import { EditProviderPage } from '@/pages/EditProviderPage';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/edit/$id',
  component: EditProviderPage,
});
