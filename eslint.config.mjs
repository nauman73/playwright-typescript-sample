import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import playwright from 'eslint-plugin-playwright';

const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-networkidle': 'error',
      'playwright/no-force-option': 'error',
      // Playwright fixtures receive a callback named use, which this React rule mistakes for a hook.
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  { ignores: ['.next/**', 'playwright-report/**', 'test-results/**', 'drizzle/**'] },
];

export default eslintConfig;
