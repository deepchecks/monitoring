import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    output: {
      mode: 'single',
      target: './src/api/generated.ts',
      client: 'react-query',
      prettier: true,
      override: {
        mutator: {
          path: './src/helpers/services/customAxios.ts',
          name: 'customInstance'
        }
      }
    },
    input: {
      target: `${process.env.REACT_APP_BASE_API}/api/v1/openapi.json`
    },
    hooks: {
      afterAllFilesWrite: 'eslint --fix ./src/api/generated.ts'
    }
  }
});
