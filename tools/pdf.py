"""Free Chromium print adapter with stable named destinations and atomic output."""
from pathlib import Path
import argparse
import json
import os
import subprocess
import tempfile
import time
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject, TextStringObject
ROOT=Path(__file__).resolve().parents[1]

def render(source: str, output: Path):
    if len(source.encode())>40_000_000: raise ValueError('HTML exceeds 40 MB')
    output.parent.mkdir(parents=True,exist_ok=True)
    started=time.perf_counter()
    with tempfile.TemporaryDirectory(prefix='.pdf-',dir=output.parent) as work:
        work=Path(work);html=work/'source.html';pdf=work/'rendered.pdf';final=work/'finished.pdf'
        html.write_text(source)
        command=['node',str(ROOT/'node_modules/tsx/dist/cli.mjs'),str(ROOT/'tools/pdf-chromium.ts'),str(html.resolve()),str(pdf.resolve())]
        run=subprocess.run(command,cwd=ROOT,check=True,capture_output=True,text=True,timeout=90)
        reader=PdfReader(pdf);writer=PdfWriter();writer.clone_document_from_reader(reader)
        # Chromium creates Name-object destinations only for referenced anchors.
        # Add string-key aliases for portable #nameddest= URLs while preserving tags.
        names=reader.named_destinations
        writer.root_object.pop(NameObject('/Dests'),None)
        def convert_link(obj):
            if isinstance(obj.get('/Dest'),NameObject):obj[NameObject('/Dest')]=TextStringObject(str(obj['/Dest']).lstrip('/'))
            action=obj.get('/A')
            if action:
                action=action.get_object()
                if action.get('/S')=='/GoTo' and isinstance(action.get('/D'),NameObject):action[NameObject('/D')]=TextStringObject(str(action['/D']).lstrip('/'))
        for page in writer.pages:
            for annotation in page.get('/Annots',[]):convert_link(annotation.get_object())
        def outlines(node):
            while node:
                obj=node.get_object();convert_link(obj)
                if obj.get('/First'):outlines(obj['/First'])
                node=obj.get('/Next')
        if writer.root_object.get('/Outlines'):outlines(writer.root_object['/Outlines'])
        for key,dest in names.items():
            page=reader.get_destination_page_number(dest)
            writer.add_named_destination_array(str(key).lstrip('/'),ArrayObject([writer.pages[page].indirect_reference,*dest.dest_array[1:]]))
        if 'document' not in names:
            writer.add_named_destination_array('document',ArrayObject([writer.pages[0].indirect_reference,NameObject('/Fit')]))
        with final.open('wb') as file:writer.write(file);file.flush();os.fsync(file.fileno())
        checked=PdfReader(final)
        if '/StructTreeRoot' not in checked.trailer['/Root']:raise ValueError('Finishing lost PDF structure tags')
        destinations={key:checked.get_destination_page_number(dest)+1 for key,dest in checked.named_destinations.items()}
        report={'pages':len(checked.pages),'destinations':destinations,'seconds':round(time.perf_counter()-started,3),'bytes':final.stat().st_size,'renderer':json.loads(run.stdout)}
        os.replace(final,output)
        return report

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('html',type=Path);parser.add_argument('pdf',type=Path);args=parser.parse_args()
    print(json.dumps(render(args.html.read_text(),args.pdf),ensure_ascii=False))
