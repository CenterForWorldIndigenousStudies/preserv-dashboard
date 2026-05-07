# CWIS Preservation Pipeline - Component Architecture Audit

## What is Atomic Design

Atomic Design is a way to organize UI components by complexity and responsibility.

- **Atoms** are the smallest building blocks. They should be simple, reusable, and focused on a
  single visual or interaction concern.
- **Molecules** combine a small number of atoms into a functional unit such as a labeled row,
  dialog wrapper, or pill with behavior.
- **Organisms** compose atoms and molecules into meaningful application sections. They often own
  richer state, workflows, and domain-specific UI.
- **Pages** assemble organisms into full screens and route-level experiences.

Used well, Atomic Design keeps small components easy to reuse, medium components easy to reason
about, and large components from turning into monoliths.

## Assistant Decision Rules

AI assistants should treat Atomic Design as a design and reuse discipline, not
just a folder structure.

Before creating a new component:

1. Check `components/atoms/`, `components/molecules/`, and
   `components/organisms/` for a reuse candidate.
2. Prefer extending or composing an existing component before creating a new
   one.
3. Choose the smallest layer that truthfully matches the component's
   responsibility.
4. Use a generic name unless the component is truly tied to one workflow.
5. Keep app styling in shared primitives and the MUI theme instead of
   rebuilding it in page-specific JSX.

This is the preferred decision rubric:

- `atom`: one primitive or one thin app-styled wrapper such as `Button`,
  `Badge`, or `StateBadge`
- `molecule`: a small composed unit that can be reused across multiple views
- `organism`: a feature-level section or workflow container with meaningful
  state, orchestration, or domain context

If a proposed component name contains a workflow, screen, or task name, stop
and check whether the underlying UI can be generalized first.

## Reuse Before Create

The repo should prefer generic, app-styled primitives over task-specific
one-offs.

Good pattern:

- `Button` is generalized and reusable, but still carries the application's
  styling and behavior conventions

Preferred order of operations:

1. reuse an existing atom
2. compose atoms into a reusable molecule
3. create a workflow-specific organism only when the UI is genuinely
   domain-specific

Avoid these common mistakes:

- creating workflow-specific wrappers when a generic component would work
- placing composed or stateful workflow components in `atoms/`
- rebuilding existing primitives instead of reusing them
- coupling styling too tightly to one page or workflow

## Current Structure

| Directory | Intended Role | Current Contents |
|---|---|---|
| `components/atoms/` | Small primitives and wrappers | `Badge`, `Button`, `CreateTagDialog`, `Date`, `FileSize`, `FilterPill`, `StateBadge`, `icons/` |
| `components/molecules/` | Small composed functional units | `AuthStatus`, `ConfirmationDialog`, `FieldRow`, `Pagination`, `SidebarToggle`, `StatCard`, `TagPill`, `TagSearchCombobox` |
| `components/organisms/` | Larger feature and page-level components | Main workflow and table-oriented components |

### High-level assessment

The project has a recognizable Atomic Design structure, but classification boundaries are not being
applied consistently. The smallest components are mostly healthy, while several higher-complexity
components have drifted into the wrong tier or grown beyond a maintainable size.

## Audit: Atoms

### Atoms that fit the pattern

Atoms should be tiny, usually under roughly 70 lines, and typically render a single element or a
thin wrapper around MUI primitives.

| Component | Lines | Status | Notes |
|---|---|---|---|
| `Badge` | 31 | GOOD | Simple wrapper. Fits atom expectations. |
| `Button` | 84 | GOOD | Slightly above ideal atom size, but still cohesive. Loading variant and `IconSpinner` usage are reasonable. |
| `Date` | 56 | GOOD | Simple display component. |
| `FileSize` | 57 | GOOD | Simple display component. |
| `FilterPill` | 26 | GOOD | Simple focused UI primitive. |
| `StateBadge` | 21 | GOOD | Thin wrapper around `Badge`. |
| `icons/*` | ~15-30 each | GOOD | Small SVG primitives. |
| `StatCard` | 27 | GOOD | Simple display component. Functionally atom-sized despite current directory placement. |

### Misclassified components

These components do not meet atom or small-molecule expectations and should be reclassified.

| Component | Lines | Current | Should Be | Reason |
|---|---|---|---|---|
| `CreateTagDialog` | 136 | atom | organism | Full dialog workflow with form handling, validation, server action, and state management. That is too much responsibility for an atom. |
| `TagSearchCombobox` | 141 | molecule | organism | Complex autocomplete with internal state and richer interaction logic. It exceeds normal molecule scope. |

