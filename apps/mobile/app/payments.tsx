import { useEffect, useState } from 'react';
import type { CaseDetailDto, PaymentIntentDto } from '@probash/contracts';
import { apiRequest } from '../lib/api';
import { cacheResource, readCachedResource } from '../lib/offline';
import { Card, Notice, ResourceState, Screen, t, Value } from '../components/MobileUi';

interface PaymentGroup {
  caseId: string;
  destinationCountry: string;
  payments: PaymentIntentDto[];
}

export default function Payments() {
  const [groups, setGroups] = useState<PaymentGroup[]>();
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const cases = await apiRequest<CaseDetailDto[]>('/api/v1/cases');
        const response = await Promise.all(
          cases.map(async (item) => ({
            caseId: item.id,
            destinationCountry: item.destinationCountry,
            payments: await apiRequest<PaymentIntentDto[]>(
              `/api/v1/cases/${encodeURIComponent(item.id)}/payment-intents`,
            ),
          })),
        );
        setGroups(response);
        await cacheResource('payments', response);
      } catch (caught) {
        const cached = await readCachedResource<PaymentGroup[]>('payments');
        if (cached) {
          setGroups(cached);
          setStale(true);
        } else setError(caught instanceof Error ? caught.message : 'request_failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Screen title={t('mobile.payments')} stale={stale}>
      <Notice tone="warning">{t('cost.payOnlyHere')}</Notice>
      <ResourceState
        loading={loading}
        error={error}
        empty={groups?.every((group) => group.payments.length === 0)}
      />
      {groups?.flatMap((group) =>
        group.payments.map((payment) => (
          <Card key={payment.id}>
            <Value>{group.destinationCountry}</Value>
            <Value>
              {payment.amount.minorUnits} {payment.amount.currency}
            </Value>
            <Value>{payment.status}</Value>
            {payment.isSandbox ? (
              <Notice tone="warning">{t('mobile.sandboxPayment')}</Notice>
            ) : null}
          </Card>
        )),
      )}
    </Screen>
  );
}
