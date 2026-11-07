import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const root = fileURLToPath(new URL('./', import.meta.url)).replaceAll('\\','/')
export default defineConfig({
 root: root+'source', resolve: { preserveSymlinks:true, alias:[{find:'react-dom/client',replacement:require.resolve('react-dom/client',{paths:[root+'source/packages/client/ui-primitives']})},{find:/^react-dom$/,replacement:require.resolve('react-dom',{paths:[root+'source/packages/client/ui-primitives']})},{find:'@deepseek-ai/dsh-experimental-agent-team/client',replacement:root+'source/packages/experimental/agent-team/src/client.ts'},{find:'react/jsx-dev-runtime',replacement:require.resolve('react/jsx-dev-runtime',{paths:[root+'source/packages/client/ui-primitives']})},{find:'react/jsx-runtime',replacement:require.resolve('react/jsx-runtime',{paths:[root+'source/packages/client/ui-primitives']})},{find:'react',replacement:require.resolve('react',{paths:[root+'source/packages/client/ui-primitives']})},{find:'@deepseek-ai/dsh-client-locale/src/locales/zh.ts',replacement:root+'source/packages/client/locale/src/locales/zh.ts'},{find:'@deepseek-ai/dsh-llm-deepseek/src/serialize.ts',replacement:root+'source/packages/llm/llm-deepseek/src/serialize.ts'},{find:'@deepseek-ai/dsh-experimental-agent-team/experts',replacement:root+'source/packages/experimental/agent-team/src/experts.ts'}] },
 plugins:[{name:'standard-decorators',enforce:'pre',transform(code,id){if(!/\.[cm]?tsx?$/.test(id)||!/@(?:Remote|Resource)/.test(code))return;return {code:ts.transpileModule(code,{fileName:id,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText,map:null}}},tsconfigPaths({projects:[root+'source/tsconfig.base.json']})],
 test:{include:['packages/experimental/client-ui-agent-team/tests/**/*.client.spec.ts','packages/experimental/client-ui-agent-team/tests/**/*.client.spec.tsx'],exclude:['**/node_modules/**'],testTimeout:30000,hookTimeout:30000,maxWorkers:2,execArgv:process.allowedNodeEnvironmentFlags.has('--webstorage')?['--no-webstorage']:[],reporters:['default','json'],outputFile:{json:root+'private-qa/ui-results.json'}}
})
