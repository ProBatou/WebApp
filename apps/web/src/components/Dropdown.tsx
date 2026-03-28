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
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div ref={rootRef} className={open ? "sidebar-actions-menu open" : "sidebar-actions-menu"}>
      <button
        className={className ? `sidebar-actions-trigger ${className}` : "sidebar-actions-trigger"}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {trigger}
      </button>

      {open ? (
        <div className="sidebar-actions-popover" role="menu">
          {items.map((item) => (
            <button
              key={item.value}
              className={item.active ? "secondary-button dropdown-item active" : "secondary-button dropdown-item"}
              type="button"
              onClick={() => {
                setOpen(false);
                onSelect(item.value);
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
