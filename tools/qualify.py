"""Final three-output qualification. Use after tools/render-specimens.ts."""
from pathlib import Path
import json
from pypdf import PdfReader
from pdf import render
out=Path('work/qualification');reports={}
for layout in ['en','zh-Hant','parallel']:
    reports[layout]=render((out/f'{layout}.html').read_text(),out/f'final-{layout}.pdf')
    r=PdfReader(out/f'final-{layout}.pdf');text=''.join(p.extract_text() for p in r.pages)
    assert all((p.mediabox.width>p.mediabox.height)==(layout=='parallel') for p in r.pages)
    assert 'n_s5' in r.named_destinations and 'n_sch1' in r.named_destinations
    assert len(r.outline)>0
    assert '恩典 150' in text
    if layout in ['en','parallel']:assert 'EN-END' in text
    if layout in ['zh-Hant','parallel']:assert '中文結束' in text and '本條較長' in text
    if layout=='en':assert '本條較長' not in text
    if layout=='zh-Hant':assert 'An exact long provision' not in text
(out/'final-report.json').write_text(json.dumps(reports,indent=2))
print(json.dumps(reports,indent=2))
