# Bangladesh government handoffs

The platform prepares users and opens canonical official destinations. It does not
imitate BMET, OEP, RAIMS, BOESL/BRMS, an embassy, a visa authority or any other public
authority.

The official-action catalogue currently models BMET/OEP registration, RAIMS agency
verification, BOESL application and official complaint pathways, and can project
destination-authority actions from reviewed route sources. Each action includes the
authority, canonical URL, account/in-person needs, fee state, source, last verification
and legal-review marker.

## Status provenance

- `HANDED_OFF`: Probashjatra opened/provided the official destination.
- `USER_CONFIRMED_COMPLETE`: the applicant says they completed it.
- `AUTHORIZED_SYNC_COMPLETE`: reserved for a contractually and legally approved
  connector; no current connector produces this state.

A handoff or user confirmation is never displayed as government confirmation. External
reference numbers are accepted only from an authorized connector. Case-linked
completion is applicant-owned and audited.

Before production publication, an assigned Bangladesh regulatory owner must review the
canonical URLs, names, instructions, fees, availability and cadence. Government API,
identity/biometric and status-sync work remains `LEGAL_REVIEW_REQUIRED` and disabled
until authorization exists.
