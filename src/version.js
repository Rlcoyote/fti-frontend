/* global __APP_VERSION__, __COMMIT_SHA__ */
// Single source of the app version shown in the UI (login screen + dashboard
// nav). The value is injected at build time by vite.config.js, extracted from
// the most recent `vXX.YY` commit subject — so it tracks every ship with no
// manual bump. The prior approach (two hand-kept string constants) drifted
// 59 versions stale and is exactly what this replaces.
//
// The typeof guard keeps a non-Vite context (e.g. a bare test runner that
// never applies the define) from throwing on the undefined global.
export const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";

export const APP_COMMIT = typeof __COMMIT_SHA__ === "string" ? __COMMIT_SHA__ : "unknown";