### Atom-layer findings

- The true atom layer is mostly healthy.
- `Button` is slightly larger than ideal but still acceptable because its responsibility remains
  narrow.
- The main issue is not atom quality but atom-layer pollution from components that own workflows,
  validation, or substantial state.

## Audit: Molecules

Molecules should combine a few atoms into a useful unit and stay compact enough to read at a glance,
ideally under roughly 80 lines.

| Component | Lines | Status | Notes |
|---|---|---|---|
| `AuthStatus` | 36 | GOOD | Simple composed display unit. |
| `ConfirmationDialog` | 52 | GOOD | Thin MUI dialog wrapper with clear responsibility. |
| `FieldRow` | 19 | GOOD | Simple label-value composition. |
| `Pagination` | 45 | GOOD | Focused and compact. |
| `SidebarToggle` | 19 | GOOD | Small interaction wrapper. |
| `TagPill` | 28 | GOOD | Simple composed display element. |

### Molecule-layer findings

- The molecule layer is generally clean and appropriately scoped.
- The only significant concern is classification drift caused by `TagSearchCombobox`, which is more
  complex than the rest of this tier and should move upward.
- `StatCard` behaves like an atom-sized display unit even though it is currently story-grouped with
  molecules. That does not create a runtime problem, but it does weaken architecture clarity.

## Audit: Organisms

Organisms should assemble atoms and molecules into feature-level components. They can be stateful,
but they should still be readable in one screen and avoid mixing multiple exportable subcomponents,
utilities, and workflows into one file.

### Correctly-sized or acceptable organisms

| Component | Lines | Status | Notes |
|---|---|---|---|
| `NoDataState` | 18 | GOOD | Very small and focused. |
| `PageHeader` | 17 | GOOD | Very small and focused. |
| `Sidebar` | 117 | ACCEPTABLE | Near the upper end for a straightforward organism, but still cohesive. |
| `RemoveTagDialog` | 104 | ACCEPTABLE | Self-contained dialog with manageable scope. |
| `ReviewHistoryTable` | 99 | ACCEPTABLE | Within reasonable organism range. |
| `AuditHistoryTable` | 87 | ACCEPTABLE | Within reasonable organism range. |
| `MermaidDiagram` | 107 | ACCEPTABLE | Cohesive despite moderate size. |

### Organisms that need decomposition

| Component | Lines | Status | Sub-components to extract |
|---|---|---|---|
| `DocumentVersionsButton` | 293 | NEEDS WORK | Extract sorting helpers such as `sortVersionDocuments` and `compareNullable*`; move version table rendering into a dedicated sub-component. |
| `DocumentTagsEditor` | 233 | NEEDS WORK | Internal tag list or tag input behavior likely belongs in a reusable molecule. |
| `AssignCollectionButton` | 275 | NEEDS WORK | Split dialog logic and `loadTags` workflow into smaller units, likely including an internal dialog molecule. |
| `CollectionsAccordion` | 236 | NEEDS WORK | Extract `CollectionDocumentsTable` as a dedicated molecule. Avoid wiring `MaterialReactTable` directly inside the organism. |
| `OverviewAdvancedSearchModal` | 291 | NEEDS WORK | Break filter field types into smaller molecules to reduce branching and improve readability. |
| `ReadyForLibraryTable` | 194 | NEEDS WORK | Separate column definition concerns from rendering concerns. |
| `ReviewQueueTable` | 212 | NEEDS WORK | Similar table structure suggests extractable shared pieces. |

### Large monoliths and priority refactors

| Component | Lines | Status | Extract |
|---|---|---|---|
| `BatchSummaryTable` | 489 | NEEDS MAJOR REFACTOR | Extract `KeyValueRow` as a molecule, `NestedValueRenderer` as a molecule, and `BatchDetailPanel` as an organism. Multiple exportable concerns and helper logic are mixed in one file. |
| `DocumentsTable` | 318 | GOOD | State logic moved to `useOverviewTableState` hook in `@hooks/`. Thin wrapper around MRT. |
| `CollectionDocumentManager` | 162 | GOOD | Imports `SelectionTable` from `@molecules/SelectionTable` and `useCollectionManager` hook from `@hooks/useCollectionManager`. Thin UI wrapper. |

### Organism-layer findings

