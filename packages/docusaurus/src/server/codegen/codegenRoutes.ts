/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import query from 'querystring';
import _ from 'lodash';
import {docuHash, simpleHash, escapePath, generate} from '@docusaurus/utils';
import type {
  Module,
  RouteConfig,
  RouteModules,
  ChunkNames,
  RouteChunkNames,
} from '@docusaurus/types';

type RoutesCode = {
  /** Serialized routes config that can be directly emitted into temp file. */
  routesConfig: string;
  /** @see {ChunkNames} */
  routesChunkNames: RouteChunkNames;
  /**
   * A map from chunk name to module paths. Module paths would have backslash
   * escaped already, so they can be directly printed.
   */
  registry: {
    [chunkName: string]: string;
  };
};

/** Indents every line of `str` by one level. */
function indent(str: string) {
  return `  ${str.replace(/\n/g, `\n  `)}`;
}

const chunkNameCache = new Map<string, string>();
const chunkNameCount = new Map<string, number>();

/**
 * Generates a unique chunk name that can be used in the chunk registry.
 *
 * @param modulePath A path to generate chunk name from. The actual value has no
 * semantic significance.
 * @param prefix A prefix to append to the chunk name, to avoid name clash.
 * @param preferredName Chunk names default to `modulePath`, and this can supply
 * a more human-readable name.
 * @param shortId When `true`, the chunk name would only be a hash without any
 * other characters. Useful for bundle size. Defaults to `true` in production.
 */
export function genChunkName(
  modulePath: string,
  prefix?: string,
  preferredName?: string,
  shortId: boolean = process.env.NODE_ENV === 'production',
): string {
  let chunkName = chunkNameCache.get(modulePath);
  if (!chunkName) {
    if (shortId) {
      chunkName = simpleHash(modulePath, 8);
    } else {
      let str = modulePath;
      if (preferredName) {
        const shortHash = simpleHash(modulePath, 3);
        str = `${preferredName}${shortHash}`;
      }
      const name = docuHash(str);
      chunkName = prefix ? `${prefix}---${name}` : name;
    }
    const seenCount = (chunkNameCount.get(chunkName) ?? 0) + 1;
    if (seenCount > 1) {
      chunkName += seenCount.toString(36);
    }
    chunkNameCache.set(modulePath, chunkName);
    chunkNameCount.set(chunkName, seenCount);
  }
  return chunkName;
}

/**
 * Takes a piece of route config, and serializes it into raw JS code. The shape
 * is the same as react-router's `RouteConfig`. Formatting is similar to
 * `JSON.stringify` but without all the quotes.
 */
function serializeRouteConfig({
  routePath,
  routeHash,
  exact,
  subroutesCodeStrings,
  props,
}: {
  routePath: string;
  routeHash: string;
  exact?: boolean;
  subroutesCodeStrings?: string[];
  props: {[propName: string]: unknown};
}) {
  const parts = [
    `path: '${routePath}'`,
    `component: ComponentCreator('${routePath}', '${routeHash}')`,
  ];

  if (exact) {
    parts.push(`exact: true`);
  }

  if (subroutesCodeStrings) {
    parts.push(
      `routes: [
${indent(subroutesCodeStrings.join(',\n'))}
]`,
    );
  }

  Object.entries(props).forEach(([propName, propValue]) => {
    const isIdentifier =
      /^[$_\p{ID_Start}][$\u200c\u200d\p{ID_Continue}]*$/u.test(propName);
    const key = isIdentifier ? propName : JSON.stringify(propName);
    parts.push(`${key}: ${JSON.stringify(propValue)}`);
  });

  return `{
${indent(parts.join(',\n'))}
}`;
}

const isModule = (value: unknown): value is Module =>
  typeof value === 'string' ||
  (typeof value === 'object' &&
    // eslint-disable-next-line no-underscore-dangle
    !!(value as {[key: string]: unknown} | null)?.__import);

/**
 * Takes a {@link Module} (which is nothing more than a path plus some metadata
 * like query) and returns the string path it represents.
 */
function getModulePath(target: Module): string {
  if (typeof target === 'string') {
    return target;
  }
  const queryStr = target.query ? `?${query.stringify(target.query)}` : '';
  return `${target.path}${queryStr}`;
}

/**
 * Takes a route module (which is a tree of modules), and transforms each module
 * into a chunk name. It also mutates `res.registry` and registers the loaders
 * for each chunk.
 *
 * @param routeModule One route module to be transformed.
 * @param prefix Prefix passed to {@link genChunkName}.
 * @param name Preferred name passed to {@link genChunkName}.
 * @param res The route structures being loaded.
 */
