import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type HsvColor = {
  h: number;
  s: number;
  v: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim().replace(/^#/, "");
  if (/^[\da-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase()}`;
  }
  if (/^[\da-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }
  return null;
}

function hexToRgb(value: string): [number, number, number] | null {
  const normalized = normalizeHex(value);
  if (!normalized) {
    return null;
  }
  return [
    parseInt(normalized.slice(1, 3), 16),
    parseInt(normalized.slice(3, 5), 16),
    parseInt(normalized.slice(5, 7), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  return {
    h: hue,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = v - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return [
    (red + match) * 255,
    (green + match) * 255,
    (blue + match) * 255,
  ];
}

function hexToHsv(value: string): HsvColor {
  const rgb = hexToRgb(value);
  if (!rgb) {
    return { h: 0, s: 0, v: 0 };
  }
  return rgbToHsv(rgb[0], rgb[1], rgb[2]);
}

function hsvToHex(color: HsvColor) {
  const [r, g, b] = hsvToRgb(color.h, color.s, color.v);
  return rgbToHex(r, g, b);
}

function hueTrackBackground() {
  return "linear-gradient(90deg, #ff5f57 0%, #ffb347 17%, #ffe066 33%, #52d273 50%, #3ba7ff 67%, #8c6bff 83%, #ff5f57 100%)";
}

export function ColorPickerField({
  label,
  value,
  presets,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const normalizedValue = useMemo(() => normalizeHex(value) ?? "#000000", [value]);
  const hsvColor = useMemo(() => hexToHsv(normalizedValue), [normalizedValue]);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"above" | "below">("below");
  const [hexInput, setHexInput] = useState(normalizedValue);
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const dragModeRef = useRef<"palette" | "hue" | null>(null);

  useEffect(() => {
    setHexInput(normalizedValue);
  }, [normalizedValue]);

  useEffect(() => {
    if (!open || disabled) {
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
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
      setPopoverStyle(null);
      return undefined;
    }

    const updatePlacement = () => {
      const triggerRect = rootRef.current?.getBoundingClientRect();
      const popoverRect = popoverRef.current?.getBoundingClientRect();
      if (!triggerRect || !popoverRect) {
        return;
      }
      const viewportPadding = 16;
      const gap = 12;
      const width = Math.min(320, window.innerWidth - viewportPadding * 2);
      const left = clamp(triggerRect.right - width, viewportPadding, window.innerWidth - viewportPadding - width);
      const neededHeight = Math.min(popoverRect.height, window.innerHeight * 0.56);
      const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
      const spaceAbove = triggerRect.top - viewportPadding;
      const nextPlacement = spaceBelow >= neededHeight || spaceBelow >= spaceAbove ? "below" : "above";
      const top =
        nextPlacement === "below"
          ? clamp(triggerRect.bottom + gap, viewportPadding, window.innerHeight - viewportPadding - popoverRect.height)
          : clamp(triggerRect.top - popoverRect.height - gap, viewportPadding, window.innerHeight - viewportPadding - popoverRect.height);
      setPlacement(nextPlacement);
      setPopoverStyle({ top, left, width });
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open]);

  const updatePaletteColor = (clientX: number, clientY: number) => {
    const rect = paletteRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const saturation = clamp((clientX - rect.left) / rect.width, 0, 1);
    const valueLevel = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    onChange(hsvToHex({ h: hsvColor.h, s: saturation, v: valueLevel }));
  };

  const updateHueColor = (clientX: number) => {
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const hue = clamp((clientX - rect.left) / rect.width, 0, 1) * 360;
    onChange(hsvToHex({ h: hue, s: hsvColor.s, v: hsvColor.v }));
  };

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (dragModeRef.current === "palette") {
        updatePaletteColor(event.clientX, event.clientY);
      }
      if (dragModeRef.current === "hue") {
        updateHueColor(event.clientX);
      }
    };

    const handlePointerUp = () => {
      dragModeRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [hsvColor.h, hsvColor.s, hsvColor.v, open]);

  const commitHexInput = () => {
    const normalized = normalizeHex(hexInput);
    if (normalized) {
      onChange(normalized);
      setHexInput(normalized);
      return;
    }
    setHexInput(normalizedValue);
  };

  const hueHandleLeft = `${(hsvColor.h / 360) * 100}%`;
  const paletteCursorLeft = `${hsvColor.s * 100}%`;
  const paletteCursorTop = `${(1 - hsvColor.v) * 100}%`;
  const paletteBackground = `hsl(${hsvColor.h} 100% 50%)`;

  return (
    <div ref={rootRef} className="personalization-color-picker-root">
      <button
        className={open ? "personalization-color-chip open" : "personalization-color-chip"}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <span
          className="personalization-color-swatch"
          style={{ backgroundColor: normalizedValue }}
          aria-hidden="true"
        />
        <span className="personalization-color-value">{normalizedValue}</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={popoverRef}
              className={placement === "above" ? "personalization-color-popover picker-surface open-above" : "personalization-color-popover picker-surface open-below"}
              role="dialog"
              aria-label={label}
              style={
                popoverStyle
                  ? {
                      top: `${popoverStyle.top}px`,
                      left: `${popoverStyle.left}px`,
                      width: `${popoverStyle.width}px`,
                    }
                  : undefined
              }
            >
              <div className="personalization-color-popover-header">
                <div
                  className="personalization-color-popover-preview"
                  style={{ backgroundColor: normalizedValue }}
                  aria-hidden="true"
                />
                <div className="personalization-color-popover-copy">
                  <p className="eyebrow">{label}</p>
                  <strong>{normalizedValue}</strong>
                </div>
              </div>

              <div className="personalization-color-canvas-group">
                <div
                  ref={paletteRef}
                  className="personalization-color-surface"
                  style={{ backgroundColor: paletteBackground }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    dragModeRef.current = "palette";
                    updatePaletteColor(event.clientX, event.clientY);
                  }}
                >
                  <span className="personalization-color-surface-overlay personalization-color-surface-overlay--light" />
                  <span className="personalization-color-surface-overlay personalization-color-surface-overlay--dark" />
                  <span
                    className="personalization-color-cursor"
                    style={{ left: paletteCursorLeft, top: paletteCursorTop }}
                  />
                </div>

                <div
                  ref={hueRef}
                  className="personalization-color-hue"
                  style={{ backgroundImage: hueTrackBackground() }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    dragModeRef.current = "hue";
                    updateHueColor(event.clientX);
                  }}
                >
                  <span className="personalization-color-hue-handle" style={{ left: hueHandleLeft }} />
                </div>
              </div>

              <div className="personalization-color-footer">
                <label className="personalization-color-hex-field">
                  <span className="eyebrow">HEX</span>
                  <input
                    type="text"
                    value={hexInput}
                    inputMode="text"
                    spellCheck={false}
                    maxLength={7}
                    onChange={(event) => {
                      setHexInput(event.target.value.toUpperCase().replace(/[^#0-9A-F]/g, ""));
                    }}
                    onBlur={commitHexInput}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitHexInput();
                      }
                    }}
                  />
                </label>

                <div className="personalization-color-presets">
                  {presets.map((preset) => {
                    const normalizedPreset = normalizeHex(preset) ?? preset;
                    return (
                      <button
                        key={normalizedPreset}
                        className={normalizedPreset === normalizedValue ? "personalization-color-preset active" : "personalization-color-preset"}
                        type="button"
                        aria-label={normalizedPreset}
                        onClick={() => onChange(normalizedPreset)}
                        style={{ backgroundColor: normalizedPreset }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
