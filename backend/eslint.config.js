const js = require('@eslint/js');

module.exports = [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'readonly',
                exports: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                Buffer: 'readonly',
                fetch: 'readonly',
                Response: 'readonly',
                Request: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-constant-condition': 'warn',
            'no-debugger': 'error',
            'no-duplicate-case': 'error',
            'no-empty': 'warn',
            'no-extra-semi': 'warn',
            'no-unreachable': 'error',
            'eqeqeq': ['warn', 'always'],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-var': 'warn',
            'prefer-const': 'warn',
        },
    },
    {
        ignores: ['node_modules/', 'coverage/'],
    },
];
