import { useEffect, useState } from 'react';
import type { RecommendationSetDto } from '@probash/contracts';
import { apiRequest } from '../lib/api';
import { cacheResource, readCachedResource } from '../lib/offline';
import { Card, Notice, ResourceState, Screen, t, Value } from '../components/MobileUi';

export default function Matches() {
  const [data, setData] = useState<RecommendationSetDto>();
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        const response = await apiRequest<RecommendationSetDto>('/api/v1/me/passport/matches', {
          method: 'POST',
        });
        setData(response);
        await cacheResource('matches', response);
      } catch (caught) {
        const cached = await readCachedResource<RecommendationSetDto>('matches');
        if (cached) {
          setData(cached);
          setStale(true);
        } else setError(caught instanceof Error ? caught.message : 'request_failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Screen title={t('mobile.matches')} stale={stale}>
      <ResourceState
        loading={loading}
        error={error}
        empty={data ? data.work.length + data.study.length === 0 : false}
      />
      {data ? <Notice>{t(data.comparison.noteKey)}</Notice> : null}
      {data?.work.map((match) => (
        <Card key={`work-${match.candidateId}`}>
          <Value>{t('mobile.workMatch')}</Value>
          <Value>{match.candidateId}</Value>
          <Value>
            {match.hardEligibility} · {match.preparationScore}%
          </Value>
        </Card>
      ))}
      {data?.study.map((match) => (
        <Card key={`study-${match.candidateId}`}>
          <Value>{t('mobile.studyMatch')}</Value>
          <Value>{match.candidateId}</Value>
          <Value>
            {match.hardEligibility} · {match.preparationScore}%
          </Value>
        </Card>
      ))}
    </Screen>
  );
}
