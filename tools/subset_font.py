"""Embed a static subset using only the source's code points, avoiding unused cmap aliases."""
from pathlib import Path
import base64
import io
import sys
from html.parser import HTMLParser
from fontTools.ttLib import TTFont
from fontTools import subset
from fontTools.varLib.instancer import instantiateVariableFont
class Text(HTMLParser):
    def __init__(self): super().__init__(convert_charrefs=True); self.parts=[]
    def handle_data(self,data): self.parts.append(data)
p=Text();p.feed(Path(sys.argv[1]).read_text());characters=set(''.join(p.parts))
font=TTFont(Path(__file__).resolve().parents[1]/'assets/fonts/NotoSerifTC.ttf')
font=instantiateVariableFont(font,{'wght':400},inplace=True)
options=subset.Options();options.layout_features=['*'];sub=subset.Subsetter(options=options)
sub.populate(unicodes={ord(c) for c in characters});sub.subset(font)
# A PDF renderer may choose one Unicode value for aliases of the same glyph.
# Reject genuine ambiguity rather than silently normalizing literal text.
cmap=font.getBestCmap();glyphs={}
for code,glyph in cmap.items():
    if glyph in glyphs and glyphs[glyph]!=code:
        raise ValueError(f'Font aliases U+{code:04X} and U+{glyphs[glyph]:04X}; literal output requires a distinct-glyph font.')
    glyphs[glyph]=code
buf=io.BytesIO();font.save(buf);print(base64.b64encode(buf.getvalue()).decode())
