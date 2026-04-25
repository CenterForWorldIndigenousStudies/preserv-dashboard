# Semantic Class Naming Convention

## Overview

Semantic class names describe *what* something is, not *how* it looks. They represent the purpose or role of an element in the document, independent of any specific styling implementation.

This approach separates concerns:

- **Semantic classes** describe structure and role (what is this?)
- **Component libraries** (e.g., MUI) provide base styles for built-in components
- **CSS** applies layout, spacing, and context-specific styling via semantic class names

## The Naming Convention: General to Specific

Class names follow the pattern `<scope>-<specific>`.

**General first, specific second.** The scope is the broader category; the specific is the refinement.

```txt
btn-submit      → a submit button (not a cancel button, not a save button)
h-1             → primary heading (not h-2, not a paragraph)
page-dashboard  → the dashboard page (not the settings page)
form-login      → the login form (not the signup form)
panel-detail    → a detail panel (not a list panel)
tbl-data        → a data table (not a summary table)
```

### Why this order?

When you read `btn-submit`, you immediately know: this is a button, and the variant is submit. When you read `submit-btn`, you have to parse "submit" first - the broader category comes second, which breaks the mental model of reading left to right from general to specific.

If the actual scenario calls for styling a document with variants, the same logic applies:

```txt
document-email    → an email document
document-essay    → an essay document
```

You are styling a **document** and refining it as **email** or **essay**. You are not styling an **email** and calling it a document.

### Choosing Scope and Specificity

Ask: "What am I styling, and what makes this instance different?"

| Class Name | What am I styling? | What is the specific? |
|---|---|---|
| `btn-submit` | button | submit action |
| `h-1` | heading | level 1 |
| `page-dashboard` | page | dashboard |
| `form-login` | form | login |
| `panel-detail` | panel | detail view |
| `fld-label` | field | label |
| `lbl-required` | label | required indicator |
| `sec-header` | section | header |
| `tbl-data` | table | data display |

Scope words should be recognizable shorthand: `btn`, `h`, `page`, `form`, `panel`, `fld`, `lbl`, `sec`, `tbl`, `nav`, `row`, `cell`.

## Rules

### 1. Never style element selectors or IDs directly

```css
/* WRONG */
h1, h2 { font-weight: 600; }
#header { background: white; }

/* RIGHT */
.h-1, .h-2 { font-weight: 600; }
.header { background: white; }
```

Every styled element gets a semantic class. Elements without classes cannot be targeted by CSS.

### 2. Never use inline styles or style attributes

All styling comes from CSS classes. Inline styles scatter behavior across the codebase.

### 3. Never use presentational class names

Class names describe role or function, never appearance. Avoid adjectives like `big`, `dark`, `red`, `wide`.

```css
/* WRONG */
.panel-big-dark { }
.btn-red { }
.text-large { }

/* RIGHT */
.panel-detail { }
.btn-submit { }
.h-1 { }
```

A class name can be as specific as it needs to be. There is no penalty for granularity:

```txt
btn-submit-pymnt-applepay   ← perfectly fine - describes a specific button role
```

You do not need a base `btn` class plus modifiers. `btn-submit` is sufficient on its own. The parent context provides the broad targeting when needed:

```css
/* Target all buttons within a payment form section */
.section-submit .btn,
.section-submit [class^="btn-"],
.section-submit [class*=" btn-"] {
  margin-top: 1rem;
}
```

## Targeting Variants

### With class chains

HTML can carry multiple classes to combine a base role with a specific variant:

```html
<span class="title heading-subtext">Oh my!</span>
```

```css
.title,
[class^="title-"],
[class*=" title-"] {
  /* base title styles */
}

.heading,
[class^="heading-"],
[class*=" heading-"] {
  /* base heading styles */
}

.heading-subtext {
  /* specific subtext heading styles */
}
```

The base class (`title`, `heading`) handles broad styling. The specific variant (`heading-subtext`) handles refinements.

Class chains are valid when the element has multiple distinct roles. `class="title heading-subtext"` is fine - two classes, two distinct scopes. But `class="heading heading-subtext"` would be redundant - both share the same scope (`heading`), so the base class is unnecessary.
Combine classes only when the element genuinely has multiple independent roles.

