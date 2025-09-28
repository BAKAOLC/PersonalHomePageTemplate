import { dirname } from 'path';
import { fileURLToPath } from 'url';

import js from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import vuePlugin from 'eslint-plugin-vue';
import globals from 'globals';
import vueParser from 'vue-eslint-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 基础样式规则配置
const baseStylisticRules = {
  // 分号相关
  '@stylistic/semi': ['error', 'always'],
  '@stylistic/no-extra-semi': 'error',
  '@stylistic/semi-style': ['error', 'last'],
  '@stylistic/semi-spacing': ['error', { before: false, after: true }],

  // 引号相关
  '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
  '@stylistic/quote-props': ['error', 'as-needed'],

  // 缩进和空格
  '@stylistic/indent': ['error', 2, {
    SwitchCase: 1,
    VariableDeclarator: 'first',
    ignoreComments: false,
    ignoredNodes: [
      'FunctionExpression > .params[decorators.length > 0]',
      'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
      'ClassBody.body > PropertyDefinition[decorators.length > 0] > .key',
    ],
  }],
  '@stylistic/space-infix-ops': 'error',
  '@stylistic/space-unary-ops': 'error',
  '@stylistic/space-in-parens': ['error', 'never'],
  '@stylistic/space-before-function-paren': ['error', {
    anonymous: 'always',
    named: 'never',
    asyncArrow: 'always',
  }],
  '@stylistic/space-before-blocks': ['error', 'always'],
  '@stylistic/keyword-spacing': ['error'],
  '@stylistic/key-spacing': ['error', { mode: 'strict' }],
  '@stylistic/object-curly-spacing': ['error', 'always'],
  '@stylistic/comma-spacing': ['error', { before: false, after: true }],
  '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
  '@stylistic/rest-spread-spacing': 'error',
  '@stylistic/template-curly-spacing': ['error', 'never'],
  '@stylistic/array-bracket-spacing': ['error', 'never'],
  '@stylistic/switch-colon-spacing': 'error',
  '@stylistic/type-annotation-spacing': ['error'],
  '@stylistic/no-multi-spaces': 'error',
  '@stylistic/no-trailing-spaces': 'error',
  '@stylistic/no-whitespace-before-property': 'error',

  // 换行相关
  '@stylistic/eol-last': ['error', 'always'],
  '@stylistic/array-bracket-newline': ['error', 'consistent'],
  '@stylistic/array-element-newline': ['error', 'consistent'],
  '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
  '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
  '@stylistic/function-paren-newline': ['error', 'multiline-arguments'],
  '@stylistic/implicit-arrow-linebreak': ['error', 'beside'],
  '@stylistic/operator-linebreak': ['error', 'before'],

  // 其他样式规则
  '@stylistic/comma-style': ['error', 'last'],
  '@stylistic/comma-dangle': ['error', 'always-multiline'],
  '@stylistic/brace-style': ['error', '1tbs'],
  '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
  '@stylistic/padded-blocks': ['error', 'never'],
  '@stylistic/max-statements-per-line': ['error', { max: 1 }],
  '@stylistic/multiline-ternary': ['error', 'always-multiline'],
  '@stylistic/new-parens': 'error',
  '@stylistic/nonblock-statement-body-position': 'error',
  '@stylistic/wrap-iife': ['error', 'inside'],
  '@stylistic/no-floating-decimal': 'error',
  '@stylistic/dot-location': ['error', 'property'],
  '@stylistic/spaced-comment': ['error', 'always'],
  '@stylistic/member-delimiter-style': [
    'error',
    {
      multiline: {
        delimiter: 'semi',
        requireLast: true,
      },
      singleline: {
        delimiter: 'semi',
        requireLast: false,
      },
      multilineDetection: 'brackets',
    },
  ],
};

// 基础代码质量规则
const baseQualityRules = {
  'no-var': 'error',
  'prefer-template': 'error',
  'no-extra-parens': 'off',
  'no-duplicate-imports': 'error',
  'prefer-destructuring': [
    'error',
    {
      VariableDeclarator: {
        array: false,
        object: true,
      },
    },
  ],
  'no-console': 'off',
  'no-debugger': 'warn',
  'no-alert': 'warn',
  'no-constant-condition': 'warn',
  'no-empty': 'warn',
  'no-unreachable': 'error',
  'no-unused-expressions': 'warn',
  'no-useless-return': 'error',
  'prefer-const': 'error',
  'prefer-arrow-callback': 'error',
  arrowSpacing: 'off', // 使用 @stylistic 版本
  commaDangle: 'off', // 使用 @stylistic 版本
  indent: 'off', // 使用 @stylistic 版本
  quotes: 'off', // 使用 @stylistic 版本
  semi: 'off', // 使用 @stylistic 版本
};

