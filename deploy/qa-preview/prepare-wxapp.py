"""Create an isolated mini-program copy, never edit the production source."""
import argparse
import json
from pathlib import Path
import re
import shutil
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'client-wxapp'


def prepare(api_base, appid, output):
    url = urlsplit(api_base)
    local = url.hostname in {'localhost', '127.0.0.1'}
    if url.hostname == 'api.lunails.cn' or not url.hostname or url.username or url.password or url.query or url.fragment or url.path not in {'', '/'}:
        raise ValueError('Use a dedicated QA API origin, never the production endpoint')
    if url.scheme != 'https' and not (local and url.scheme == 'http'):
        raise ValueError('Remote preview requires HTTPS')
    config = json.loads((SOURCE / 'project.config.json').read_text())
    if appid == config['appid']:
        raise ValueError('Use a separate test AppID to isolate production sessions')
    if not (appid == 'touristappid' or re.fullmatch(r'wx[a-f0-9]{16}', appid)):
        raise ValueError('Invalid test AppID')
    if local and appid != 'touristappid':
        raise ValueError('Local simulator uses touristappid; an uploadable preview needs a QA HTTPS origin')
    if not local and appid == 'touristappid':
        raise ValueError('Remote experience build requires an independent test AppID')
    output = Path(output).resolve()
    if output.exists() or output == SOURCE or SOURCE in output.parents:
        raise ValueError('Output must be a new directory outside the production source')
    excluded = ['.claude', '.cloudbase', 'docs', 'qa-artifacts', 'preview', 'tests', 'scripts', 'node_modules', 'project.private.config.json', '.DS_Store', '.env*', '*.pem', '*.key']
    shutil.copytree(SOURCE, output, ignore=shutil.ignore_patterns(*excluded))
    api_base = api_base.rstrip('/')
    for file in output.rglob('*.js'):
        file.write_text(file.read_text().replace('https://api.lunails.cn', api_base).replace('http://localhost:3000', api_base))
    config.update(appid=appid, projectname='nailbook-isolated-qa', description='隔离测试版，禁止提审正式产品')
    config['setting']['urlCheck'] = not local
    (output / 'project.config.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    nav = output / 'components/nav-bar/index.wxml'
    nav.write_text(nav.read_text().replace('{{title}}', '测试 · {{title}}'))
    manifest = {'environment': 'isolated-qa', 'apiBaseUrl': api_base, 'appid': appid, 'simulatorOnly': local, 'source': str(SOURCE)}
    (output / 'qa-build.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--api-base', default='http://127.0.0.1:3300')
    parser.add_argument('--appid', default='touristappid')
    parser.add_argument('--output', default=str(ROOT / '.qa-local/wxapp'))
    args = parser.parse_args()
    print(json.dumps(prepare(args.api_base, args.appid, args.output), ensure_ascii=False, indent=2))
