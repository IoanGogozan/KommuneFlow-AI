import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { DemoCase } from './types';
import { addMinutes } from './time';

export async function seedDocuments(
  prisma: PrismaClient,
  demoCase: DemoCase,
  tenantId: string,
  citizenProfileId: string,
  adminUserId: string,
  createdAt: Date,
) {
  for (const [index, fileName] of demoCase.documentNames.entries()) {
    const documentId = `${demoCase.id}_document_${index + 1}`;
    const content = documentContent(fileName, demoCase);
    const storageKey = `demo/${tenantId}/${demoCase.id}/${fileName}`;
    const data = {
      tenantId,
      caseId: demoCase.id,
      uploadedByCitizenProfileId: index === 0 ? citizenProfileId : null,
      uploadedByUserId: index === 0 ? null : adminUserId,
      originalFileName: fileName,
      storageKey,
      mimeType: mimeTypeFor(fileName),
      sizeBytes: content.length,
      checksumSha256: createHash('sha256').update(content).digest('hex'),
      isSensitive: demoCase.category === 'health_care',
    };

    await writeDemoDocument(storageKey, content);

    await prisma.caseDocument.upsert({
      where: { id: documentId },
      update: data,
      create: {
        id: documentId,
        ...data,
        createdAt: addMinutes(createdAt, 3 + index),
      },
    });
  }
}

function mimeTypeFor(fileName: string) {
  if (fileName.endsWith('.pdf')) {
    return 'application/pdf';
  }

  if (fileName.endsWith('.png')) {
    return 'image/png';
  }

  return 'image/jpeg';
}

async function writeDemoDocument(storageKey: string, content: Buffer) {
  const storagePath = resolve(getUploadStoragePath(), storageKey);

  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(storagePath, content);
}

function getUploadStoragePath() {
  return process.env.UPLOAD_STORAGE_PATH ?? './storage/uploads';
}

function documentContent(fileName: string, demoCase: DemoCase) {
  const text = `Demo document for ${demoCase.id}: ${fileName}\n`;

  if (fileName.endsWith('.pdf')) {
    return Buffer.from(`%PDF-1.4\n% KommuneFlow seed\n${text}%%EOF\n`);
  }

  if (fileName.endsWith('.png')) {
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from(text),
    ]);
  }

  return Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.from(text),
    Buffer.from([0xff, 0xd9]),
  ]);
}
