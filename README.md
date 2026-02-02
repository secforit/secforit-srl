# SECFORIT SRL

**Security by Design. Protection by Default.**

A professional cybersecurity consulting company website built with modern web technologies. SECFORIT delivers Zero Trust architecture and expert consulting to defend what matters most.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 |
| Components | Radix UI + shadcn/ui (New York style) |
| Icons | Lucide React |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Fonts | Space Grotesk (sans), JetBrains Mono (mono) |
| Analytics | Vercel Analytics |

## Project Structure

```
secforit-srl/
├── app/
│   ├── globals.css            # Global styles, CSS variables, animations
│   ├── layout.tsx             # Root layout with fonts & metadata
│   ├── page.tsx               # Home page (single-page layout)
│   └── favicon.ico
├── components/
│   ├── ui/                    # Primitive UI components (shadcn/ui)
│   │   ├── button.tsx         # Button with 6 variants & 8 sizes
│   │   ├── input.tsx          # Styled form input
│   │   ├── label.tsx          # Accessible label (Radix UI)
│   │   └── textarea.tsx       # Styled textarea
│   ├── navigation.tsx         # Sticky nav with mobile menu
│   ├── hero-section.tsx       # Hero with particle network & typewriter
│   ├── services-section.tsx   # Service cards grid
│   ├── about-section.tsx      # About with stats & circuit animation
│   ├── contact-section.tsx    # Contact form & info
│   ├── footer.tsx             # Footer with links & branding
│   └── particle-network.tsx   # Canvas-based particle animation
├── lib/
│   └── utils.ts               # Utility functions (cn class merger)
├── public/                    # Static assets
├── components.json            # shadcn/ui configuration
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── postcss.config.mjs         # PostCSS (Tailwind plugin)
└── eslint.config.mjs          # ESLint configuration
```

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#dc2626` | Brand red, CTAs, accents |
| `--primary-dark` | `#b91c1c` | Hover states |
| `--background` | `#ffffff` | Page background |
| `--foreground` | `#0a0a0a` | Primary text |
| `--secondary` | `#f5f5f5` | Secondary backgrounds |
| `--muted-foreground` | `#525252` | Subtle text |
| `--border` | `#e5e5e5` | Borders & dividers |
| `--accent` | `#0a0a0a` | Accent elements |

### Chart Colors

| Token | Value |
|-------|-------|
| `--chart-1` | `#dc2626` (Red) |
| `--chart-2` | `#0a0a0a` (Black) |
| `--chart-3` | `#525252` (Gray) |
| `--chart-4` | `#a3a3a3` (Light Gray) |
| `--chart-5` | `#ef4444` (Light Red) |

### Typography

- **Sans-serif:** Space Grotesk (headings & body)
- **Monospace:** JetBrains Mono (code & technical text)
- **Border radius:** `0.625rem` (10px)

### Button Variants

| Variant | Description |
|---------|-------------|
| `default` | Primary red background |
| `destructive` | Destructive action styling |
| `outline` | Bordered, transparent background |
| `secondary` | Secondary gray background |
| `ghost` | No background, hover reveal |
| `link` | Text-only with underline |

## Page Sections

The site follows a single-page layout with smooth-scroll navigation:

1. **Navigation** -- Sticky header with logo, section links (Services, About, Contact), CTA button, and responsive mobile menu with active section highlighting
2. **Hero** -- Particle network canvas background, animated floating icons, typewriter effect cycling through key phrases, and scroll indicator
3. **Services** -- 5 service cards in a responsive grid (3+2 layout) with staggered scroll-triggered animations:
   - Security Consulting
   - Threat & Vulnerability Analysis
   - Automated Security Solutions
   - Secure Web Development
   - Secure Integration
4. **About** -- Two-column layout with animated circuit pattern SVG, three differentiators, and animated stat counters (10+ years, 200+ clients, 500+ assessments)
5. **Contact** -- 5-column grid with a validated form (name, email, company, message) and direct contact info with copy-to-clipboard
6. **Footer** -- Company branding, social links (LinkedIn, Twitter, GitHub), quick links, and legal links

## Animations

| Animation | Implementation |
|-----------|---------------|
| Particle Network | Canvas-based particle system with connection lines |
| Typewriter | Text cycling with typing/deleting effect |
| Float | Subtle icon movement with rotation |
| Fade-in / Fade-in-up | Scroll-triggered entry via Intersection Observer |
| Counter | Animated number incrementing for stats |
| Card Glow | Hover effect with radial gradient |
| Circuit Pattern | SVG stroke-dashoffset animation with pulsing nodes |
| Bounce | Scroll indicator arrow |

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

### Linting

```bash
npm run lint
```

## Deployment

Optimized for deployment on [Vercel](https://vercel.com) with Vercel Analytics pre-configured.

## SEO & Metadata

- **Title:** SECFORIT | Cybersecurity by Design
- **Description:** Zero Trust architecture and expert consulting to defend what matters most. Security consulting, threat analysis, and secure development solutions.

## Development Guidelines

When building new pages and components for this project, follow these conventions:

- Use the established CSS variable color system (`--primary`, `--foreground`, etc.)
- Follow the existing component architecture (feature components + ui primitives)
- Use `"use client"` directive only for interactive components
- Apply Intersection Observer for scroll-triggered animations
- Maintain responsive design across mobile, tablet, and desktop
- Use the `cn()` utility from `lib/utils.ts` for conditional class merging
- Follow shadcn/ui patterns for new UI primitives
- Keep the red (`#dc2626`) + black (`#0a0a0a`) + white (`#ffffff`) brand identity consistent
