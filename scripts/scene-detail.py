"""Capture scene detail views and explicitly accelerated rare-animation samples without editing source."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--project', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
project = Path(args.project).resolve()
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(project / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'acceleratedTimestampSampling': True, 'cameraOverridesForInspection': True,
    'sourceChanged': False, 'browserErrors': [], 'consoleErrors': [], 'views': [],
    'boundsLimitations': 'CPU vertex and instance bounds at sampling time; GPU-only deformation and full motion extrema are not inferred'}
try:
    with sync_playwright() as driver:
        chrome = os.environ.get('CHROME_BINARY') or ('C:/Program Files/Google/Chrome/Application/chrome.exe' if os.name == 'nt' else None)
        browser = driver.chromium.launch(headless=True, **({'executable_path': chrome} if chrome else {}))
        page = browser.new_page(viewport={'width': 1440, 'height': 1080})
        page.on('pageerror', lambda error: report['browserErrors'].append(str(error)))
        page.on('console', lambda message: report['consoleErrors'].append(message.text) if message.type == 'error' else None)
        page.add_init_script('''(() => {
          let offset = 0;
          const request = window.requestAnimationFrame.bind(window);
          window.__qaSetTime = seconds => { offset = seconds * 1000 - performance.now(); };
          window.requestAnimationFrame = callback => request(time => callback(time + offset));
        })()''')
        page.goto(f'http://127.0.0.1:{server.server_address[1]}/', wait_until='networkidle')
        page.wait_for_function('window.__sceneQA?.report.frame > 2')
        report['defaultRender'] = page.evaluate('window.__sceneQA.stats()')
        # Full component bounds require the authored objects, before static batches regroup them.
        report['fullComponentBounds'] = page.evaluate('''() => {
          const qa = window.__sceneQA;
          const old = qa.world;
          qa.rebuild({batching:false});
          const result = {};
          for (const component of qa.world.children) {
            let lower = [Infinity,Infinity,Infinity], upper = [-Infinity,-Infinity,-Infinity], meshes = 0, invalidNodes = [];
            component.updateWorldMatrix(true,true);
            component.traverse(node => {
              if (!node.geometry) return;
              const positions = node.geometry.attributes.position;
              if (!positions || positions.count === 0) return;
              if ((node.isInstancedMesh || node.isSkinnedMesh) && node.computeBoundingBox) node.computeBoundingBox();
              else node.geometry.computeBoundingBox();
              const box = node.boundingBox ?? node.geometry.boundingBox;
              if (!box || box.isEmpty()) return;
              const matrix = node.matrixWorld.elements;
              if (![...matrix,...box.min.toArray(),...box.max.toArray()].every(Number.isFinite)) {
                invalidNodes.push({name:node.name,geometry:node.geometry.type,matrixFinite:matrix.every(Number.isFinite)});return;
              }
              for (const x of [box.min.x,box.max.x]) for (const y of [box.min.y,box.max.y]) for (const z of [box.min.z,box.max.z]) {
                const values = [matrix[0]*x+matrix[4]*y+matrix[8]*z+matrix[12],matrix[1]*x+matrix[5]*y+matrix[9]*z+matrix[13],matrix[2]*x+matrix[6]*y+matrix[10]*z+matrix[14]];
                values.forEach((value,i) => {lower[i]=Math.min(lower[i],value);upper[i]=Math.max(upper[i],value)});
              }
              meshes++;
            });
            result[component.name] = {min:lower,max:upper,meshes,invalidNodes};
          }
          const unbatched = qa.world;
          qa.rebuild();
          for (const world of [old,unbatched]) world.traverse(node => {
            node.geometry?.dispose();
            const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
            for (const material of materials) {material.map?.dispose();material.dispose();}
          });
          qa.controls.enableDamping = false;
          qa.controls.minDistance = .2;
          qa.controls.maxPolarAngle = Math.PI;
          return result;
        }''')
        views = [
            ('overview', [15, 12.5, 17], [0, .5, 0], 8),
            ('water-section', [13, 1.8, -1], [2, -.65, -1.5], 8),
            ('story-and-stairs', [6.5, 4.3, 10], [2.5, 1.1, 3.9], 8),
            ('umbrella-close', [1.3, 3.1, 5.7], [4.0, 1.5, 2.8], 8),
            ('wall-section', [0, 1.5, 12], [0, -.4, 5.8], 8),
            ('warehouse', [-.4, 2.0, 5.2], [-4.35, 1.3, 1.6], 8),
            ('waiting-room', [-1.0, 2.1, 1.1], [-4.4, 1.4, -1.7], 8),
            ('top', [.01, 16, .01], [0, 0, 0], 8),
            ('lighthouse-flash', [13, 5, -2], [4.8, 1.8, -4.8], 62),
            ('rainbow-window', [15, 12.5, 17], [0, .5, 0], 92),
        ]
        for name in ['08-boat-a', '09-boat-b', '10-boat-c', '11-boat-d']:
            bounds = report['fullComponentBounds'][name]
            center = [(a + b) / 2 for a, b in zip(bounds['min'], bounds['max'])]
            views.append((name + '-interior', [center[0] + 2, 1.4, center[2] + 3.5], [center[0], .9, center[2]], 8))
        for name, position, target, seconds in views:
            page.evaluate('''({position,target,seconds}) => {
              const qa = window.__sceneQA;
              qa.camera.position.set(...position);qa.controls.target.set(...target);qa.controls.update();
              window.__qaSetTime(seconds);
            }''', {'position': position, 'target': target, 'seconds': seconds})
            page.wait_for_timeout(110)
            page.screenshot(path=str(output / (name + '.png')))
            report['views'].append({'name': name, 'requestedAnimationSeconds': seconds})
        report['cpuBoundsInvalidNodes'] = sum(len(v['invalidNodes']) for v in report['fullComponentBounds'].values())
        report['visibleUI'] = page.locator('body > :not(canvas):not(script)').count()
        report['passed'] = not report['browserErrors'] and not report['consoleErrors'] and report['cpuBoundsInvalidNodes'] == 0 and report['visibleUI'] == 0 and len(report['defaultRender']['loaded']) == 32
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (output / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'passed': report.get('passed', False), 'views': len(report['views']),
    'browserErrors': report['browserErrors'], 'acceleratedTimestampSampling': True}))
