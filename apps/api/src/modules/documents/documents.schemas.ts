import { z } from 'zod';

export const uploadDocumentBodySchema = z.object({
  isSensitive: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .optional()
    .transform((value) => value === true || value === 'true'),
});

export type UploadDocumentBody = z.infer<typeof uploadDocumentBodySchema>;
