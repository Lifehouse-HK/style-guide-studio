import { render, type Layout } from '../modules/render.ts';
import { proposed } from '../modules/amendments.ts';
import type { Workspace } from '../modules/project.ts';
/** Separate print expression: external destinations point to PDFs, not browser pages. */
export async function printHtml(
  workspace: Workspace,
  layout: Layout,
  logo: string,
  proposedText = false,
) {
  const doc = workspace.document;
  if (proposedText && doc.type === 'amendment') {
    if (!workspace.source) throw Error('Load the principal source first.');
    const revision = await proposed(workspace.source, doc);
    return render(revision.guide, {
      layout,
      logo,
      pdf: true,
      proposed: true,
      revision,
      catalogues: workspace.catalogues,
    });
  }
  return render(
    doc,
    { layout, logo, pdf: true, catalogues: workspace.catalogues },
    workspace.source,
  );
}
export async function printPublication(
  workspace: Workspace,
  layout: Layout,
  logo: string,
  proposedText = false,
) {
  const html = await printHtml(workspace, layout, logo, proposedText);
  document.getElementById('pdf-print-frame')?.remove();
  const frame = document.createElement('iframe');
  frame.id = 'pdf-print-frame';
  frame.title = 'PDF print document';
  frame.style.cssText = 'position:fixed;left:-10000px;width:1000px;height:800px;border:0';
  await new Promise<void>((resolve, reject) => {
    frame.onload = async () => {
      try {
        await frame.contentDocument!.fonts.ready;
        await Promise.all([...frame.contentDocument!.images].map((i) => i.decode()));
        resolve();
      } catch (e) {
        reject(e);
      }
    };
    frame.srcdoc = html;
    document.body.append(frame);
  });
  frame.contentWindow!.addEventListener('afterprint', () => frame.remove(), { once: true });
  frame.contentWindow!.focus();
  frame.contentWindow!.print();
}
