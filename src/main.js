/* eslint-disable no-debugger */
import Vue, { createApp, nextTick } from "vue";

import {
  getMatchedComponents,
  getMatchedComponentsInstances,
  flatMapComponents,
  setContext,
  getQueryDiff,
  globalHandleError,
} from "./utils.js";

import { createNuxtApp } from "./index.js";
import NuxtLink from "./components/nuxt-link.client.js"; // should be included after ./index.js
import NuxtChild from "./components/nuxt-child.js";
import Nuxt from "./components/nuxt.js";

function registerComponents(_app) {
  _app.component(NuxtChild.name, NuxtChild);
  _app.component(Nuxt.name, Nuxt);
  _app.component(NuxtLink.name, NuxtLink);
}

let app;
let router;
let store;

const NUXT = window.context || {};
const errorHandler = console.error;

createNuxtApp(null, NUXT.config)
  .then(mountApp)
  .catch(errorHandler);

async function loadAsyncComponents(to, from, next) {
  this._routeChanged = Boolean(app.nuxt.err) || from.name !== to.name;
  this._paramChanged = !this._routeChanged && from.path !== to.path;
  this._queryChanged = !this._paramChanged && from.fullPath !== to.fullPath;
  this._diffQuery = this._queryChanged
    ? getQueryDiff(to.query, from.query)
    : [];

  try {
    // Call next()
    next();
  } catch (error) {
    const err = error || {};
    const statusCode =
      err.statusCode ||
      err.status ||
      (err.response && err.response.status) ||
      500;
    const message = err.message || "";

    if (/^Loading( CSS)? chunk (\d)+ failed\./.test(message)) {
      window.location.reload(true);
      return;
    }

    this.error({ statusCode, message });
    // this.nuxt.$emit("routeChanged", to, from, err);
    next();
  }
}

async function render(to, from, next) {
  if (
    this._routeChanged === false &&
    this._paramChanged === false &&
    this._queryChanged === false
  ) {
    return next();
  }

  let nextCalled = false;
  const _next = (path) => {
    if (nextCalled) {
      return;
    }

    nextCalled = true;
    next(path);
  };

  // Update context
  await setContext(app, {
    route: to,
    from,
    next: _next.bind(this),
  });
  this._dateLastError = app.nuxt.dateErr;
  this._hadError = Boolean(app.nuxt.err);

  // Get route's matched components
  const matches = [];
  const Components = getMatchedComponents(to, matches);

  // If no Components matched, generate 404
  if (!Components.length) {
    // Show error page
    app.context.error({
      statusCode: 404,
      message: "messages.error_404",
    });
    return next();
  }

  try {
    // If not redirected
    if (!nextCalled) {
      next();
    }
  } catch (err) {
    const error = err || {};
    if (error.message === "ERR_REDIRECT") {
      // return this.nuxt.$emit("routeChanged", to, from, error);
    }
    globalHandleError(this, error);
    // this.nuxt.$emit("routeChanged", to, from, error);
    next();
  }
}

// Fix components format in matched, it's due to code-splitting of vue-router
function normalizeComponents(to) {
  flatMapComponents(to, (Component, _, match, key) => {
    if (typeof Component === "object" && !Component) {
      // Updated via vue-router resolveAsyncComponents()
      Component._Ctor = Component;
      match.components[key] = Component;
    }
    return Component;
  });
}

function checkForErrors(app) {
  // Hide error component if no error
  if (app._hadError && app._dateLastError === app.$options.nuxt.dateErr) {
    app.error();
  }
}
// When navigating on a different route but the same component is used, Vue.js
// Will not update the instance data, so we have to update $data ourselves
function fixPrepatch(to) {
  if (
    this._routeChanged === false &&
    this._paramChanged === false &&
    this._queryChanged === false
  ) {
    return;
  }

  const instances = getMatchedComponentsInstances(to);
  const Components = getMatchedComponents(to);

  let triggerScroll = "true";

  nextTick(() => {
    instances.forEach((instance, i) => {
      if (!instance || instance._isDestroyed) {
        return;
      }

      if (
        instance.constructor._dataRefresh &&
        Components[i] === instance.constructor &&
        instance.$vnode.data.keepAlive !== true &&
        typeof instance.constructor.options.data === "function"
      ) {
        const newData = instance.constructor.options.data.call(instance);
        for (const key in newData) {
          Vue.set(instance.$data, key, newData[key]);
        }

        triggerScroll = true;
      }
    });

    if (triggerScroll) {
      // Ensure to trigger scroll event after calling scrollBehavior
      nextTick(() => {
        window.nuxt.$emit("triggerScroll");
      });
    }

    checkForErrors(this);
  });
}

function nuxtReady(_app) {
  window.onNuxtReadyCbs.forEach((cb) => {
    if (typeof cb === "function") {
      cb(_app);
    }
  });
  // Special JSDOM
  if (typeof window._onNuxtLoaded === "function") {
    window._onNuxtLoaded(_app);
  }
  // Add router hooks
  router.afterEach((to, from) => {
    // Wait for fixPrepatch + $data updates
    nextTick(() => _app.nuxt.$emit("routeChanged", to, from));
  });
}

async function mountApp(__app) {
  // Set global variables
  app = __app.app;
  router = __app.router;
  store = __app.store;

  // Create Vue instance
  const _app = createApp(app);

  _app.use(router);
  _app.use(store);

  registerComponents(_app);

  // Mounts Vue app to DOM element
  const mount = () => {
    _app.mount("#__nuxt");

    // Add afterEach router hooks
    router.afterEach(normalizeComponents);

    router.afterEach(fixPrepatch.bind(_app));

    // Listen for first Vue update
    nextTick(() => {
      // Call window.{{globals.readyCallback}} callbacks
      nuxtReady(_app);
    });
  };

  // Initialize error handler
  _app.$loading = {}; // To avoid error while _app.$nuxt does not exist
  if (NUXT.error) {
    _app.error(NUXT.error);
  }

  // Add beforeEach router hooks
  router.beforeEach(loadAsyncComponents.bind(_app));
  router.beforeEach(render.bind(_app));

  // First render on client-side
  const clientFirstMount = () => {
    normalizeComponents(router.currentRoute, router.currentRoute);
    checkForErrors(_app);
    // Don't call fixPrepatch.call(_app, router.currentRoute, router.currentRoute) since it's first render
    mount();
  };

  // fix: force next tick to avoid having same timestamp when an error happen on spa fallback
  await new Promise((resolve) => setTimeout(resolve, 0));
  render.call(_app, router.currentRoute, router.currentRoute, (path) => {
    // If not redirected
    if (!path) {
      clientFirstMount();
      return;
    }

    // Add a one-time afterEach hook to
    // mount the app wait for redirect and route gets resolved
    const unregisterHook = router.afterEach(() => {
      unregisterHook();
      clientFirstMount();
    });

    // Push the path and let route to be resolved
    router.push(path, undefined, (err) => {
      if (err) {
        errorHandler(err);
      }
    });
  });
}
