# Necra Design System

## Direction

Necra should feel like a beautifully typeset working paper: calm, exact, premium, and collaborative. It is not a generic analytics dashboard and should not resemble an AI chat console. The core visual motif is the margin note—evidence, changes, and decisions sit beside the relevant source instead of floating in abstract cards.

Avoid neon gradients, glassmorphism, oversized metric tiles, decorative charts, robot/sparkle imagery, chat bubbles as the primary workflow, and dense grids of interchangeable cards.

## Voice and terminology

- Prefer familiar nouns: agreement, instructions, evidence, finding, review, decision, history.
- Avoid unnecessary technical and AI terms. In user-facing copy, prefer “automated finding” to model jargon and name a provider only where provenance or troubleshooting requires it.
- Use neutral language: “may differ from the agreement,” not “the client violated scope.”
- Never call a request “approved,” a missing passage “contradicted,” or an automated finding “verified.”
- Put the next useful action in errors and empty states.

## Typography

- Display/editorial: `Newsreader`, variable serif, for page titles and short emphasis.
- Interface: `Inter`, variable sans-serif, for controls, labels, and body copy.
- Evidence metadata: `IBM Plex Mono`, for hashes, version labels, and timestamps only.
- Serve fonts locally when licensing permits; otherwise use resilient system fallbacks with no layout-breaking dependency.
- Body text: 16px minimum, 1.55 line height; evidence reading view: 17–18px, 1.65 line height, 68–76 character measure.
- Use sentence case. Do not use all caps except short accessible metadata labels with increased tracking.

## Color tokens

Light mode is the initial reference; dark mode is not required for the initial release.

```css
--paper: #F6F2EA;
--surface: #FFFDF8;
--surface-raised: #FFFFFF;
--ink: #171A1D;
--ink-muted: #62666A;
--line: #D8D2C7;
--line-strong: #ACA69B;
--accent: #235B52;          /* deep mineral green */
--accent-hover: #19463F;
--accent-soft: #DDEAE5;
--change: #9A5C19;          /* potential change */
--change-soft: #F4E5CD;
--conflict: #9B3A35;        /* contradiction/conflict */
--conflict-soft: #F5DDDA;
--missing: #6D5B8D;         /* missing evidence */
--missing-soft: #E9E2F2;
--info: #365F8A;
--info-soft: #DEE8F2;
--focus: #146CBE;
--disabled: #B8B6B0;
```

Color is never the only signal. Status always includes text and, where useful, a restrained icon. Text/background combinations must meet WCAG 2.2 AA contrast.

## Spacing and geometry

- Base spacing unit: 4px. Primary steps: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Content max-width: 1200px; reading column: 720px; compare view may use the full width.
- Use generous outer whitespace and compact evidence metadata.
- Border radii: 6px for small controls, 10px for panels, pill shapes only for status filters/tags.
- Shadows are rare and soft; structure comes from spacing, hairline borders, and paper/surface contrast.

## Layout and navigation

- Desktop uses a narrow left navigation rail, a clear page header, and a main canvas.
- Agreement Reality Check uses a step header and a source-centered layout. On wide screens, agreement and new instructions can appear side by side with a dedicated findings margin. Users can lock scrolling only when it remains accessible.
- Decision Replay uses a readable chronological ledger of genuine persisted records, not a decorative activity feed or generated narrative. Missing records remain visibly missing.
- Keep a single dominant action per view. Destructive or irreversible actions are visually separated.

## Core components

- **App shell:** workspace switcher, engagement context, primary navigation, account controls.
- **Page header:** editorial title, one-sentence context, primary action, optional status.
- **Source card:** source name, kind, provenance, version, capture/upload time, processing state; never substitutes extracted text for the original without labeling it.
- **Document reader:** authentic passage, stable locator, version marker, copy/link affordance, and extraction provenance.
- **Comparison lane:** aligned source passages with connective rules and calm emphasis; maintains reading order for assistive technology.
- **Finding marker/panel:** category, plain-language claim, cited passages, uncertainty, origin, review state, and review actions.
- **Decision bar/dialog:** summarizes the exact check/version, authorized outcome, impact, optional rationale, and explicit confirmation. It never defaults to approval.
- **Status lozenge:** label plus icon; compact but not color-only.
- **Decision Replay ledger:** actor/origin, action, target/version, UTC/local presentation, evidence link, and expandable metadata. Every row maps to a persisted record.
- **Button:** primary, secondary, quiet, and danger variants with visible hover, focus, busy, and disabled states.
- **Form controls:** persistent labels, descriptions when needed, inline validation, and preserved user input after recoverable errors.