- The organism layer has the highest architectural risk.
- Several components are still technically manageable, but they are already near the size and
  responsibility threshold where refactoring will become more expensive if delayed.
- The largest files are doing too many jobs at once: rendering, state orchestration, table setup,
  helper utilities, and reusable subcomponent definitions.

## Storybook Coverage Map

### Components with stories

| Tier | Components |
|---|---|
| atoms | `Badge`, `Button`, `CreateTagDialog`, `Date`, `FileSize`, `FilterPill`, `StateBadge`, `icons` |
| molecules | `AuthStatus`, `ConfirmationDialog`, `FieldRow`, `Pagination`, `SelectionTable`, `SidebarToggle`, `StatCard`, `TagPill`, `TagSearchCombobox` |
| organisms | `AssignCollectionButton`, `CollectionDocumentManager`, `DocumentsTable`, `MermaidDiagram`, `NoDataState`, `PageHeader`, `RemoveTagDialog`, `Sidebar`, `DocumentTagsEditor` |

### Missing organism stories - must add

| Component | Status | Why it matters |
|---|---|---|
| `AuditHistoryTable` | MISSING | Supports isolated validation of audit table behavior and visual regression coverage. |
| `BatchSummaryTable` | MISSING | Important before refactoring such a large component. |
| `CollectionsAccordion` | MISSING | Needed to test expanded states and table embedding independently. |
| `DocumentVersionsButton` | MISSING | Useful for validating version workflows before decomposition. |
| `OverviewAdvancedSearchModal` | MISSING | Critical for testing complex filter UI in isolation. |
| `ReadyForLibraryTable` | MISSING | Enables independent review of table rendering and edge states. |
| `ReviewHistoryTable` | MISSING | Important for consistency across related table organisms. |
| `ReviewQueueTable` | MISSING | Supports isolated iteration on queue-specific behavior. |

### Storybook findings

- Storybook coverage is strongest in lower-level components.
- Coverage gaps are concentrated in exactly the organisms that most need refactoring.
- Adding these stories first will reduce refactor risk by creating a safer feedback loop for visual
  and behavioral regression checks.

## Cross-Component Reuse Issues

### 1. `DocumentSelectionTable` is trapped inside `CollectionDocumentManager`

`DocumentSelectionTable` is defined inside `CollectionDocumentManager.tsx` at roughly lines 146-260.
It should be extracted into a reusable molecule and shared with both
`CollectionDocumentManager` and `DocumentsTable`.

#### Impact of leaving `DocumentSelectionTable` embedded

> ✅ DONE: `DocumentSelectionTable` extracted as `SelectionTable` molecule (`@molecules/SelectionTable`) with full stories and exported sort/filter utilities. `CollectionDocumentManager` now imports from it.

### 2. `useOverviewTableState` extracted to `hooks/`

`useOverviewTableState` has been moved to `hooks/useOverviewTableState.ts`. The hook manages all table state for the overview documents table: pagination, sorting, filtering, cursor-based pagination, and URL sync.

`DocumentsTable` is now a thin wrapper that imports the hook and delegates state management to it.

#### Benefits of the extraction

- State logic is reusable and testable in isolation.
- `DocumentsTable` reduced from 568 to 318 lines.

### 3. `sortDocuments` and `filterDocuments` should be shared utilities

`CollectionDocumentManager.tsx` contains utility functions such as `sortDocuments` and
`filterDocuments`, and similar logic likely exists elsewhere.

#### Impact of duplicated document utilities

- Shared domain logic should not be duplicated across multiple organisms.
- Duplicate sort and filter behavior creates drift risk.
- Consolidated utilities would improve consistency and reduce maintenance overhead.

### 4. Table organisms lack shared scaffolding

`AuditHistoryTable`, `ReviewHistoryTable`, `ReviewQueueTable`, `ReadyForLibraryTable`, and
`DocumentsTable` all use similar MUI table structure, but there is no shared foundation for common
patterns.

#### Impact of missing shared table scaffolding

- Repeated column setup, styling, sorting, and empty-state logic increases maintenance cost.
- Shared scaffolding would make future enhancements faster and safer.
- The current pattern encourages each new table to become its own mini framework.

## Atomic Design Violations Summary

The main Atomic Design violations are structural rather than stylistic.

1. **Misclassified components**
   - `CreateTagDialog` is too complex to live in `atoms/`.
   - `TagSearchCombobox` is too complex to behave as a molecule.

