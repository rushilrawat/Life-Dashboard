import type { LocalSource } from "../types";

// Fixed dropdown options for a LocalSource (ARCHITECTURE.md: "both fixed
// dropdown options, not free text"). Shared between the per-card header
// dropdown and the Add/Edit panel so the label text can't drift between them.

export const FILTER_OPTIONS: { value: LocalSource["filter"]; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "this-week", label: "This Week" },
  { value: "overdue", label: "Overdue" },
  { value: "in-progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export const SORT_OPTIONS: { value: LocalSource["sort"]; label: string }[] = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "percent-desc", label: "Highest %" },
  { value: "percent-asc", label: "Lowest %" },
  { value: "name", label: "Name" },
];
