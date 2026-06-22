/**
 * 路由表（手写 + addChildren）
 */
import { Route as rootRoute } from './routes/root';
import { Route as indexRoute } from './routes/index';
import { Route as addRoute } from './routes/add';
import { Route as editRoute } from './routes/edit.$id';

export const routeTree = rootRoute.addChildren([
  indexRoute,
  addRoute,
  editRoute,
]);
