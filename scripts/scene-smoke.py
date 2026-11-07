"""Render a locally built Three.js fixture and record real browser behavior and views."""
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
project = Path(args.project).resolve(); output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)
class LocalHandler(SimpleHTTPRequestHandler):
    def log_message(self, *unused): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(LocalHandler, directory=str(project / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
report = {'browserErrors': [], 'consoleErrors': [], 'project': project.name}
try:
    with sync_playwright() as p:
        chrome = os.environ.get('CHROME_BINARY') or ('C:/Program Files/Google/Chrome/Application/chrome.exe' if os.name == 'nt' else None)
        browser = p.chromium.launch(headless=True, **({'executable_path': chrome} if chrome else {}))
        page = browser.new_page(viewport={'width': 1440, 'height': 1080}, device_scale_factor=1)
        page.on('pageerror', lambda error: report['browserErrors'].append(str(error)))
        page.on('console', lambda message: report['consoleErrors'].append(message.text) if message.type == 'error' else None)
        page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{server.server_address[1]}/') else route.abort())
        page.goto(f'http://127.0.0.1:{server.server_address[1]}/', wait_until='networkidle')
        page.wait_for_function('window.__sceneQA?.report.frame > 10', timeout=45000)
        report['initial'] = page.evaluate('window.__sceneQA.stats()')
        report['componentBounds'] = page.evaluate('''() => Object.fromEntries(window.__sceneQA.world.children.map(component=>{
          let bounds;component.traverse(node=>{if(!node.geometry)return;
            if(node.isInstancedMesh){node.computeBoundingBox();}else if(!node.geometry.boundingBox){node.geometry.computeBoundingBox();}
            const source=node.isInstancedMesh?node.boundingBox:node.geometry.boundingBox;if(!source)return;
            const box=source.clone().applyMatrix4(node.matrixWorld);if(bounds)bounds.union(box);else bounds=box;});
          return [component.name,bounds&&!bounds.isEmpty()?{min:bounds.min.toArray(),max:bounds.max.toArray()}:null]}))''')
        report['visibleUI'] = page.locator('body > :not(canvas):not(script)').count()
        motion_sample = '''() => Object.fromEntries(window.__sceneQA.world.children.map(component=>{
          let sum=0;component.traverse(node=>{sum+=node.position.x*1.13+node.position.y*2.17+node.position.z*3.19+node.rotation.x*4.23+node.rotation.y*5.29+node.rotation.z*6.31+node.scale.x*7.37+node.scale.y*8.41+node.scale.z*9.43;
            if(node.geometry?.attributes.position){const a=node.geometry.attributes.position;sum+=a.version*.013;for(let i=0;i<Math.min(12,a.array.length);i++)sum+=a.array[i]*(i+1)*.001;}
            if(node.material?.uniforms)for(const [key,item] of Object.entries(node.material.uniforms))if(/time/i.test(key)&&typeof item.value==='number')sum+=item.value*.007;});return [component.name,sum]}))'''
        before_motion = page.evaluate(motion_sample)
        page.screenshot(path=str(output / 'hero.png'))
        page.evaluate('window.__sceneQA.camera.position.set(-15, 12, -16);window.__sceneQA.controls.update()')
        page.wait_for_timeout(500)
        page.screenshot(path=str(output / 'reverse.png'))
        page.evaluate('window.__sceneQA.camera.position.set(5, 5, 11);window.__sceneQA.controls.target.set(-1,1,1);window.__sceneQA.controls.update()')
        page.wait_for_timeout(500)
        page.screenshot(path=str(output / 'interiors.png'))
        before = page.evaluate('window.__sceneQA.camera.position.toArray()')
        page.mouse.move(720, 540); page.mouse.down(); page.mouse.move(960, 600, steps=12); page.mouse.up()
        page.wait_for_timeout(500)
        report['orbitChanged'] = before != page.evaluate('window.__sceneQA.camera.position.toArray()')
        before_distance = page.evaluate('window.__sceneQA.camera.position.distanceTo(window.__sceneQA.controls.target)')
        page.mouse.wheel(0, -350); page.wait_for_timeout(500)
        report['zoomChanged'] = before_distance != page.evaluate('window.__sceneQA.camera.position.distanceTo(window.__sceneQA.controls.target)')
        frames = page.evaluate('''async () => {const times=[];let before=performance.now();for(let i=0;i<90;i++)await new Promise(resolve=>requestAnimationFrame(now=>{times.push(now-before);before=now;resolve()}));return times}''')
        report['frameTimingsMs'] = {'median': sorted(frames)[len(frames)//2], 'p95': sorted(frames)[int(len(frames)*.95)]}
        report['final'] = page.evaluate('window.__sceneQA.stats()')
        report['animationAdvanced'] = report['final']['frame'] > report['initial']['frame']
        after_motion = page.evaluate(motion_sample)
        report['observedMovingComponents'] = [name for name,value in after_motion.items() if abs(value-before_motion.get(name,value))>1e-7]
        report['passed'] = not report['browserErrors'] and not report['initial']['failures'] and report['visibleUI'] == 0 and report['orbitChanged'] and report['zoomChanged'] and report['animationAdvanced']
        browser.close()
finally:
    server.shutdown(); server.server_close()
    (output / 'result.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps(report))
