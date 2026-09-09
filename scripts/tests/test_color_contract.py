from pathlib import Path
import unittest, subprocess, re, json

ROOT=Path(__file__).resolve().parents[2]
class ColorContract(unittest.TestCase):
    def test_generated_outputs_are_current(self):
        subprocess.run(['python3',str(ROOT/'scripts/sync-colors.py'),'--check'],check=True,cwd=ROOT)
    def test_ui_palette_and_contrast(self):
        subprocess.run(['python3',str(ROOT/'scripts/check-colors.py')],check=True,cwd=ROOT)
    def test_miniprogram_components_use_class_scoped_tokens(self):
        generated=(ROOT/'client-wxapp/styles/component-tokens.generated.wxss').read_text()
        self.assertNotRegex(generated, r'(?m)^page\s*\{')
        self.assertIn('.nb-theme {', generated)
        for name in ['nav-bar','tab-bar','work-card']:
            base=ROOT/'client-wxapp/components'/name
            self.assertIn('component-tokens.generated.wxss', (base/'index.wxss').read_text())
            self.assertIn('nb-theme', (base/'index.wxml').read_text())

    def test_miniprogram_semantic_actions(self):
        semantic=json.loads((ROOT/'design-system/nailbook/miniprogram-semantics.json').read_text())
        self.assertTrue({'danger','money','textLink','success','softSurface'}.issubset(semantic))
        self.assertEqual(semantic['money'], '#B42332')
        css=(ROOT/'client-wxapp/styles/semantic-actions.wxss').read_text()
        self.assertRegex(css, r'\.semantic-link \{[^}]*background: transparent !important')
        self.assertIn('semantic-money', (ROOT/'client-wxapp/pages/technician/home/index.wxml').read_text())
        self.assertIn('uiColors.danger', (ROOT/'client-wxapp/pages/client/order-detail/index.js').read_text())
        self.assertIn('uiColors.danger', (ROOT/'client-wxapp/pages/technician/works/index.js').read_text())
        self.assertNotIn('semantic-danger', (ROOT/'client-wxapp/components/rest-day-calendar/index.wxml').read_text())

    def test_miniprogram_borderless_and_notification_contract(self):
        base=ROOT/'client-wxapp'
        self.assertRegex((base/'app.wxss').read_text(), r'button::after\s*\{\s*border:\s*0')
        self.assertIn('background: var(--nb-danger-surface)', (base/'styles/semantic-actions.wxss').read_text())
        self.assertIn('#287A4B', (base/'static/icons/notification-service.svg').read_text())
        self.assertIn('#6E6E73', (base/'static/icons/notification-system.svg').read_text())
        self.assertIn('item.isOnline === true', (base/'pages/client/chat/index.wxml').read_text())
        for entry in json.loads((ROOT/'docs/color-migration-2026-08-27/wechat-review/borderless-rules.json').read_text()):
            css=(ROOT/entry['file']).read_text()
            for selector, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css):
                selector=re.sub(r'/\*.*?\*/','',selector,flags=re.S).strip()
                if selector==entry['selector']:
                    self.assertNotRegex(body, r'border(?:-(?:top|right|bottom|left))?\s*:[^;]*solid',entry)

    def test_home_works_use_local_soft_shadow(self):
        base=ROOT/'client-wxapp'
        css=(base/'pages/technician/home/index.wxss').read_text()
        self.assertIn('--work-card-shadow: 0 2rpx 8rpx rgba(0, 0, 0, .08)', css)
        self.assertIn('.hw-wall { padding:8rpx;', css)
        self.assertIn('box-shadow:var(--work-card-shadow,', (base/'components/work-card/index.wxss').read_text())

    def test_technician_inbox_has_clear_read_states(self):
        base=ROOT/'client-wxapp/pages/technician/chat'
        markup=(base/'index.wxml').read_text()
        listing=markup.split('<!-- 消息列表 -->')[1].split('<!-- 空态 -->')[0]
        self.assertIn("item.unread ? 'is-unread' : 'is-read'", listing)
        self.assertIn('class="msg-title-group"', listing)
        self.assertNotIn('msg-type-badge', listing)
        self.assertNotIn('msg-right', listing)
        self.assertNotIn('_actionLabel', listing)
        self.assertIn('item.unreadCount > 99', listing)
        self.assertIn('bindtap="viewRelatedOrder"', markup)
        css=(base/'index.wxss').read_text()
        self.assertRegex(css, r'\.msg-card \{[^}]*background:var\(--nb-surface\);[^}]*box-shadow:none;')
        self.assertRegex(css, r'\.msg-unread-dot \{[^}]*width:6rpx; height:6rpx;')
        self.assertIn('.is-unread .msg-preview { color:var(--nb-secondary); }', css)

    def test_required_order_states_survive(self):
        expected={'pending_quote','pending_agree','pending_confirm','pending_home','pending_shop','in_progress','completed','cancelled'}
        for scope in ['technician-frontend','client-frontend']:
            s=(ROOT/scope/'src/utils/orderStatus.ts').read_text()
            self.assertTrue(expected.issubset(set(re.findall(r'\b(\w+):',s))))
    def test_neutral_tag_values_are_portable(self):
        s=(ROOT/'technician-frontend/src/pages/TagManagementPage.tsx').read_text()
        block=re.search(r'const TAG_COLORS = \[.*?\];',s,re.S)[0]
        self.assertNotIn('var(',block)
        self.assertIn('color: colorMeta.text',s)
        self.assertIn('neutralTagColors(custom.color)',(ROOT/'technician-frontend/src/pages/CustomersPage.tsx').read_text())
    def test_icons_have_distinct_states(self):
        base=ROOT/'client-wxapp/static/icons'
        self.assertIn('stroke="#6E6E73"',(base/'tab-home.svg').read_text())
        self.assertIn('fill="#245EA8"',(base/'tab-home-active.svg').read_text())
        self.assertNotIn('#6E6E73',(base/'tab-home-active.svg').read_text())
        self.assertIn('#FFFFFF',(base/'phone-white.svg').read_text())
    def test_work_status_icons_keep_semantic_colors(self):
        base=ROOT/'client-wxapp/static/icons'
        semantic=json.loads((ROOT/'design-system/nailbook/miniprogram-semantics.json').read_text())
        self.assertNotEqual(semantic['workPinned'], semantic['workFeatured'])
        for icon, role in [('status-pin', 'workPinned'), ('status-featured', 'workFeatured')]:
            svg=(base/f'{icon}.svg').read_text()
            self.assertIn(semantic[role], svg)
            self.assertNotIn('#6E6E73', svg)
    def test_artwork_color_options_remain_colorful(self):
        for f in ['client-wxapp/pages/client/customize-design/index.js','client-frontend/src/pages/CustomizeDesign.tsx']:
            s=(ROOT/f).read_text();block=re.search(r'const colorOptions = \[.*?\];',s,re.S)[0]
            self.assertIn('#FFB6C1',block)
            self.assertIn('#FFD700',block)
    def test_map_and_chart_do_not_receive_css_variables(self):
        s=(ROOT/'admin-frontend/src/pages/Dashboard.tsx').read_text()
        option=s[s.index('const subscriptionOption'):s.index('}, [data]);')]
        self.assertNotIn('var(',option)
        self.assertIn('decal',option)
if __name__=='__main__': unittest.main()
