/**
 * Next.js (via some transitive deps) still imports the deprecated built-in
 * `punycode` module. Node 22 prints a warning every time it is required.
 *
 * This preload script overrides Node's module loader so that any `punycode`
 * request resolves to the npm package (which is not deprecated) instead of the
 * core module. The logic runs before Next's CLI boots because we execute it via
 * `node --require`.
 */
const Module = require('module');

let userlandPunycodePath;
try {
  // `punycode/` points at the published npm entry (CommonJS)
  userlandPunycodePath = require.resolve('punycode/');
} catch (error) {
  // If the dependency ever disappears, fall back to the default loader so we
  // fail fast instead of silently changing behavior.
  console.warn('[punycode patch] Failed to resolve npm package:', error);
}

const load = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (
    userlandPunycodePath &&
    (request === 'punycode' || request === 'node:punycode')
  ) {
    return load.call(this, userlandPunycodePath, parent, isMain);
  }

  return load.apply(this, arguments);
};
