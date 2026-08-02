import { createCsrfMiddleware, createStart } from "@tanstack/react-start";
import { cookieWriteGuard } from "~/lib/cache";

const csrf = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  requestMiddleware: [csrf, cookieWriteGuard],
}));
