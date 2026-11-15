---
name: ScolarParent Native Mobile
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#006398'
  on-secondary: '#ffffff'
  secondary-container: '#5bb8fe'
  on-secondary-container: '#00476e'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002113'
  on-tertiary-container: '#009668'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#cce5ff'
  secondary-fixed-dim: '#93ccff'
  on-secondary-fixed: '#001d31'
  on-secondary-fixed-variant: '#004b73'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  numeric-metric:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 30px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.25rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-trust, frictionless relationship between parents and modern academic institutions. Drawing aesthetic and ergonomic principles from Apple Health, Revolut, and Notion, it translates dense institutional data (attendance, grades, billing, live school comms) into a calm, authoritative mobile experience.

### Tone & Personality
- **Authoritative yet Human:** Reassuring, institutional stability without the cold friction of legacy school portals.
- **Immediate & Actionable:** Prioritizes glanceability—status at school entrance, imminent deadlines, and outstanding signatures are parsed in milliseconds.
- **Premium Tactility:** High-precision layout rhythm, refined micro-surfaces, subtle haptic-like visual states, and crisp data visualization.

### Visual Style Direction
A blend of **Modern iOS Native** and **Refined Micro-Layered Surface Design**:
- Ultra-clean, luminous backgrounds grounded by deep slate typography.
- Deliberate semantic color coding for rapid cognitive recognition (emerald presence, amber alerts, coral critical items).
- Segmented control pills, layered white sheet elevation, and consistent 44px+ touch-friendly ergonomic targets optimized for one-handed mobile navigation.

## Colors

The palette establishes clarity, trust, and instantaneous status comprehension across varying ambient light conditions.

### Palette Architecture
- **Primary (`#0F172A` - Slate 900):** Deep, ink-like foundation reserved for primary text, structural headers, high-contrast tab iconography, and critical data readouts.
- **Secondary / Brand Accent (`#0284C7` - Sky 600 / `#0EA5E9` - Sky 500):** Vibrant azure electric blue dedicated exclusively to interactive affordances, call-to-action buttons, active tab indicators, and progress milestones.
- **Semantic Status Signals:**
  - **Presence & Success (`#10B981` with surface `#ECFDF5`):** Denotes on-premise presence, validated attendance, passing marks, and cleared fee payments.
  - **Warning & Pending (`#F59E0B` with surface `#FFFBEB`):** Flags delayed arrival, pending absence justifications, and upcoming event dates.
  - **Critical Alert (`#EF4444` with surface `#FEF2F2`):** Highlights unexcused absences, urgent administrative requests, and overdue tuition invoices.
- **Surfaces & Neutral Hierarchy:**
  - **Canvas Base (`#F8FAFC`):** Soft, neutral off-white avoiding optical glare.
  - **Elevated Cards (`#FFFFFF`):** Pure white modules floating above the canvas.
  - **Hairline Dividers (`#E2E8F0`):** Precise 1px structural separators.
  - **Secondary / Supporting Text (`#64748B`):** WCAG AA compliant muted slate for metadata, timestamps, and secondary captions.

## Typography

The typography relies on Inter to guarantee native rendering clarity across both iOS and Android platforms, prioritizing scan speed, tabular alignment, and outdoor legibility.

### Hierarchy & Usage
- **Display & Headlines:** Used for dynamic page headers (e.g., student name, current summary term) and modal titles. Characterized by tight tracking and bold/semi-bold weights.
- **Tabular & Numeric Displays (`numeric-metric`):** Used for grade averages (e.g., `17.5 / 20`), live balance sheets, and class rankings. Always rendered with OpenType tabular figures (`tnum`) enabled to prevent layout shifting across dynamic updates.
- **Body & Captions:** Optimized for dense schedules, teacher messages, and administrative notifications with open apertures and balanced line heights.
- **Caps & Badges:** `label-sm` and `caption` utilize subtle positive tracking for badges and categorical chips (e.g., "RETARD", "JUSTIFIÉ", "COEFFICIENT").

## Layout & Spacing

The layout is built for one-handed thumb interaction within native viewport boundaries.

### Layout Mechanics
- **Single-Column Fluid Grid:** Standard mobile layout uses a fluid single-column flow constrained within `margin-mobile` (16px) padded boundaries, maintaining an edge-to-edge container feel on screens up to 430px wide.
- **Vertical Rhythm (8pt base):** Spacing between card groups and functional sections defaults to `space-lg` (24px) to preserve cognitive breathing room between unrelated academic modules.
- **Ergonomic Safe Zones:**
  - Top: Accommodates system status bars, dynamic islands, and the persistent multi-child selector pill.
  - Bottom: Retains 80px fixed clearance above the safe area inset for the floating or docked tab bar.
