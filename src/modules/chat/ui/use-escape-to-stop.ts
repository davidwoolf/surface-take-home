import { useEffect } from "react";

/**
 * Stops the response in progress when Escape is pressed anywhere on the page,
 * including in the prompt input. An open dialog or menu gets Escape first.
 */
export function useEscapeToStop(active: boolean, stop: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"]')) return;
      event.preventDefault();
      stop();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, stop]);
}