Parent context narrows scope when needed:

```css
.page-profile .heading,
.page-profile [class^="heading-"],
.page-profile [class*=" heading-"] {
  font-size: 1.5rem;
}
```

### With attribute selectors for scoped overrides

Sometimes you need to target all variants within a parent scope without adding extra classes to the markup. Attribute selectors catch classes by prefix:

```html
<form class="form-payment">
  <button class="btn">Pay Now</button>
  <button class="btn-cancel">Cancel</button>
  <button class="third_party_class btn-view">View Details</button>
</form>
```

```css
.form-payment .btn,
.form-payment [class^="btn-"],
.form-payment [class*=" btn-"] {
  margin: 20px;
}
```

This matches:

- `.btn` - exact match
- `[class^="btn-"]` - attribute value starts with "btn-"
- `[class*=" btn-"]` - attribute value contains " btn-" (word boundary)

The attribute selectors handle variants placed anywhere in the class attribute, regardless of position.

## Context and Scope

Parent classes create context. Children inherit or override within that context:

```css
.page-dashboard .h-1 {
  /* all h-1 headings within .page-dashboard */
  font-size: 2rem;
}

.sec-header .h-1 {
  /* h-1 within a header section - smaller context */
  font-size: 1.5rem;
}
```

This lets you style globally and tighten scope as needed:

```css
/* Global h-1 */
.h-1 {
  font-size: 2rem;
  font-weight: 600;
}

/* Tighter h-1 within a specific page */
.page-profile .h-1 {
  font-size: 1.75rem;
}

/* Even tighter within a specific panel */
.panel-account .h-1 {
  font-size: 1.5rem;
  color: var(--color-muted);
}
```

## Plain CSS Structure

A minimal example:

```css
/* _variables.css - design tokens */
:root {
  --color-primary: #355834;
  --color-bg: #f4f1eb;
  --spacing-unit: 8px;
  --radius-lg: 16px;
}

/* _reset.css */
*, *::before, *::after {
  box-sizing: border-box;
}

/* _base.css */
body {
  background: var(--color-bg);
  font-family: system-ui, sans-serif;
}

/* pages/document-detail.css */
.page-document-detail {
  padding: calc(var(--spacing-unit) * 4);
}

.page-document-detail .h-1 {
  font-size: 1.75rem;
  margin-bottom: calc(var(--spacing-unit) * 3);
}

.page-document-detail .panel-detail {
  border-radius: var(--radius-lg);
  padding: calc(var(--spacing-unit) * 3);
}

.page-document-detail .btn,
.page-document-detail [class^="btn-"],
.page-document-detail [class*=" btn-"] {
  margin-top: calc(var(--spacing-unit) * 2);
}

.field-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #666;
}
```

## CSS Preprocessors

Preprocessors add nesting, partials, and variables. The approach remains the same; the syntax changes.

### SCSS Example

```scss
// Base heading styles
.h-1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.h-2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

// Page-scoped overrides
.page-document-detail {
  padding: calc(var(--spacing-unit) * 4);

  .h-1 {
    font-size: 1.75rem;
  }

  // Target all button variants within this page
  .btn,
  [class^="btn-"],
  [class*=" btn-"] {
    margin-top: calc(var(--spacing-unit) * 2);
  }
}
```

### Less Example

```less
// Base heading styles
.h-1 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.h-2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

// Page-scoped overrides
.page-document-detail {
  padding: calc(@spacing-unit * 4);

  .h-1 {
    font-size: 1.75rem;
  }

  .btn,
  [class^="btn-"],
  [class*=" btn-"] {
    margin-top: calc(@spacing-unit * 2);
  }
}
```

Both preprocessors reduce repetition and improve readability, but the underlying class naming and selector strategy is identical to plain CSS.

## Summary

- Class names follow `<scope>-<specific>`, general to specific
- Scope words are recognizable shorthand for the element type
- Never style elements or IDs directly - every styled element gets a class
- Component library classes go after semantic classes in the class attribute
- Context overrides via parent selectors, without specificity wars
- Attribute selectors `[class^="btn-"]` and `[class*=" btn-"]` match variants within scoped CSS rules
- Preprocessors are optional syntax sugar; the naming convention works in plain CSS
