# @probash/web-ui

Presentational primitives for every **web** surface: the public website, the
worker/student PWA, and the employer / agency / admin / provider portals as they land.

## Why this package exists

§43 separates `web-ui` from `mobile-ui` on purpose: the implementations cannot be
shared (DOM vs. React Native), but the **contract** must be. So this package fixes the
vocabulary — variant names, tone names, size names, spacing steps — and a future
`@probash/mobile-ui` mirrors the same props with native views.

That is what makes the mobile app cheap to start: a screen written against
`Button variant="primary" size="lg"` and `Badge tone="danger"` translates one-to-one,
and the values behind those names come from `@probash/design-tokens`, which both
platforms already read.

## Rules

1. **No business logic.** These components render; they never decide. Verification
   levels, eligibility outcomes and money are computed in `packages/*` and passed in.
2. **No literal copy.** Every string is a prop, resolved from `@probash/i18n` by the
   caller (ADR 0002).
3. **No colour-only meaning.** A tone always ships with text, and usually an icon.
4. **Server-safe.** Nothing here uses `use client`, state or effects, so pages stay
   server-rendered and cheap on a slow connection.
5. **Tokens only.** No hard-coded hex, px or font stacks — every value resolves to a
   CSS variable generated from `@probash/design-tokens`.

## Control sizing

One rule, applied everywhere: **height is chosen by the input device, not by taste.**

| Step           | Mouse | Finger (`pointer: coarse`) | Used by                                                  |
| -------------- | ----- | -------------------------- | -------------------------------------------------------- |
| `sm`           | 36px  | 48px                       | nav links, dense chips                                   |
| `md`           | 44px  | 48px                       | default buttons, inputs, segmented controls, disclosures |
| `lg`           | 52px  | 56px                       | hero calls to action                                     |
| worker primary | 56px  | 56px                       | the seven action tiles — always, on every device         |

The navigation bar is 64px, and the scale is required to stay clear of it: a 52px
button beside a 64px bar is what made the chrome look unfinished. A test in
`@probash/design-tokens` asserts the ordering and the gap.

React Native has no `pointer: coarse` — it is always coarse — so `@probash/mobile-ui`
uses the touch column of that table and nothing else.

## The contract mobile will mirror

| Component    | Props that must match in `mobile-ui`                                         |
| ------------ | ---------------------------------------------------------------------------- |
| `Button`     | `variant: primary \| secondary \| danger \| ghost`, `size: md \| lg`, `full` |
| `Badge`      | `tone: neutral \| success \| warning \| danger \| info`, `icon`              |
| `Card`       | `tone: default \| muted \| warm \| accent`, `interactive`                    |
| `Section`    | `surface: default \| muted \| warm \| accent`, `eyebrow`, `title`, `lead`    |
| `Stat`       | `label`, `value`, `hint`                                                     |
| `Grid`       | `min` (minimum column width before wrapping)                                 |
| `Stack`      | `gap: sm \| md \| lg`                                                        |
| `Disclosure` | `summary`, `children`, `defaultOpen`                                         |
| `Icon`       | `name` from a fixed set, `size`                                              |

## Usage

```tsx
import '@probash/web-ui/styles.css';
import { Button, Card, Section } from '@probash/web-ui';
```
