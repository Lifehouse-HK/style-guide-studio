import { z } from 'zod';
import { guideSchema } from './document.ts';
import { amendmentSchema } from './amendments.ts';
import { catalogueSchema } from './references.ts';
export const workspaceSchema = z
  .object({
    format: z.literal('lifehouse-workspace/2'),
    document: z.union([guideSchema, amendmentSchema]),
    source: guideSchema.optional(),
    origin: guideSchema.optional(),
    instruments: z.array(amendmentSchema).optional(),
    catalogues: z.array(catalogueSchema),
  })
  .strict();
export type Workspace = z.infer<typeof workspaceSchema>;
export function parseFile(text: string): Workspace {
  const data = JSON.parse(text);
  return data.format === 'lifehouse-workspace/2'
    ? workspaceSchema.parse(data)
    : {
        format: 'lifehouse-workspace/2',
        document: z.union([guideSchema, amendmentSchema]).parse(data),
        catalogues: [],
      };
}