- **Tablet / Large Screen Adaptation:** When viewport exceeds 600px width, layout switches to a balanced 2-column asymmetric grid (Overview & Timetable 60% / Feed & Notifications 40%) with max container width capped at 840px centered.

## Elevation & Depth

Visual hierarchy uses a refined hybrid of tonal surface stacking and soft, diffused micro-shadows rather than heavy borders or aggressive drop-shadows.

### Surface Elevation Levels
- **Level 0 (App Canvas):** `#F8FAFC` base surface; recedes back to emphasize cards.
- **Level 1 (Card Modules & List Items):** Pure `#FFFFFF` surfaces with a 1px boundary stroke of `#E2E8F0` and an ambient shadow: `box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)`.
- **Level 2 (Interactive Floating Elements & Child Switcher):** `#FFFFFF` surfaces with deeper ambient diffusion: `box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08)`.
- **Level 3 (Modals & Expandable Bottom Sheets):** Deep backdrop scrim of `rgba(15, 23, 42, 0.4)` blurred with `backdrop-filter: blur(8px)`. The elevated sheet uses pure white with an upward soft shadow (`0 -8px 24px rgba(15, 23, 42, 0.12)`) and a muted drag affordance handle (`#CBD5E1`).
- **Glass Accents:** Sticky navigation bars and floating bottom tab bars utilize translucent backgrounds (`rgba(255, 255, 255, 0.85)`) coupled with native CSS/system blur (`backdrop-filter: blur(16px)`).

## Shapes

The design system adopts a consistent, friendly, and modern geometric curve language designed to harmonize with native iOS and Android display corners.

### Radii Hierarchy
- **Standard Surfaces & Cards:** `rounded-lg` (16px / 1rem) applied to content tiles, schedule item clusters, and expandable modules.
- **Inner Embedded Components:** `rounded` (8px / 0.5rem) for form fields, table cells, and grade overview boxes inside parent cards.
- **Child Switcher, Status Badges, & Action Pills:** Full circular pill styling (`rounded-full` / `9999px`) for contextual badges, multi-child switches, and floating micro-buttons.
- **Bottom Sheets:** Top-left and top-right radii set to `rounded-xl` (24px / 1.5rem) to evoke an ergonomic, layered card gesture.

## Components

### Buttons & Interactive Affordances
- **Primary CTA:** Full-width or inline `min-height: 48px`, background `#0284C7`, text `#FFFFFF`, font weight 600, `rounded-xl` (16px). Active tap scale reduces to `0.98` with subtle brightness dimming.
- **Secondary Button:** Surface `#F1F5F9`, text `#0F172A`, 1px border `#E2E8F0`.
- **Destructive Action:** Surface `#FEF2F2`, text `#EF4444`, border `#FEE2E2`.

### Multi-Child Switcher Pill
- Positioned in the top navigation area.
- Capsule pill (`height: 36px`, `rounded-full`) composed of student avatar circle (28px), student first name (`label-sm`), and a chevron icon.
- Tapping triggers a native bottom sheet displaying all registered siblings with respective grades and school campuses.

### Status Badges & Chips
- **Presence Badge:** Compact pill containing a 6px green indicator dot, `#ECFDF5` background, `#047857` text (e.g., "Présent(e)").
- **Absence / Retard Alert:** Background `#FFFBEB`, text `#B45309`, with a clock or warning icon.
- **Unexcused Absence:** Background `#FEF2F2`, text `#B91C1C` with instant tap target to open "Justifier l'absence".

### Cards & Grouped Lists
- Single card container wrapping related rows with 1px inset divider lines `#F1F5F9` that stop 16px short of the outer card edge (iOS Settings style).
- Right-hand accessory disclosure indicator (`ChevronRight`, slate-400) for drill-down navigation.

### Bottom Navigation Bar
- Fixed height of 64px + safe area padding.
- 4 to 5 primary destinations: "Aujourd'hui", "Vie Scolaire", "Notes", "Messagerie", "Compte".
- Inactive items rendered in slate `#64748B` with 20px vector line icons.
- Active items highlighted in `#0284C7` with a subtle 3px dot indicator positioned beneath the label.

### Input Fields & Controls
- Form controls maintain a minimum touch bounding box of 48px height.
- Default border: 1px `#CBD5E1` on pure white background, transitioning to a 2px `#0284C7` focus ring with no harsh drop shadows.
- Native date-pickers, justification upload dropzones, and electronic signature pads inherit card-level radii and clear contrast labels.