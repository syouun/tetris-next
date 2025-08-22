// eslint.config.mjs
import next from 'eslint-config-next';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // まず無視パターン（.eslintignore は使われないため、ここで指定）
  { ignores: ['**/.next/**', '**/node_modules/**', 'src/components/old/**'] },

  // Next.js 推奨（React/TypeScript も含む）
  ...next,

  // 追加で独自ルールを入れたい場合は、最後にブロックを足してください
  // {
  //   rules: {
  //     // 例: 'no-console': 'warn',
  //   },
  // },
];
