import { redirect } from 'next/navigation';

/** §16 — bn-BD is the default; `/` is never an English page. */
export default function Index() {
  redirect('/bn');
}
