import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('qa_preview', ROOT / 'deploy/qa-preview/prepare-wxapp.py')
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class PreviewBuildTest(unittest.TestCase):
    def test_simulator_copy_does_not_modify_production_and_has_no_api_fallback(self):
        source = ROOT / 'client-wxapp/app.js'
        before = source.read_bytes()
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'wxapp'
            preview.prepare('http://127.0.0.1:3300', 'touristappid', output)
            self.assertEqual(source.read_bytes(), before)
            self.assertEqual(json.loads((output / 'project.config.json').read_text())['appid'], 'touristappid')
            for file in output.rglob('*.js'):
                self.assertNotIn('https://api.lunails.cn', file.read_text())
                self.assertNotIn('http://localhost:3000', file.read_text())
            self.assertIn('测试 · {{title}}', (output / 'components/nav-bar/index.wxml').read_text())
            self.assertFalse((output / 'project.private.config.json').exists())
            with self.assertRaises(ValueError):
                preview.prepare('http://127.0.0.1:3300', 'touristappid', output)

    def test_rejects_production_appid_endpoint_and_remote_http(self):
        appid = json.loads((ROOT / 'client-wxapp/project.config.json').read_text())['appid']
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'wxapp'
            for base, testid in [('https://api.lunails.cn', 'touristappid'), ('http://qa.example.com', 'touristappid'), ('https://qa.example.com', appid)]:
                with self.assertRaises(ValueError):
                    preview.prepare(base, testid, output)
                self.assertFalse(output.exists())

    def test_https_experience_copy_keeps_domain_validation_enabled(self):
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'wxapp'
            result = preview.prepare('https://qa-api.example.com', 'wx1111111111111111', output)
            self.assertFalse(result['simulatorOnly'])
            config = json.loads((output / 'project.config.json').read_text())
            self.assertTrue(config['setting']['urlCheck'])
            self.assertIn("apiBaseUrl: 'https://qa-api.example.com'", (output / 'app.js').read_text())


if __name__ == '__main__':
    unittest.main()