## Responsive and mobile behavior

- At widths below 768px, navigation becomes a labeled sheet and side-by-side comparison becomes a source toggle with a persistent “view counterpart” action.
- Never squeeze two document columns into unreadable widths.
- Finding references retain bidirectional navigation between claim and passage.
- Persistent action bars respect safe areas and do not obscure content or the focused control.
- Minimum target size is 44×44 CSS pixels. Avoid hover-only disclosure.
- Tables convert to labeled stacked rows while preserving headings and relationships.

## Accessibility

- Target WCAG 2.2 AA.
- Use semantic landmarks, heading order, labels, descriptions, and native controls first.
- Provide a skip link and highly visible focus ring using `--focus` with sufficient offset.
- Comparison relationships must be understandable in DOM order and announced without relying on drawn connector lines.
- Announce async status changes politely; do not steal focus. Move focus intentionally after route changes or submitted dialogs.
- Dialogs trap and restore focus; Escape closes only when closing is safe.
- Respect `prefers-reduced-motion`; all actions remain understandable without animation.
- Date/time display includes timezone context; hashes and technical identifiers have accessible labels.

## Empty states

Empty states explain why the page is empty and offer one concrete next step. Examples:

- No agreements: “Add the agreement you want to use as the baseline.”
- No new instructions: “Add the later request or instructions you want to compare.”
- No checks: “Run an Agreement Check after both sources are ready.”
- No findings: state whether analysis completed with no findings or has not run; never collapse those states.
- No decisions: “No decision has been recorded. Findings are not approvals.”
- No replay events: “No agreement activity has been recorded yet.” Do not synthesize a sample timeline.

Do not show fabricated example clients or documents in a production workspace. Optional demos must be explicitly labeled, isolated, and user-created.

## Loading and progress

- Use structural skeletons only for short, predictable loads and label them for assistive technology.
- For extraction and comparison, show named stages, last known state, elapsed context where reliable, and a safe leave/return path.
- Do not show fake percentages. Use determinate progress only when backed by real measurements.
- Preserve submitted source/version context while work is pending.

## Errors and recovery

- Place field errors beside the field and a summary at the top for long forms.
- Explain what happened in plain language, what remains safe, and the next action.
- Include a copyable correlation ID for unexpected or provider failures without exposing payloads or secrets.
- Permission errors reveal no hidden resource details.
- Provider failure must not render empty or generated substitute findings. Offer retry only when safe and supported.
- Offline/network failure preserves local form input where possible and avoids duplicate submissions.

## Motion

- Motion communicates continuity, not spectacle: 120–180ms for controls, up to 240ms for panels.
- Use subtle opacity and 4–8px translation; no large parallax, bouncing, or ambient movement.
- A newly focused passage may briefly tint with its category color, then settle.
- Decision confirmation uses no celebratory animation; it is a serious recorded action.
- Reduced-motion mode removes translation and nonessential transitions.

## T004 implemented foundation

The first implemented product-shell reference uses the documented paper, ink, mineral-green, and evidence-state tokens in `src/app/styles.css`. The interface uses resilient system-hosted typography fallbacks for the documented Newsreader, Inter, and IBM Plex Mono roles; no remote font request or font-service dependency is introduced.

- The authenticated desktop workspace uses a 264px navigation rail with real workspace/project context and verified session controls. At 820px and below it becomes a native `details` disclosure with labeled navigation and the same account controls.
- Navigation follows the product workflow: Projects, Agreements, Changes, Agreement Reality Check, and Decisions & Replay. Unavailable destinations are non-interactive and explicitly say that a project must be chosen.
- Page headers, status lozenges, notices, empty states, buttons, and text fields are reusable primitives. Statuses always contain text and a visible marker; form guidance and errors are programmatically associated with their controls.
- The Agreement Reality Check foundation shows two empty source lanes and a distinct findings margin. It contains no sample quotation, finding, comparison response, or decision.
- Project pages render only server-authorized project, workspace, role, and decision-authority values. Future evidence and decision actions remain absent rather than being represented by nonfunctional controls.
- Public, authentication, project-list, project-detail, loading, and error views share the same tokens, focus treatment, minimum target sizes, and reduced-motion behavior.

T004 automated browser checks cover WCAG-tagged axe scans and a keyboard path at desktop and 390px mobile widths. Public-shell overflow was additionally checked at 320, 390, 768, and 1280 CSS pixels. No visual-regression baseline was adopted in T004; the responsive screenshot was used for local inspection only.
