"""Check physical geometry in the rendered PDFs, not only CSS declarations."""
from pathlib import Path
import pdfplumber
root = Path('work/print-layout')
for language in ['en', 'zh', 'parallel']:
    with pdfplumber.open(root / f'{language}.pdf') as pdf:
        side = 51 if language == 'parallel' else 90
        for number, page in enumerate(pdf.pages, 1):
            chars = page.chars
            assert chars, (language, number, 'empty page')
            assert min(c['x0'] for c in chars) >= side - 1, (language, number, 'left overflow')
            assert max(c['x1'] for c in chars) <= page.width - side + 1, (language, number, 'right overflow')
            assert max(c['bottom'] for c in chars) <= page.height - 72 + 2, (language, number, 'footer overflow')
            header = [c for c in chars if c['top'] < 65]
            if number == 1:
                assert not header, (language, 'first page must not have a running header')
            else:
                words = page.extract_words()
                page_number = [w for w in words if w['text'] == str(number) and w['top'] < 65]
                assert page_number, (language, number, 'missing running page number')
                at = page_number[0]
                if number % 2 == 0:
                    assert abs(at['x0'] - side) < 1, (language, number, 'even number not on outside edge')
                else:
                    assert abs(at['x1'] - (page.width - side)) < 1, (language, number, 'odd number not on outside edge')
        if language == 'en':
            first = pdf.pages[0]
            title = [c for c in first.chars if c['size'] > 20 and c['text'].isalpha()]
            assert any(abs(c['size'] - 24) < .1 for c in title), '24pt title'
            paragraphs = [l for l in pdf.pages[1].extract_text_lines() if l['text'].startswith('(1) A writer')]
            assert paragraphs, 'specimen has a wrapped subsection'
            line = paragraphs[0]
            body = [w for w in pdf.pages[1].extract_words() if abs(w['top']-line['top']) < .1]
            assert abs(body[1]['x0'] - 126) < 1, '36pt subsection indent'
            assert all(abs(c['size']-11) < .1 for c in line['chars']), '11pt body text'
        print(f'{language}: {len(pdf.pages)} pages; physical margins, header positions and overflow checks passed')
