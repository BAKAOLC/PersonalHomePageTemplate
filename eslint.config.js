import js from '@eslint/js';
import stylisticPlugin from '@stylistic/eslint-plugin';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';

export default [
  {
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLImageElement: 'readonly',
        Element: 'readonly',
        NodeJS: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        XMLHttpRequest: 'readonly',
        Image: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        TransitionEvent: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        KeyboardEvent: 'readonly',
        WheelEvent: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventListener: 'readonly',
        EventTarget: 'readonly',
        event: 'readonly',
        ResizeObserver: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      '@stylistic': stylisticPlugin,
      import: importPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-var': 2,
      'prefer-template': 'error',
      'no-extra-parens': 'off',
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/no-extra-semi': 'error',
      '@stylistic/semi-style': ['error', 'last'],
      '@stylistic/no-floating-decimal': 'error',
      '@stylistic/dot-location': ['error', 'property'],
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
      '@stylistic/eol-last': ['error', 'always'],
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
      '@stylistic/spaced-comment': ['error', 'always'],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/space-unary-ops': 'error',
      '@stylistic/space-in-parens': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      '@stylistic/space-before-blocks': ['error', 'always'],
      '@stylistic/semi-spacing': ['error', { before: false, after: true }],
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
      '@stylistic/array-bracket-newline': ['error', 'consistent'],
      '@stylistic/array-element-newline': ['error', 'consistent'],
      '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
      '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
      '@stylistic/function-paren-newline': ['error', 'multiline-arguments'],
      '@stylistic/comma-style': ['error', 'last'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/brace-style': ['error', '1tbs'],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0, maxBOF: 0 }],
      '@stylistic/padded-blocks': ['error', 'never'],
      '@stylistic/implicit-arrow-linebreak': ['error', 'beside'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/quote-props': ['error', 'as-needed'],
      '@stylistic/max-statements-per-line': ['error', { max: 1 }],
      '@stylistic/multiline-ternary': ['error', 'always-multiline'],
      '@stylistic/new-parens': 'error',
      '@stylistic/nonblock-statement-body-position': 'error',
      '@stylistic/wrap-iife': ['error', 'inside'],
      '@stylistic/operator-linebreak': ['error', 'before'],
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
      'prefer-destructuring': [
        'error',
        {
          VariableDeclarator: {
            array: false,
            object: true,
          },
        },
      ],
      'no-duplicate-imports': 'error',
      'import/no-unresolved': 'off', // 关闭，因为在新的 flat config 中可能有问题
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
            'type',
            'unknown',
          ],
          pathGroups: [],
          distinctGroup: true,
          'newlines-between': 'always',
          alphabetize: { order: 'asc', orderImportKind: 'asc' },
        },
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
          allowConciseArrowFunctionExpressionsStartingWithVoid: true,
        },
      ],
      // 禁用接口和函数签名中的未使用参数检查
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none', // 不检查函数参数
          varsIgnorePattern: '^_', // 忽略以_开头的变量
          argsIgnorePattern: '^_', // 忽略以_开头的参数
          ignoreRestSiblings: true,
        },
      ],
      // 禁用原生的no-unused-vars规则，使用TypeScript版本
      'no-unused-vars': 'off',
      // 禁止使用原生setTimeout和setInterval，强制使用useTimers
      'no-restricted-globals': [
        'error',
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
      ],
      // 禁止使用原生addEventListener，强制使用被管理的事件监听器
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="addEventListener"]',
          message: '禁止使用原生 addEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="removeEventListener"]',
          message: '禁止使用原生 removeEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="document"][callee.property.name="addEventListener"]',
          message: '禁止使用原生 addEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="document"][callee.property.name="removeEventListener"]',
          message: '禁止使用原生 removeEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="document"][callee.property.name="addEventListener"]',
          message: '禁止使用原生 addEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="document"][callee.property.name="removeEventListener"]',
          message: '禁止使用原生 removeEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="setTimeout"]',
          message: '禁止使用 window.setTimeout，请使用 useTimers() 中的 setTimeout',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="setInterval"]',
          message: '禁止使用 window.setInterval，请使用 useTimers() 中的 setInterval',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="clearTimeout"]',
          message: '禁止使用 window.clearTimeout，请使用 useTimers() 中的 clearTimeout',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="clearInterval"]',
          message: '禁止使用 window.clearInterval，请使用 useTimers() 中的 clearInterval',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="requestAnimationFrame"]',
          message: '禁止使用 window.requestAnimationFrame，请使用 useTimers() 中的 requestAnimationFrame',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="cancelAnimationFrame"]',
          message: '禁止使用 window.cancelAnimationFrame，请使用 useTimers() 中的 cancelAnimationFrame',
        },
      ],
    },
  },
  // Vue 文件配置
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLImageElement: 'readonly',
        Element: 'readonly',
        NodeJS: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        location: 'readonly',
        history: 'readonly',
        XMLHttpRequest: 'readonly',
        Image: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        TransitionEvent: 'readonly',
        MouseEvent: 'readonly',
        TouchEvent: 'readonly',
        KeyboardEvent: 'readonly',
        WheelEvent: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventListener: 'readonly',
        EventTarget: 'readonly',
        event: 'readonly',
        ResizeObserver: 'readonly',
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
      // 继承之前的所有 @stylistic 规则
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      // Vue 特定规则可以在这里覆盖
      // 禁用CSS相关的警告
      'vue/no-unknown-at-rule': 'off',
      'vue/valid-style': 'off',
      // 禁用接口和函数签名中的未使用参数检查
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none', // 不检查函数参数
          varsIgnorePattern: '^_', // 忽略以_开头的变量
          argsIgnorePattern: '^_', // 忽略以_开头的参数
          ignoreRestSiblings: true,
        },
      ],
      // 禁用原生的no-unused-vars规则，使用TypeScript版本
      'no-unused-vars': 'off',
      // 禁止使用原生setTimeout和setInterval，强制使用useTimers
      'no-restricted-globals': [
        'error',
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
      ],
      // 禁止使用原生addEventListener，强制使用被管理的事件监听器
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="addEventListener"]',
          message: '禁止使用 window.addEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="removeEventListener"]',
          message: '禁止使用 window.removeEventListener，请使用被管理的事件监听器，如 useEventManager 或组件内的事件管理',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="setTimeout"]',
          message: '禁止使用 window.setTimeout，请使用 useTimers() 中的 setTimeout',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="setInterval"]',
          message: '禁止使用 window.setInterval，请使用 useTimers() 中的 setInterval',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="clearTimeout"]',
          message: '禁止使用 window.clearTimeout，请使用 useTimers() 中的 clearTimeout',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="clearInterval"]',
          message: '禁止使用 window.clearInterval，请使用 useTimers() 中的 clearInterval',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="requestAnimationFrame"]',
          message: '禁止使用 window.requestAnimationFrame，请使用 useTimers() 中的 requestAnimationFrame',
        },
        {
          selector: 'CallExpression[callee.object.name="window"][callee.property.name="cancelAnimationFrame"]',
          message: '禁止使用 window.cancelAnimationFrame，请使用 useTimers() 中的 cancelAnimationFrame',
        },
      ],
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
  },
  // CommonJS 文件配置
  {
    files: ['**/*.cjs', '**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
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
    },
    rules: {
      ...js.configs.recommended.rules,
      // 禁用 TypeScript 相关规则
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      // 启用原生的 no-unused-vars 规则
      'no-unused-vars': ['error', {
        args: 'none',
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // 保留样式规则
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/eol-last': ['error', 'always'],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '*.min.js',
      'coverage/**',
      '.eslintcache',
      'eslint_output.log',
    ],
  },
];
