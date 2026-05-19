import { BadRequestException, StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';
import { DocumentsController } from './documents.controller';

describe('DocumentsController', () => {
  const user = {
    id: 'user_1',
    tenantId: 'tenant_1',
    departmentId: 'department_1',
    email: 'worker@example.local',
    role: 'case_worker',
  } as never;

  it('lists documents through the service with current-user scoping', async () => {
    const listForCase = jest.fn().mockResolvedValue([{ id: 'doc_1' }]);
    const controller = new DocumentsController({ listForCase } as never);

    await expect(controller.listForCase('case_1', user)).resolves.toEqual([
      { id: 'doc_1' },
    ]);
    expect(listForCase).toHaveBeenCalledWith('case_1', user);
  });

  it('sets safe download headers and sanitizes attachment filenames', async () => {
    const stream = Readable.from(['document']);
    const getDownloadForCase = jest.fn().mockResolvedValue({
      stream,
      mimeType: 'application/pdf',
      sizeBytes: 8,
      fileName: 'bad"name\r\n.pdf',
    });
    const setHeader = jest.fn();
    const controller = new DocumentsController({ getDownloadForCase } as never);

    const result = await controller.downloadForCase('case_1', 'doc_1', user, {
      setHeader,
    } as never);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(getDownloadForCase).toHaveBeenCalledWith('case_1', 'doc_1', user);
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(setHeader).toHaveBeenCalledWith('Content-Length', '8');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="bad_name__.pdf"',
    );
  });

  it('validates upload payload before delegating to the service', async () => {
    const file = { originalname: 'case.pdf', size: 12 } as Express.Multer.File;
    const uploadForCase = jest.fn().mockResolvedValue({ id: 'doc_1' });
    const controller = new DocumentsController({ uploadForCase } as never);

    await expect(
      controller.uploadForCase('case_1', user, file, { isSensitive: 'true' }),
    ).resolves.toEqual({ id: 'doc_1' });

    expect(uploadForCase).toHaveBeenCalledWith('case_1', user, file, {
      isSensitive: true,
    });
  });

  it('returns a bad request for invalid upload metadata', async () => {
    const uploadForCase = jest.fn();
    const controller = new DocumentsController({ uploadForCase } as never);

    await expect(
      controller.uploadForCase('case_1', user, undefined, {
        isSensitive: 'not-a-boolean',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadForCase).not.toHaveBeenCalled();
  });

  it('soft deletes documents through the service with current-user scoping', async () => {
    const softDeleteForCase = jest.fn().mockResolvedValue({ id: 'doc_1' });
    const controller = new DocumentsController({ softDeleteForCase } as never);

    await expect(
      controller.softDeleteForCase('case_1', 'doc_1', user),
    ).resolves.toEqual({ id: 'doc_1' });
    expect(softDeleteForCase).toHaveBeenCalledWith('case_1', 'doc_1', user);
  });
});
