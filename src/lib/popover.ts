export const POPOVER_OPEN_EVENT = "popover:open";

export function announcePopoverOpen(id: string) {
  window.dispatchEvent(new CustomEvent<string>(POPOVER_OPEN_EVENT, { detail: id }));
}
