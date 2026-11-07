import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
const root = fileURLToPath(new URL('./', import.meta.url)).replaceAll('\\','/')
export default defineConfig({
 root: root+'source', resolve: { preserveSymlinks:true, alias:[{find:/^@deepseek-ai\/dsh-tools\/src\/(.*)$/,replacement:root+'source/packages/core/tools/src/$1'},{find:'@deepseek-ai/dsh-llm-deepseek/src/serialize.ts',replacement:root+'source/packages/llm/llm-deepseek/src/serialize.ts'},{find:'@deepseek-ai/dsh-experimental-agent-team/experts',replacement:root+'source/packages/experimental/agent-team/src/experts.ts'}] },
 plugins:[{name:'standard-decorators',enforce:'pre',transform(code,id){if(!/\.[cm]?tsx?$/.test(id)||!/@(?:Remote|Resource)/.test(code))return;return {code:ts.transpileModule(code,{fileName:id,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText,map:null}}},tsconfigPaths({projects:[root+'source/tsconfig.base.json']})],
 test:{include:['packages/core/tools/tests/**/*.spec.ts','packages/subagent/subagent/tests/**/*.spec.ts','packages/sandbox/sandbox-policy/tests/**/*.spec.ts','packages/web/web/tests/**/*.spec.ts','packages/web/web-fetch-http/tests/**/*.spec.ts'],exclude:['**/node_modules/**'],testTimeout:30000,hookTimeout:30000,maxWorkers:2,execArgv:process.allowedNodeEnvironmentFlags.has('--webstorage')?['--no-webstorage']:[],reporters:['default','json'],outputFile:{json:root+'private-qa/compat-results.json'}}
})
