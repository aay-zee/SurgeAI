# Styling Architecture Guide

This project is built using **Next.js**, **React**, and **Tailwind CSS**. Here is the breakdown of how styling flows from configuration to the browser.

## 1. The Build Pipeline: PostCSS

**File:** `postcss.config.js`

PostCSS is the tool that transforms your CSS before it's saved.

- When Next.js builds your app, it reads this config.
- It loads `tailwindcss`: The engine that scans your files and generates the CSS.
- It loads `autoprefixer`: Adds vendor prefixes (like `-webkit-`) so your styles work in all browsers.

## 2. The Brain: Tailwind Config

**File:** `tailwind.config.ts`

This is the central source of truth for your design system.

- **`content`**: Tells Tailwind where to look for class names (`./app/**/*.{ts,tsx}`, etc.). If you use a class like `bg-primary` in a file not listed here, it won't be generated.
- **`theme.extend`**: This is where we map **Utility Classes** to **CSS Variables**.
  - Example: `colors.primary: 'var(--primary)'`
  - This means: "When I write `bg-primary`, use the color value stored in the CSS variable `--primary`."
  - **Why?** This abstraction allows us to change the _value_ of primary (e.g., for Dark Mode) without changing the class name in your HTML.

## 3. The Source: Global CSS

**File:** `app/globals.css`

This is where the actual style values live.

- **`@tailwind ...`**: detailed directives that inject the standard Tailwind styles (reset, base styles, utilities).
- **`@layer base`**: This is where we define the **CSS Variables** we referenced in the config.
  - `:root { --primary: #2563EB; }`: Sets the default (light mode) color.
  - `.dark { --primary: #38BDF8; }`: Overrides it when the `.dark` class is present on the `html` tag.

## 4. The Component: Usage

**File:** `components/ui/button.tsx` (for example)

- You write: `<div className="bg-primary text-primary-foreground">`
- Tailwind sees this.
- It looks up `primary` in `tailwind.config.ts` -> finds `var(--primary)`.
- Browser sees `var(--primary)`.
- Browser looks at `globals.css` -> finds `#2563EB` (or the dark mode equivalent).

## Summary of the Flow

1.  **Code**: You write `bg-primary`.
2.  **Build**: Tailwind scans code -> checks `tailwind.config.ts` -> generates CSS rule `.bg-primary { background-color: var(--primary); }`.
3.  **Browser**: Loads CSS -> sees `var(--primary)` -> checks `:root` or `.dark` scope in `globals.css` -> paints the pixel Blue.
