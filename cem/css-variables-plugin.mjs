import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const MANIFEST_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'component-variables.manifest.json',
);

/**
 * Injects the component's `--ms-*` theming surface into the CEM declaration as
 * `cssProperties`, sourced from `component-variables.manifest.json` (the single
 * source of truth for the variable API — 300+ entries; hand-annotating each as a
 * `@cssproperty` JSDoc tag would duplicate it and drift).
 *
 * The editor-integration generators (`customElementVsCodePlugin` /
 * `customElementJetBrainsPlugin`) run AFTER this in the `plugins` array and read
 * `cssProperties`, so populating it here is what fills `vscode.css-custom-data.json`
 * (previously an empty stub) and adds the variables to `web-types.json`.
 *
 * Only `componentVariables` (the `--ms-*` API this component owns) are emitted —
 * not `baseVariables` (upstream `--base-*` framework inputs shared across
 * components and documented at the framework level).
 */
export function cssVariablesFromManifestPlugin() {
  return {
    name: 'ms-css-variables-from-manifest',
    packageLinkPhase({ customElementsManifest }) {
      const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
      const cssProperties = (manifest.componentVariables ?? []).map((v) => ({
        name: `--${v.name}`,
        description: v.usage,
      }));
      if (!cssProperties.length) return;

      for (const mod of customElementsManifest.modules ?? []) {
        for (const decl of mod.declarations ?? []) {
          if (decl.customElement) {
            // Manifest is the source of truth — replace, don't merge, so a
            // removed variable can't linger from a prior run's declaration.
            decl.cssProperties = cssProperties;
          }
        }
      }
    },
  };
}