2. **Organisms carrying hidden subcomponents and utilities**
   - `CollectionDocumentManager`, `DocumentsTable`, and `BatchSummaryTable` contain logic and
     subcomponents that should be promoted into shared files.

3. **Large files mixing too many concerns**
   - Several organisms blend UI composition, utility functions, state hooks, and table
     configuration in one place.

4. **Weak reuse boundaries**
   - Shared table patterns and document-selection behavior are implemented locally instead of as
     reusable architecture.

5. **Storybook coverage gaps in high-risk areas**
   - The components with the most architectural risk are also under-documented in Storybook.

## Recommended Priority Order

1. **Create stories for all 8 missing organisms**
   - This is the best first step because it improves visibility and safety before structural
     changes. It enables isolated development, visual review, and regression detection.

2. **Extract `useCollectionManager` hook** (from `CollectionDocumentManager`)

     Currently the data-loading and selection logic lives directly in the component body.
     Pulling it into a hook makes the logic reusable and easier to test.

     - Move all `useEffect` data-loading, `handleConfirm`, and state into `hooks/useCollectionManager.ts`
     - `CollectionDocumentManager` becomes a thin UI wrapper around the hook

3. ~~**Extract `useOverviewTableState` into `hooks/`**~~ DONE - hook moved to `hooks/useOverviewTableState.ts`

4. **Reclassify `CreateTagDialog`** - Move out of the atom tier; its responsibilities are organism-level.
5. **Reclassify `TagSearchCombobox`** - Its autocomplete behavior and statefulness place it above molecule complexity.
6. **Decompose `BatchSummaryTable`** - Multiple exportable concerns already identifiable and separable.
7. ~~**Decompose `DocumentsTable`**~~ DONE - hook extracted

8. **Create shared table infrastructure**
   - After the first wave of extractions, standardize the common scaffolding used by audit, review,
     ready-for-library, and document table flows.

## Target Architecture

The target state should preserve Atomic Design while making reuse and ownership boundaries explicit.

### Proposed direction

| Area | Target structure |
|---|---|
| atoms | Keep only tiny display primitives and wrappers such as `Badge`, `Button`, `Date`, `FileSize`, `FilterPill`, `StateBadge`, `icons`, and atom-sized cards like `StatCard` if desired. |
| molecules | Add reusable composed units such as `SelectionTable`, `KeyValueRow`, `NestedValueRenderer`, and other compact table or form subcomponents. |
| organisms | Keep feature-level dialogs, editors, accordions, and workflow-oriented tables such as `CreateTagDialog`, `TagSearchCombobox`, `BatchDetailPanel`, and the refactored page-level table components. |
| hooks | Move shared state orchestration such as `useOverviewTableState` into `hooks/`. |
| utilities | Move shared domain operations such as `sortDocuments`, `filterDocuments`, and compare helpers into dedicated utility modules. |
| Storybook | Ensure every organism has a story before or alongside refactoring work. |

### Example target layout

```text
components/
  atoms/
    Badge.tsx
    Button.tsx
    Date.tsx
    FileSize.tsx
    FilterPill.tsx
    StateBadge.tsx
    StatCard.tsx
    icons/
  molecules/
    ConfirmationDialog.tsx
    FieldRow.tsx
    Pagination.tsx
    SidebarToggle.tsx
    TagPill.tsx
    SelectionTable.tsx
    CollectionDocumentsTable.tsx
    KeyValueRow.tsx
    NestedValueRenderer.tsx
  organisms/
    CreateTagDialog.tsx
    TagSearchCombobox.tsx
    AssignCollectionButton.tsx
    BatchDetailPanel.tsx
    BatchSummaryTable.tsx
    CollectionDocumentManager.tsx
    CollectionsAccordion.tsx
    DocumentsTable.tsx
    DocumentTagsEditor.tsx
    MermaidDiagram.tsx
    NoDataState.tsx
    PageHeader.tsx
molecules/
    SelectionTable.tsx      ← extracted from CollectionDocumentManager
hooks/
  useCollectionManager.ts    ← extracted from CollectionDocumentManager
  useOverviewTableState.ts
```

### End-state goals

- Each layer tells the truth about component complexity.
- Reusable logic is extracted from page-scale organisms.
- Table-heavy workflows share infrastructure instead of duplicating it.
- Storybook covers every organism so refactors can proceed safely.
- Large files become easier to read, test, and evolve.
