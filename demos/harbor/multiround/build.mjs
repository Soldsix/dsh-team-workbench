import { build } from 'esbuild'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
await mkdir('dist', { recursive: true })
const result = await build({ entryPoints: ['src/main.js'], outfile: 'dist/app.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022',
  write: false, minify: true, sourcemap: false, metafile: true, legalComments: 'eof', tsconfigRaw: { compilerOptions: {} } })
for (const output of result.outputFiles) await writeFile(output.path, output.contents)
await writeFile('dist/index.html', await readFile('index.html'))
await mkdir('dist/THIRD-PARTY-LICENSES', { recursive: true })
await writeFile('dist/THIRD-PARTY-LICENSES/three.txt', await readFile('node_modules/three/LICENSE'))
await writeFile('dist/THIRD-PARTY-NOTICES.txt', 'three.js is licensed under MIT; Copyright (c) 2010-2026 three.js authors. See THIRD-PARTY-LICENSES/three.txt for the complete license.\n')
console.log(JSON.stringify({ files: result.outputFiles.map(file => ({ bytes: file.contents.length, path: file.path.split(/[\\/]/).at(-1) })), inputs: Object.keys(result.metafile.inputs).length }))