function genChunkNames(
  routeModule: RouteModules,
  prefix: string,
  name: string,
  res: RoutesCode,
): ChunkNames;
function genChunkNames(
  routeModule: RouteModules | RouteModules[] | Module,
  prefix: string,
  name: string,
  res: RoutesCode,
): ChunkNames | ChunkNames[] | string;
function genChunkNames(
  routeModule: RouteModules | RouteModules[] | Module,
  prefix: string,
  name: string,
  res: RoutesCode,
): string | ChunkNames | ChunkNames[] {
  if (isModule(routeModule)) {
    // This is a leaf node, no need to recurse
    const modulePath = getModulePath(routeModule);
    const chunkName = genChunkName(modulePath, prefix, name);
    res.registry[chunkName] = escapePath(modulePath);
    return chunkName;
  }
  if (Array.isArray(routeModule)) {
    return routeModule.map((val, index) =>
      genChunkNames(val, `${index}`, name, res),
    );
  }
  return _.mapValues(routeModule, (v, key) => genChunkNames(v, key, name, res));
}

/**
 * This is the higher level overview of route code generation. For each route
 * config node, it returns the node's serialized form, and mutates `registry`,
 * `routesPaths`, and `routesChunkNames` accordingly.
 */
function genRouteCode(routeConfig: RouteConfig, res: RoutesCode): string {
  const {
    path: routePath,
    component,
    modules = {},
    context,
    routes: subroutes,
    priority,
    exact,
    ...props
  } = routeConfig;

  if (typeof routePath !== 'string' || !component) {
    throw new Error(
      `Invalid route config: path must be a string and component is required.
${JSON.stringify(routeConfig)}`,
    );
  }

  const routeHash = simpleHash(JSON.stringify(routeConfig), 3);
  res.routesChunkNames[`${routePath}-${routeHash}`] = {
    // Avoid clash with a prop called "component"
    ...genChunkNames({__comp: component}, 'component', component, res),
    ...(context &&
      genChunkNames({__context: context}, 'context', routePath, res)),
    ...genChunkNames(modules, 'module', routePath, res),
  };

  return serializeRouteConfig({
    routePath: routePath.replace(/'/g, "\\'"),
    routeHash,
    subroutesCodeStrings: subroutes?.map((r) => genRouteCode(r, res)),
    exact,
    props,
  });
}

/**
 * Routes are prepared into three temp files:
 *
 * - `routesConfig`, the route config passed to react-router. This file is kept
 * minimal, because it can't be code-splitted.
 * - `routesChunkNames`, a mapping from route paths (hashed) to code-splitted
 * chunk names.
 * - `registry`, a mapping from chunk names to options for react-loadable.
 */
export function generateRoutesCode(routeConfigs: RouteConfig[]): RoutesCode {
  const res: RoutesCode = {
    // To be written by `genRouteCode`
    routesConfig: '',
    routesChunkNames: {},
    registry: {},
  };

  // `genRouteCode` would mutate `res`
  const routeConfigSerialized = routeConfigs
    .map((r) => genRouteCode(r, res))
    .join(',\n');

  res.routesConfig = `import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
${indent(routeConfigSerialized)},
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
`;

  return res;
}

const genRegistry = ({
  generatedFilesDir,
  registry,
}: {
  generatedFilesDir: string;
  registry: RoutesCode['registry'];
}) =>
  generate(
    generatedFilesDir,
    'registry.js',
    `export default {
${Object.entries(registry)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(
    ([chunkName, modulePath]) =>
      // modulePath is already escaped by escapePath
      `  "${chunkName}": [() => import(/* webpackChunkName: "${chunkName}" */ "${modulePath}"), "${modulePath}", require.resolveWeak("${modulePath}")],`,
  )
  .join('\n')}};
`,
  );

const genRoutesChunkNames = ({
  generatedFilesDir,
  routesChunkNames,
}: {
  generatedFilesDir: string;
  routesChunkNames: RoutesCode['routesChunkNames'];
}) =>
  generate(
    generatedFilesDir,
    'routesChunkNames.json',
    JSON.stringify(routesChunkNames, null, 2),
  );

const genRoutes = ({
  generatedFilesDir,
  routesConfig,
}: {
  generatedFilesDir: string;
  routesConfig: RoutesCode['routesConfig'];
}) => generate(generatedFilesDir, 'routes.js', routesConfig);

type GenerateRouteFilesParams = {
  generatedFilesDir: string;
  routes: RouteConfig[];
  baseUrl: string;
};

export async function generateRouteFiles({
  generatedFilesDir,
  routes,
}: GenerateRouteFilesParams): Promise<void> {
  const {registry, routesChunkNames, routesConfig} = generateRoutesCode(routes);
  await Promise.all([
    genRegistry({generatedFilesDir, registry}),
    genRoutesChunkNames({generatedFilesDir, routesChunkNames}),
    genRoutes({generatedFilesDir, routesConfig}),
  ]);
}
