import type { Options } from 'multer';

const MAX_MULTIPART_FIELD_NAME_BYTES = 100;

export const publicCaseMultipartLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 5,
  fields: 1,
  fieldNameSize: MAX_MULTIPART_FIELD_NAME_BYTES,
  fieldSize: 64 * 1024,
  // Busboy raises LIMIT_PART_COUNT when the configured boundary is reached.
  parts: 7,
} satisfies Options['limits'];

export const internalDocumentMultipartLimits = {
  fileSize: 10 * 1024 * 1024,
  files: 1,
  fields: 1,
  fieldNameSize: MAX_MULTIPART_FIELD_NAME_BYTES,
  fieldSize: 1024,
  parts: 3,
} satisfies Options['limits'];
