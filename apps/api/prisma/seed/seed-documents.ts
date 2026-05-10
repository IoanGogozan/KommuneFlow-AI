import { PrismaClient } from '@prisma/client';
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
    const data = {
      tenantId,
      caseId: demoCase.id,
      uploadedByCitizenProfileId: index === 0 ? citizenProfileId : null,
      uploadedByUserId: index === 0 ? null : adminUserId,
      originalFileName: fileName,
      storageKey: `demo/${tenantId}/${demoCase.id}/${fileName}`,
      mimeType: mimeTypeFor(fileName),
      sizeBytes: 18_000 + index * 1_000,
      checksumSha256: `seed_checksum_${documentId}`,
      isSensitive: demoCase.category === 'health_care',
    };

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
