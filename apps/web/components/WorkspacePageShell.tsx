import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireChatGPTUser } from '@/app/chatgpt-auth';
import { getWorkspace, type JourneyPath } from '@/db/operations';
import { localeSegment, type Locale } from '@/lib/i18n';
import { JourneyWorkspaceShell, type WorkspaceDestination } from './JourneyWorkspaceShell';

export async function WorkspacePageShell({
  active,
  children,
  enabled,
  locale,
}: {
  active: WorkspaceDestination;
  children: ReactNode;
  enabled: boolean;
  locale: Locale;
}) {
  if (!enabled) return children;

  const seg = localeSegment(locale);
  const user = await requireChatGPTUser(`/${seg}/${active}?workspace=1`);
  const workspace = await getWorkspace(user.userId);
  if (!workspace.profile?.onboardingCompletedAt) redirect(`/${seg}/onboarding`);

  const profile = workspace.profile;
  const path: JourneyPath = profile.activePath === 'study' ? 'study' : 'work';
  const pathJourneys = workspace.journeys.filter((journey) => journey.path === path);
  const primaryJourney =
    pathJourneys.find((journey) => journey.status === 'active') ?? pathJourneys[0] ?? null;
  const completedTasks = primaryJourney?.tasks.filter((task) => task.status === 'done').length ?? 0;
  const progress = primaryJourney?.tasks.length
    ? Math.round((completedTasks / primaryJourney.tasks.length) * 100)
    : 0;
  const needsCount = [
    primaryJourney?.tasks.some((task) => task.status !== 'done'),
    workspace.unreadAlerts > 0,
    workspace.pendingVerifications > 0,
  ].filter(Boolean).length;

  return (
    <JourneyWorkspaceShell
      active={active}
      locale={locale}
      needsCount={needsCount}
      profile={profile}
      progress={progress}
      user={user}
    >
      <div className={`workspace-module-page workspace-module-${active}`}>{children}</div>
    </JourneyWorkspaceShell>
  );
}
