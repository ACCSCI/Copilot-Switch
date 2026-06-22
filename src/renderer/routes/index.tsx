import { createRoute } from '@tanstack/react-router';
import { HomePage } from '@/pages/HomePage';
import { Route as rootRoute } from './root';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});
