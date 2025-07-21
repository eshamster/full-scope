export default {
  arrowParens: 'avoid',
  singleQuote: true,
  printWidth: 100,
  plugins: ['prettier-plugin-svelte'],
  semi: true,
  svelteSortOrder: 'options-styles-scripts-markup',
  svelteStrictMode: false,
  svelteIndentScriptAndStyle: true,
  trailingComma: 'es5',
  tabWidth: 2,
  useTabs: false,
  overrides: [
    {
      files: '*.svelte',
      options: {
        parser: 'svelte'
      }
    }
  ]
};