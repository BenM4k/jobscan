---
name: JobPilot
description: Tactical, high-density personal job search pipeline automation with AI fit scoring.
colors:
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  neutral-bg-light: "#FAFAFA"
  neutral-bg-dark: "#0A0A0C"
  surface-card-light: "#FFFFFF"
  surface-card-dark: "#121215"
  border-light: "#CBD5E1"
  border-dark: "#27272A"
  text-primary-light: "#0F172A"
  text-primary-dark: "#F8FAFC"
  text-muted-light: "#64748B"
  text-muted-dark: "#A1A1AA"
  accent-badge: "#FEF08A"
  accent-blue-bg: "#EFF6FF"
typography:
  display:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 800
    lineHeight: 1.15
  headline:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, Geist, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    letterSpacing: "0.025em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System: JobPilot

## Overview

**Creative North Star: "The Tactical Flight Deck"**

JobPilot's visual design combines the precision of an aviator's flight instrument panel with modern SaaS elegance. Built around high-contrast surfaces, subtle dot-grid background patterns (`radial-gradient(#CBD5E1 1px, transparent 1px)`), and rounded glassmorphism cards (`rounded-3xl`), the interface delivers maximum information density with zero clutter.

**Key Characteristics:**
- **High Contrast Dark/Light Dual Mode**: Deep `#0A0A0C` obsidian canvas in dark mode; crisp `#FAFAFA` off-white in light mode.
- **Tactical Dot Grid Canvas**: Subtle 24px background grid providing spatial structure across all views.
- **Color-Coded Status & Fit Scoring**: High-visibility score badges, source pills (ReliefWeb, Emploi.cd, RemoteOK, Greenhouse), and pipeline status indicators.
- **Instant Shell Rendering**: Fast static layout shells (`◐` Partial Prerendering) with smooth streaming loading skeletons.

## Colors

The palette balances clean slate neutrals with vibrant tactical blue accents and status indicators.

### Primary
- **Tactical Blue** (`#2563EB` / `oklch(0.556 0.22 264.376)`): Used for primary call-to-action buttons, active tab indicators, and high-match percentage highlights.

### Neutral
- **Obsidian Dark Surface** (`#0A0A0C`): Base dark mode page canvas.
- **Elevated Card Dark** (`#121215` / `oklch(0.15 0 0)`): Surface container for job items, profile blocks, and forms.
- **Off-White Canvas** (`#FAFAFA`): Base light mode page canvas.
- **Subtle Slate Border** (`#CBD5E1` / `#27272A`): Precision dividers and container strokes.

### Named Rules
**The Single Accent Focus Rule.** Vibrant blue (`#2563EB`) is reserved strictly for primary interactive triggers, active filters, and key score highlights—never for background fill.

## Typography

**Display & Body Font:** Inter / Geist (`font-sans`)

### Hierarchy
- **Display** (Weight 800, `text-4xl sm:text-6xl`, Line-Height 1.15): Hero titles and main section headers.
- **Headline** (Weight 700, `text-2xl sm:text-3xl`, Line-Height 1.25): Dashboard section titles and page headers.
- **Title** (Weight 600, `text-lg sm:text-xl`, Line-Height 1.35): Job title headers and modal section titles.
- **Body** (Weight 400, `text-sm sm:text-base`, Line-Height 1.5): Job descriptions, resume summaries, and cover letter text.
- **Label** (Weight 600, `text-xs`, Letter-Spacing 0.025em): Source tags, status pills, and match score badges.

## Layout

- **Container Bounds**: Max-width centered containers (`max-w-6xl` for dashboard/profile, `max-w-5xl` for forms/lists).
- **Spatial Grid**: 24px dot grid pattern overlay with subtle opacity (40% light, 20% dark).
- **Responsive Padding**: `p-6` mobile to `p-8` desktop.

## Elevation & Depth

Surfaces rely on subtle border strokes (`border-slate-300 dark:border-zinc-800`), backdrop blurs (`backdrop-blur-md`), and layered card elevation rather than heavy ambient drop shadows.

### Named Rules
**The Flat-With-Border Rule.** Containers rest flat on the dot grid canvas with precision 1px border strokes; elevation shadows appear only on hover or modal presentation.

## Shapes

- **Page Containers & Cards**: `rounded-3xl` (24px) for modern, friendly container geometry.
- **Buttons & Filter Pills**: `rounded-xl` (12px) or `rounded-2xl` (16px) for comfortable touch/click targets.
- **Status & Source Badges**: `rounded-full` for pill tags.

## Components

### Buttons
- **Shape**: `rounded-xl` (12px)
- **Primary**: `bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-3 shadow-lg shadow-blue-500/25`
- **Secondary**: `bg-white dark:bg-[#18181B] border border-slate-300 dark:border-zinc-800 text-gray-800 dark:text-zinc-300 px-4 py-2.5 rounded-2xl`

### Cards & Container Panels
- **Corner Style**: `rounded-3xl` (24px)
- **Background**: `bg-white dark:bg-[#121215]`
- **Border**: `border border-slate-300 dark:border-zinc-800`

### Inputs & Select Filters
- **Shape**: `rounded-2xl` (16px)
- **Focus**: `focus:outline-none focus:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/20`

## Do's and Don't's

### Do:
- **Do** maintain the subtle dot-grid canvas pattern across all page layouts for brand consistency.
- **Do** preserve high contrast between text labels and colored status/score badge backgrounds.
- **Do** keep skeleton loading states structured to match the exact dimensions of resolved components.

### Don't:
- **Don't** use heavy drop shadows or solid dark borders in light mode.
- **Don't** mix plain browser default fonts with custom Tailwind typography.
