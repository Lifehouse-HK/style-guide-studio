"""Verify real PDF destinations, URLs, page shape and full table content."""
import json
import re
from pathlib import Path
from pypdf import PdfReader
root = Path('work/pdf-check')
expected = json.loads((root / 'expected.json').read_text())
for language in ['en', 'zh', 'parallel']:
    reader = PdfReader(root / (language + '.pdf'))
    destinations = {str(k).lstrip('/') for k in reader.named_destinations}
    missing = set(expected['targets']) - destinations
    assert not missing, (language, missing)
    assert bool(reader.trailer['/Root'].get('/MarkInfo', {}).get('/Marked')), language
    width, height = float(reader.pages[0].mediabox.width), float(reader.pages[0].mediabox.height)
    assert (width > height) == (language == 'parallel'), (language, width, height)
    text = '\n'.join(page.extract_text() for page in reader.pages)
    assert 'Term70' in re.sub(r'\s+', '', text) and '詞彙70' in re.sub(r'\s+', '', text), language
    uris = [str(annotation.get_object().get('/A', {}).get('/URI', '')) for page in reader.pages for annotation in page.get('/Annots', [])]
    assert expected['uri'].replace('/en.pdf', '/zh.pdf' if language == 'zh' else '/en.pdf') in uris, (language, uris)
    assert all('.html' not in uri for uri in uris), uris
    print(f'{language}: {len(reader.pages)} pages; {len(destinations)} destinations; text, tagging and PDF links passed')
