import js from '@eslint/js'
import ts from 'typescript-eslint'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
  {
    files: ['**/*.vue'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        parser: {
          js: 'espree',
          mjs: 'espree',
          ts: ts.parser,
        },
        extraFileExtensions: ['.vue'],
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    files: ['**/*.vue', '**/*.js', '**/*.mjs', '**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        process: true,
        browser: true,
        global: true,
        jest: true,
        expect: true,
        mockFn: true,
        config: true,
        afterEach: true,
        beforeEach: true,
        describe: true,
        it: true,
        test: true,
        runs: true,
        waitsFor: true,
        pit: true,
        require: true,
        xdescribe: true,
        xit: true,
        DOMEvent: true,
        ScrollToOptions: true,
        defineExpose: true,
        defineProps: true,
        defineEmits: true,
        withDefaults: true,
        MozFocusEvent: true,
        ID: true,
      },
    },
  },
  {
    ignores: ['addon/*'],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/custom-event-name-casing': 'off',
      'vue/no-mutating-props': 'off',
      'no-console': 'warn',
      indent: ['error', 2, { SwitchCase: 1 }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'never'],
      'require-atomic-updates': 'off',
      'vue/html-self-closing': 'off',
      'vue/require-default-prop': 'off',
      'no-async-promise-executor': 'off',
      'no-prototype-builtins': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
    },
  },
]