// TypeScript 规则
const typescriptRules = {
  '@typescript-eslint/no-empty-function': 'warn',
  '@typescript-eslint/no-empty-interface': 'warn',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      args: 'none',
      varsIgnorePattern: '^_',
      argsIgnorePattern: '^_',
      ignoreRestSiblings: true,
    },
  ],
  '@typescript-eslint/explicit-function-return-type': [
    'warn', // 改为 warn，减少严格性
    {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
      allowHigherOrderFunctions: true,
      allowDirectConstAssertionInArrowFunctions: true,
      allowConciseArrowFunctionExpressionsStartingWithVoid: true,
    },
  ],
  '@typescript-eslint/prefer-nullish-coalescing': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-non-null-assertion': 'warn',
  '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
  'no-unused-vars': 'off', // 使用 TypeScript 版本
};

// Vue 文件专用的 TypeScript 规则（禁用需要类型信息的规则）
const vueTypescriptRules = {
  ...typescriptRules,
  // 禁用需要类型信息的规则
  '@typescript-eslint/prefer-nullish-coalescing': 'off',
  '@typescript-eslint/prefer-optional-chain': 'off',
  '@typescript-eslint/no-unnecessary-type-assertion': 'off',
};

// Vue 规则
const vueRules = {
  'vue/no-unknown-at-rule': 'off',
  'vue/valid-style': 'off',
  'vue/multi-word-component-names': 'off',
  'vue/require-default-prop': 'warn',
  'vue/require-prop-types': 'warn',
  'vue/component-definition-name-casing': ['error', 'PascalCase'],
  'vue/component-name-in-template-casing': ['error', 'PascalCase'],
  'vue/custom-event-name-casing': ['error', 'camelCase'],
  'vue/define-macros-order': ['error', {
    order: ['defineProps', 'defineEmits'],
  }],
  'vue/html-comment-content-spacing': ['error', 'always'],
  'vue/no-useless-v-bind': 'error',
  'vue/prefer-separate-static-class': 'error',
  'vue/prefer-true-attribute-shorthand': 'error',
};

// Import 规则
const importRules = {
  'import/no-unresolved': 'off',
  'import/order': [
    'error',
    {
      warnOnUnassignedImports: true,
      groups: [
        'builtin',
        'external',
        'parent',
        'sibling',
        'internal',
        'index',
        'unknown',
      ],
      pathGroups: [],
      distinctGroup: false,
      'newlines-between': 'always',
      alphabetize: { order: 'asc', orderImportKind: 'asc' },
    },
  ],
  'import/no-duplicates': 'error',
  'import/no-unused-modules': 'off',
  'import/first': 'error',
  'import/newline-after-import': 'error',
  'import/no-absolute-path': 'error',
  'import/no-self-import': 'error',
};

