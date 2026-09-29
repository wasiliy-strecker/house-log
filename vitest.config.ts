import { defineConfig } from 'vitest/config';
import ts from 'typescript';
export default defineConfig({
  plugins: [
    {
      name: 'gallery-test-jsx',
      enforce: 'pre',
      transform(code, id) {
        // This dependency ships JSX in .js files for Metro. Test its real index
        // handling in Node as well, while mocking only native rendering/animation.
        if (
          id.includes('/react-native-image-viewing/dist/') &&
          id.endsWith('.js')
        )
          return {
            code: ts.transpileModule(
              code
                .replace(
                  './components/ImageItem/ImageItem',
                  './components/ImageItem/ImageItem.android',
                )
                .replace(/(from\s+["'])(\.\.?\/[^"']+)(["'])/g, '$1$2.js$3'),
              {
                fileName: 'gallery.tsx',
                compilerOptions: {
                  module: ts.ModuleKind.ESNext,
                  jsx: ts.JsxEmit.ReactJSX,
                  target: ts.ScriptTarget.ES2022,
                },
              },
            ).outputText,
            map: null,
          };
      },
    },
  ],
  test: {
    server: { deps: { inline: ['react-native-image-viewing'] } },
    include: ['tests/**/*.test.ts'],
    testTimeout: 120000,
    hookTimeout: 120000,
    maxWorkers: 1,
  },
});
