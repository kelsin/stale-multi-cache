/* eslint import/no-extraneous-dependencies: off */

const formatter = require('eslint-formatter-pretty');
const prettier = require('eslint-config-prettier');

const env = {
    es6: true,
    node: true,
    jest: true
};

const parserOptions = {
    sourceType: 'module'
};

const rules = {
    'brace-style': ['error', '1tbs', { 'allowSingleLine': true }],
    'camelcase': ['error', { properties: 'never' }],
    'consistent-return': ['error', { 'treatUndefinedAsUnspecified': true }],
    'default-case': 0,
    'key-spacing': 'off',
    'global-require': 'off',
    'import/default': 0,
    'import/no-dynamic-require': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'no-param-reassign': [
        'error',
        {
            props: false
        }
    ],
    'no-plusplus': [
        'error',
        {
            allowForLoopAfterthoughts: true
        }
    ],
    'no-restricted-properties': [
        0,
        {
            object: 'Math.pow'
        }
    ],
    'no-template-curly-in-string': 'off',
    'no-underscore-dangle': 'off',
    'no-unused-vars': [
        'error',
        {
            args: 'none',
            ignoreRestSiblings: true
        }
    ],
    'no-use-before-define': [
        'error',
        {
            classes: true,
            functions: false
        }
    ],
    'prefer-destructuring': [
        'error',
        {
            AssignmentExpression: {
                array: false,
                object: false
            },
            VariableDeclarator: {
                array: false,
                object: true
            }
        },
        {
            enforceForRenamedProperties: false
        }
    ],
    'prettier/prettier': 'error',
    'radix': 'off',
    
    // Enable to enforce ES6
    // 'import/no-commonjs': 'error'
    'import/extensions': 'off',
    'import/order': [
        'error',
        {
            'groups': ['builtin', 'external', 'index', 'sibling', 'parent', 'internal'],
            'newlines-between': 'ignore'
        }
    ],
};

const settings = {
    flowtype: {
        onlyFilesWithFlowAnnotation: true
    }
};

const config = {
    extends: ['airbnb-base'],
    plugins: ['flowtype', 'prettier'],
    parser: 'babel-eslint',
    parserOptions,
    env,
    settings,
    rules: Object.assign({}, prettier.rules, rules),
};

module.exports = config;
