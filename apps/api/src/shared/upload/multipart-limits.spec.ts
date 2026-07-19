import {
  internalDocumentMultipartLimits,
  publicCaseMultipartLimits,
} from './multipart-limits';

describe('multipart limits', () => {
  it('bounds every public intake multipart resource', () => {
    expect(publicCaseMultipartLimits).toEqual({
      fileSize: 10 * 1024 * 1024,
      files: 5,
      fields: 1,
      fieldNameSize: 100,
      fieldSize: 64 * 1024,
      parts: 7,
    });
  });

  it('allows one internal document and one metadata field only', () => {
    expect(internalDocumentMultipartLimits).toEqual({
      fileSize: 10 * 1024 * 1024,
      files: 1,
      fields: 1,
      fieldNameSize: 100,
      fieldSize: 1024,
      parts: 3,
    });
  });
});
