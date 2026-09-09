"""Smoke checks against the fixed local QA gateway; never accepts a remote URL."""
import datetime
import json
from pathlib import Path
import subprocess
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parents[2]
private = root / '.qa-local'
env = dict(line.split('=', 1) for line in (private / 'backend.env').read_text().splitlines() if '=' in line)
base = 'http://127.0.0.1:3300/api'
checks = []


def call(path, method='GET', data=None, token=None, expected=200):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(base + path, data=None if data is None else json.dumps(data).encode(), headers=headers, method=method)
    try:
        response = urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        body = json.load(response)
        assert response.status == expected, (path, response.status, body.get('message') if isinstance(body, dict) else '')
    return body


metadata = json.loads(subprocess.check_output(['docker', 'inspect', 'nailbook-qa-preview-backend-1']))[0]
assert metadata['Config']['Labels']['com.docker.compose.project'] == 'nailbook-qa-preview'
mounts = [item['Name'] for item in metadata['Mounts'] if item['Type'] == 'volume']
assert set(mounts) == {'nailbook-qa-preview_database', 'nailbook-qa-preview_uploads'}
networks = metadata['NetworkSettings']['Networks']
assert set(networks) == {'nailbook-qa-preview_isolated'}
network = json.loads(subprocess.check_output(['docker', 'network', 'inspect', 'nailbook-qa-preview_isolated']))[0]
assert network['Internal'] is True
checks.append('dedicated Docker project, volumes and internal-only backend network')
assert call('/health')['status'] == 'ok'
config = call('/public/launch-config')
assert config['storeName'] == '隔离测试店' and config['launchTechnicianId'] == 1
capabilities = call('/public/capabilities')
assert not capabilities['wechatLogin']['available'] and not capabilities['wechatPay']['available']
checks.append('QA identity verified; real WeChat login and payment disabled')
tokens = {}
for role, phone in [('technician', '19900000001'), ('client', '19900000002'), ('unbound', '19900000003')]:
    namespace = 'technician' if role == 'technician' else 'client'
    result = call('/' + namespace + '/auth/login', 'POST', {'phone': phone, 'password': env['QA_ACCOUNT_PASSWORD']}, expected=201)
    tokens[role] = result['accessToken']
checks.append('technician, client A and client B password login')
call('/technician/orders', token=tokens['technician'])
call('/technician/orders/income-calendar', token=tokens['technician'])
call('/technician/orders', token=tokens['client'], expected=401)
checks.append('orders/calendar available; wrong role rejected')
works = call('/technician/works', token=tokens['technician'])
assert len(works) == 1 and works[0]['publicationStatus'] == 'approved'
work_id = works[0]['id']
public_work = call('/public/works/' + str(work_id))
assert public_work['id'] == work_id
current_hero = call('/technician/works/hero-recommendations', token=tokens['technician'])
current_ids = [item['id'] for item in current_hero['works']]
saved_hero = call('/technician/works/hero-recommendations', 'PUT', {
    'workIds': [work_id], 'expectedWorkIds': current_ids,
}, tokens['technician'])
assert [item['id'] for item in saved_hero['works']] == [work_id]
client_home = call('/client/home', token=tokens['client'])
assert client_home['technician']['id'] == 1
assert [item['id'] for item in client_home['works']] == [work_id]
checks.append('approved work public detail, technician Hero save and bound client Hero display')
payload = {
    'techId': 1, 'applicationKey': 'qa-smoke-' + str(time.time_ns()),
    'serviceDate': (datetime.date.today() + datetime.timedelta(days=3)).isoformat(),
    'startTime': '14:00', 'serviceType': '到店美甲',
    'shopAddress': {'name': '隔离测试店'}, 'selectedServiceIds': ['qa-basic'],
    'remark': '隔离环境冒烟测试，非真实预约',
}
order = call('/client/orders', 'POST', payload, tokens['client'], 201)
assert order['status'] == 'pending_confirm' and order['quotePrice'] == 128
repeat = call('/client/orders', 'POST', payload, tokens['client'], 201)
assert repeat['id'] == order['id']
confirmed = call('/technician/orders/' + str(order['id']) + '/confirm', 'PATCH', {
    'price': 150, 'depositAmount': 50, 'isDepositPaid': True,
}, tokens['technician'])
assert confirmed['status'] == 'pending_shop'
confirmed_detail = call('/technician/orders/' + str(order['id']), token=tokens['technician'])
assert confirmed_detail['quotePrice'] == 150
assert confirmed_detail['depositAmount'] == 50
assert confirmed_detail['isDepositPaid'] is True
call('/client/orders/' + str(order['id']) + '/status', 'PATCH', {'status': 'cancelled'}, tokens['client'])
detail = call('/technician/orders/' + str(order['id']), token=tokens['technician'])
assert detail['status'] == 'cancelled'
checks.append('QA booking creation, idempotent retry, final price/deposit confirmation and cancellation')
manifest = json.loads((private / 'wxapp/qa-build.json').read_text())
assert manifest['appid'] == 'touristappid' and manifest['apiBaseUrl'] == base.removesuffix('/api')
assert all('https://api.lunails.cn' not in file.read_text() for file in (private / 'wxapp').rglob('*.js'))
checks.append('separate simulator AppID and no production API fallback in copied JS')
report = {'checkedAt': datetime.datetime.now().astimezone().isoformat(), 'checks': checks, 'testOrderId': order['id'], 'testOrderStatus': 'cancelled', 'simulatorOnly': True}
(private / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False, indent=2))
