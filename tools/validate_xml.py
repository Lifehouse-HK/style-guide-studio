"""Validate stdin against the vendored OASIS schema without external entities/network."""
from pathlib import Path
import sys
from lxml import etree
root = Path(__file__).resolve().parents[1]
parser = etree.XMLParser(resolve_entities=False, no_network=True, load_dtd=False)
source = sys.stdin.buffer.read(40_000_001)
if len(source) > 40_000_000 or b'<!DOCTYPE' in source.upper() or b'<!ENTITY' in source.upper():
    raise ValueError('Unsafe XML input')
schema = etree.XMLSchema(etree.parse(str(root / 'schemas/akn/akomantoso30.xsd'), parser))
schema.assertValid(etree.fromstring(source, parser))
