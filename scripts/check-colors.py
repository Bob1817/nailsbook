"""Reject non-palette chromatic UI values; does not claim rendered accessibility."""
from pathlib import Path
import re,json,sys
ROOT=Path(__file__).resolve().parents[1]
P=json.loads((ROOT/'design-system/nailbook/colors.json').read_text())
SEM=json.loads((ROOT/'design-system/nailbook/miniprogram-semantics.json').read_text())
scopes=['client-wxapp/pages','client-wxapp/components','client-wxapp/styles','client-wxapp/utils','technician-frontend/src','client-frontend/src','admin-frontend/src','website/src','landing-frontend/src','mobile-flutter/lib','ios/NailBook']
# Content-only blocks: nail colors and photo filters are not UI decoration.
content_blocks={
 'client-wxapp/pages/client/customize-design/index.js':['colorOptions'],
 'client-frontend/src/pages/CustomizeDesign.tsx':['colorOptions'],
 'client-wxapp/pages/client/ai-photo/index.js':['FILTERS'],
}
allowed={v.upper() for v in [*P.values(),*SEM.values()]}
def rgb(h):
 h=h.lstrip('#')
 if len(h)==3:h=''.join(c*2 for c in h)
 return tuple(int(h[i:i+2],16) for i in (0,2,4))
def permitted(h):
 a=rgb(h)
 return h[:7].upper() in allowed or max(a)==min(a)
issues=[]
for scope in scopes:
 for p in (ROOT/scope).rglob('*'):
  if p.suffix not in ['.css','.wxss','.tsx','.ts','.js','.wxml','.dart','.swift'] or '.generated.' in p.name or p.name.endswith(('.test.tsx','.test.ts','.spec.ts')):continue
  rel=str(p.relative_to(ROOT));s=p.read_text()
  s=s.split('// BEGIN GENERATED COLOR PRIMITIVES')[0]
  for name in content_blocks.get(rel,[]):
   s=re.sub(r'const '+name+r' = \[.*?\];',lambda m:'\n'*m[0].count('\n'),s,flags=re.S)
  if rel=='client-wxapp/pages/client/ai-photo/index.js':
   # User-selected exported poster artwork, not app chrome or controls.
   s=re.sub(r"const palette = theme === 'art'.*?;",lambda m:'\n'*m[0].count('\n'),s,flags=re.S)
  s=re.sub(r'/\*.*?\*/',lambda m:'\n'*m[0].count('\n'),s,flags=re.S)
  for n,line in enumerate(s.splitlines(),1):
   if line.lstrip().startswith('//'):continue
   line=re.sub(r'\s+//.*','',line)
   hits=[]
   for m in re.finditer(r'#[\da-fA-F]{8}\b|#[\da-fA-F]{6}\b|#[\da-fA-F]{3}\b',line):
    if not permitted(m[0]):hits.append(m[0])
   for m in re.finditer(r'Color\(0x([\da-fA-F]{8})\)|Color\(hex:\s*"([\da-fA-F]{6})"\)',line):
    h='#'+(m[1][2:] if m[1] else m[2])
    if not permitted(h):hits.append(m[0])
   for m in re.finditer(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)',line):
    h='#'+''.join(f'{int(m[i]):02X}' for i in [1,2,3])
    if not permitted(h):hits.append(m[0])
   hits+=re.findall(r'\b(?:bg|text|border|ring|from|via|to|shadow|fill|stroke)-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d+',line)
   hits+=re.findall(r'\bColors\.(?:red|orange|yellow|green|blue|purple|pink|teal|amber|indigo)\b',line)
   if hits:issues.append({'file':rel,'line':n,'values':hits})
# Referenced browser icons are UI assets too; unused scaffold artwork is excluded.
for rel in ['client-frontend/public/favicon.svg','website/public/favicon.svg']:
 for h in re.findall(r'#[\da-fA-F]{6}',(ROOT/rel).read_text()):
  if not permitted(h):issues.append({'file':rel,'values':[h]})
# App and component scope variables share the exact generated source.
text_roles=[('inverse','action'),('inverse','actionPressed'),('ink','surface'),('muted','surface'),('muted','page'),('secondary','pressed'),('link','activeSurface')]
def lum(h):
 c=[v/255 for v in rgb(h)];c=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in c]
 return sum(a*b for a,b in zip(c,[.2126,.7152,.0722]))
for role in ['danger','money','textLink','success','customerDue']:
 value=SEM[role]
 for bg in ['surface','page']:
  a,b=sorted([lum(value),lum(P[bg])]);assert (b+.05)/(a+.05)>=4.5,(role,bg)
for fg,bg in [('danger','dangerSurface'),('success','successSurface'),('textLink','softSurface')]:
 a,b=sorted([lum(SEM[fg]),lum(SEM[bg])]);assert (b+.05)/((a+.05))>=4.5,(fg,bg)
for fg,bg in text_roles:
 a,b=sorted([lum(P[fg]),lum(P[bg])]);assert (b+.05)/(a+.05)>=4.5,(fg,bg)
for p in (ROOT/'client-wxapp/static/icons').glob('*.svg'):
 if p.name=='wechat.svg':continue
 for h in re.findall(r'#[\da-fA-F]{6}',p.read_text()):
  assert h.upper() in allowed,(p,h)
print(json.dumps(issues,ensure_ascii=False,indent=2) if issues else 'Color gate passed: approved UI values, content exceptions, icon palette and semantic text contrast.')
sys.exit(bool(issues))
