import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import type { DocumentSummaryDto } from '@probash/contracts';
import { useCachedResource } from '../lib/use-cached-resource';
import { queueDocumentUpload, uploadDocument } from '../lib/offline';
import {
  ActionButton,
  Card,
  Notice,
  ResourceState,
  Screen,
  t,
  Value,
} from '../components/MobileUi';

export default function Documents() {
  const resource = useCachedResource<DocumentSummaryDto[]>('documents', '/api/v1/me/documents');
  const [message, setMessage] = useState<string>();

  async function pickDocument() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0]!;
    const input = {
      uri: asset.uri,
      contentType: asset.mimeType ?? 'application/octet-stream',
      documentType: 'other',
      label: { bn: asset.name, en: asset.name },
    };
    try {
      await uploadDocument(input);
      setMessage(t('mobile.uploadComplete'));
      await resource.refresh();
    } catch {
      await queueDocumentUpload(input);
      setMessage(t('mobile.uploadQueued'));
    }
  }

  return (
    <Screen title={t('mobile.documents')} stale={resource.stale}>
      <Notice>{t('mobile.documentPrivacy')}</Notice>
      <ActionButton label={t('mobile.chooseDocument')} onPress={() => void pickDocument()} />
      {message ? <Notice>{message}</Notice> : null}
      <ResourceState
        loading={resource.loading}
        error={resource.error}
        empty={resource.data?.length === 0}
      />
      {resource.data?.map((document) => (
        <Card key={document.id}>
          <Value>{document.label.bn}</Value>
          <Value>{document.verificationLevel}</Value>
          <Value>{document.malwareScanStatus}</Value>
        </Card>
      ))}
    </Screen>
  );
}