// 项目特定的限制规则（可根据需要调整）
const projectSpecificRules = {
  'no-restricted-globals': [
    'error',
    // 禁用原生事件监听器
    {
      name: 'addEventListener',
      message: '请使用 useEventManager() 中的 addEventListener 替代原生 addEventListener',
    },
    {
      name: 'removeEventListener',
      message: '请使用 useEventManager() 中的 removeEventListener 替代原生 removeEventListener',
    },
    {
      name: 'setTimeout',
      message: '请使用 useTimers() 中的 setTimeout 替代原生 setTimeout',
    },
    {
      name: 'setInterval',
      message: '请使用 useTimers() 中的 setInterval 替代原生 setInterval',
    },
    {
      name: 'clearTimeout',
      message: '请使用 useTimers() 中的 clearTimeout 替代原生 clearTimeout',
    },
    {
      name: 'clearInterval',
      message: '请使用 useTimers() 中的 clearInterval 替代原生 clearInterval',
    },
    {
      name: 'requestAnimationFrame',
      message: '请使用 useTimers() 中的 requestAnimationFrame 替代原生 requestAnimationFrame',
    },
    {
      name: 'cancelAnimationFrame',
      message: '请使用 useTimers() 中的 cancelAnimationFrame 替代原生 cancelAnimationFrame',
    },
  ],
  'no-restricted-syntax': [
    'error',
    // 禁用不正确的逻辑或操作符
    {
      selector: 'LogicalExpression[operator="||"][left.type="MemberExpression"][right.type="Literal"]',
      message: '建议使用 ?? 操作符替代 || 操作符，除非明确需要处理 falsy 值',
    },
    {
      selector: 'LogicalExpression[operator="||"][left.type="MemberExpression"][right.type="Identifier"]',
      message: '建议使用 ?? 操作符替代 || 操作符，除非明确需要处理 falsy 值',
    },
    {
      selector: 'LogicalExpression[operator="||"][left.type="CallExpression"][right.type="Literal"]',
      message: '建议使用 ?? 操作符替代 || 操作符，除非明确需要处理 falsy 值',
    },
    {
      selector: 'LogicalExpression[operator="||"][left.type="CallExpression"][right.type="Identifier"]',
      message: '建议使用 ?? 操作符替代 || 操作符，除非明确需要处理 falsy 值',
    },
    // 禁用原生事件监听器
    {
      selector: 'CallExpression[callee.object.name="window"][callee.property.name="addEventListener"]',
      message: '禁止使用原生 addEventListener，请使用被管理的事件监听器',
    },
    {
      selector: 'CallExpression[callee.object.name="window"][callee.property.name="removeEventListener"]',
      message: '禁止使用原生 removeEventListener，请使用被管理的事件监听器',
    },
    {
      selector: 'CallExpression[callee.object.name="document"][callee.property.name="addEventListener"]',
      message: '禁止使用原生 addEventListener，请使用被管理的事件监听器',
    },
    {
      selector: 'CallExpression[callee.object.name="document"][callee.property.name="removeEventListener"]',
      message: '禁止使用原生 removeEventListener，请使用被管理的事件监听器',
    },
  ],
};

export default [
  // 主配置 - TypeScript 文件 (src 目录)
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic': stylisticPlugin,
      import: importPlugin,
      vue: vuePlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...vuePlugin.configs['flat/recommended'].rules,
      ...baseQualityRules,
      ...baseStylisticRules,
      ...typescriptRules,
      ...vueRules,
      ...importRules,
      ...projectSpecificRules,
      // 行长度限制
      '@stylistic/max-len': [
        'error',
        {
          code: 120,
          tabWidth: 2,
          comments: 1200,
          ignoreComments: true,
          ignoreTrailingComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
  // Vue 文件配置
  {
    files: ['src/**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        parser: {
          js: tsParser,
          ts: tsParser,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic': stylisticPlugin,
      import: importPlugin,
      vue: vuePlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...vuePlugin.configs['flat/recommended'].rules,
      ...baseQualityRules,
      ...baseStylisticRules,
      ...vueTypescriptRules, // 使用 Vue 专用的 TypeScript 规则
      ...vueRules,
      ...importRules,
      ...projectSpecificRules,
      // 行长度限制
      '@stylistic/max-len': [
        'error',
        {
          code: 120,
          tabWidth: 2,
          comments: 1200,
          ignoreComments: true,
          ignoreTrailingComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
  // 配置文件 - TypeScript 文件 (根目录)
  {
    files: ['*.ts', '*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.node.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic': stylisticPlugin,
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...baseQualityRules,
      ...baseStylisticRules,
      ...typescriptRules,
      ...importRules,
      // 行长度限制
      '@stylistic/max-len': [
        'error',
        {
          code: 120,
          tabWidth: 2,
          comments: 1200,
          ignoreComments: true,
          ignoreTrailingComments: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
    },
  },
  // CommonJS 文件配置
  {
    files: ['**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        require: 'readonly',
      },
    },
    plugins: {
      '@stylistic': stylisticPlugin,
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...baseQualityRules,
      ...baseStylisticRules,
      ...importRules,
      // 禁用 TypeScript 相关规则
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // 使用原生 no-unused-vars 规则
      'no-unused-vars': ['error', {
        args: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  // ES 模块文件配置
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      '@stylistic': stylisticPlugin,
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...baseQualityRules,
      ...baseStylisticRules,
      ...importRules,
      // 禁用 TypeScript 相关规则
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // 使用原生 no-unused-vars 规则
      'no-unused-vars': ['error', {
        args: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  // 忽略文件配置
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.min.js',
      'coverage/**',
      '.eslintcache',
      'eslint_output.log',
      'public/**',
      'vite-plugins/**',
    ],
  },
];
