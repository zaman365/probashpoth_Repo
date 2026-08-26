import type { Metadata } from 'next';
import { Badge, Card, Grid, Icon, Section, Stat, StatGroup } from '@probash/web-ui';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace } from '@/db/operations';
import { localeSegment, parseLocaleParam, translator } from '@/lib/i18n';
import { canonicalMetadata } from '@/lib/seo';
import { ConfirmSubmitButton, DocumentUploadForm } from '@/components/OperationalForms';
import { deleteDocumentAction } from '../operational-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const t = translator(locale);
  return canonicalMetadata({
    locale,
    path: '/documents',
    title: t('operations.documentsTitle'),
    description: t('operations.documentsLead'),
  });
}

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: segment } = await params;
  const locale = parseLocaleParam(segment);
  const seg = localeSegment(locale);
  const t = translator(locale);
  const user = await requireChatGPTUser(`/${seg}/documents`);
  const workspace = await getWorkspace(user.userId);
  const totalBytes = workspace.documents.reduce((sum, document) => sum + document.sizeBytes, 0);
  const journeys = workspace.journeys.map(({ id, title }) => ({ id, title }));

  return (
    <>
      <Section
        surface="warm"
        headingLevel={1}
        eyebrow={t('operations.protected')}
        title={t('operations.documentsTitle')}
        lead={t('operations.documentsLead')}
      >
        <StatGroup>
          <Stat label={t('operations.files')} value={String(workspace.documents.length)} />
          <Stat
            label={t('operations.storageUsed')}
            value={`${(totalBytes / 1024 / 1024).toFixed(1)} MB`}
          />
          <Stat
            label={t('operations.pendingReview')}
            value={String(
              workspace.documents.filter((item) => item.verificationStatus === 'pending_review')
                .length,
            )}
          />
        </StatGroup>
      </Section>
      <Section surface="default">
        <Grid min={360}>
          <DocumentUploadForm locale={locale} localeSegment={seg} journeys={journeys} />
          <Card tone="muted">
            <Icon name="shield" size={28} />
            <h2 className="card-title">{t('operations.documentSafetyTitle')}</h2>
            <p>{t('operations.documentSafetyBody')}</p>
            <ul className="stack compact-list">
              <li>{t('operations.documentSafety1')}</li>
              <li>{t('operations.documentSafety2')}</li>
              <li>{t('operations.documentSafety3')}</li>
            </ul>
          </Card>
        </Grid>
      </Section>
      <Section surface="muted" title={t('operations.yourDocuments')}>
        {workspace.documents.length === 0 ? <p>{t('operations.noDocuments')}</p> : null}
        <Grid min={300}>
          {workspace.documents.map((document) => (
            <Card key={document.id}>
              <Badge tone="warning">{t('operations.statusPending')}</Badge>
              <h3 className="card-title">{document.label}</h3>
              <p className="muted">{document.filename}</p>
              <p>
                {document.category} · {(document.sizeBytes / 1024).toFixed(0)} KB
              </p>
              <div className="hub-actions">
                <a className="btn btn-secondary" href={`/api/files/${document.id}`}>
                  {t('operations.download')}
                </a>
                <form action={deleteDocumentAction}>
                  <input type="hidden" name="locale" value={seg} />
                  <input type="hidden" name="documentId" value={document.id} />
                  <ConfirmSubmitButton
                    label={t('operations.delete')}
                    confirmation={t('operations.deleteConfirm')}
                  />
                </form>
              </div>
            </Card>
          ))}
        </Grid>
      </Section>
    </>
  );
}
