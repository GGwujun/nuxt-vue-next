import { createRouter, createWebHistory } from "vue-router";
import Home from "./pages/Home.vue";
import User from "./pages/User.vue";
export const routerOptions = {
  history: createWebHistory(),
  base: "./",
  routes: [
    { path: "/", name: "home ", components: { default: Home } },
    { path: "/user", name: "user ", components: { default: User } },
  ],
};

export function createRouterNuxt() {
  const router = createRouter(routerOptions);
  return router;
}
