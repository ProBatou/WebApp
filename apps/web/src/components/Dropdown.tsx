import { useEffect, useRef, useState, type ReactNode } from "react";

export type DropdownItem = {
  label: ReactNode;
  value: string;
  active?: boolean;
};

export function Dropdown({
  trigger,
  items,
  onSelect,
  className,
  disabled = false,
  hideChevron = false,
  ariaLabel,
  title,
}: {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (value: string) => void;
  className?: string;
  disabled?: boolean;
  hideChevron?: boolean;
  ariaLabel?: string;
  title?: string;
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
        aria-label={ariaLabel}
        title={title}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="dropdown-trigger-label">{trigger}</span>
        {hideChevron ? null : (
          <span className={open ? "dropdown-trigger-icon open" : "dropdown-trigger-icon"} aria-hidden="true">
            ▾
          </span>
        )}
      </button>

      {open ? (
        <div
          ref={popoverRef}
          className={placement === "above" ? "sidebar-actions-popover picker-surface open-above" : "sidebar-actions-popover picker-surface open-below"}
          role="menu"
        >
          <div className="sidebar-actions-popover-list picker-scroll-shell">
            <div className="sidebar-actions-popover-content picker-scroll-content">
              {items.map((item) => (
                <button
                  key={item.value}
                  className={item.active ? "secondary-button dropdown-item picker-card-option active" : "secondary-button dropdown-item picker-card-option"}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                    queueMicrotask(() => {
                      onSelect(item.value);
                    });
                  }}
                >
                  <span className="dropdown-item-label">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
