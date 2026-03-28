import { useEffect, useRef, useState, type ReactNode } from "react";

export type DropdownItem = {
  label: string;
  value: string;
  active?: boolean;
};

export function Dropdown({
  trigger,
  items,
  onSelect,
  className,
  disabled = false,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || disabled) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!rootRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const updatePlacement = () => {
      const triggerRect = rootRef.current?.getBoundingClientRect();
      const popoverRect = popoverRef.current?.getBoundingClientRect();
      if (!triggerRect || !popoverRect) {
        return;
      }

      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const neededHeight = Math.min(popoverRect.height, window.innerHeight * 0.4);
      setPlacement(spaceBelow >= neededHeight || spaceBelow >= spaceAbove ? "below" : "above");
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [items.length, open]);

  return (
    <div ref={rootRef} className={open ? "sidebar-actions-menu open" : "sidebar-actions-menu"}>
      <button
        className={className ? `sidebar-actions-trigger ${className}` : "sidebar-actions-trigger"}
        type="button"
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="dropdown-trigger-label">{trigger}</span>
        <span className={open ? "dropdown-trigger-icon open" : "dropdown-trigger-icon"} aria-hidden="true">
          ▾
        </span>
      </button>

      {open ? (
        <div
          ref={popoverRef}
          className={placement === "above" ? "sidebar-actions-popover open-above" : "sidebar-actions-popover open-below"}
          role="menu"
        >
          {items.map((item) => (
            <button
              key={item.value}
              className={item.active ? "secondary-button dropdown-item active" : "secondary-button dropdown-item"}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                queueMicrotask(() => {
                  onSelect(item.value);
                });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
