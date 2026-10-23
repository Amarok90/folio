import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(
  new URL('../../src/styles/tokens.css', import.meta.url),
  'utf8',
);
const globalCSS = readFileSync(
  new URL('../../src/styles/global.css', import.meta.url),
  'utf8',
);
const colors = Object.fromEntries(
  [...tokens.matchAll(/--(color-[a-z-]+):\s*(#[\da-f]{6});/g)].map((match) => [
    match[1]!,
    match[2]!,
  ]),
);
function luminance(color: string) {
  const channels = color
    .slice(1)
    .match(/../g)!
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
function contrast(foreground: string, background: string) {
  const values = [
    luminance(colors[foreground]!),
    luminance(colors[background]!),
  ].sort((a, b) => b - a);
  return (values[0]! + 0.05) / (values[1]! + 0.05);
}

describe('design system accessibility invariants', () => {
  it.each([
    'color-text',
    'color-text-secondary',
    'color-text-muted',
    'color-primary-text',
    'color-secondary',
  ] as const)(
    '%s meets AA on the lightest and tinted surfaces',
    (foreground) => {
      for (const background of [
        'color-surface',
        'color-background',
        'color-background-secondary',
      ])
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    },
  );
  it('keeps the approved brand accent distinguishable for non-text graphics', () => {
    for (const background of ['color-surface', 'color-background-secondary'])
      expect(contrast('color-primary', background)).toBeGreaterThanOrEqual(3);
  });
  it('preserves AA text contrast at both gradient endpoints and the dark footer', () => {
    for (const background of ['color-gradient-start', 'color-gradient-end'])
      expect(contrast('color-on-primary', background)).toBeGreaterThanOrEqual(
        4.5,
      );
    expect(
      contrast('color-inverse-muted', 'color-inverse-surface'),
    ).toBeGreaterThanOrEqual(4.5);
  });
  it('defines every CSS custom property consumed by the global primitives', () => {
    const definitions = new Set(
      [...`${tokens}\n${globalCSS}`.matchAll(/(--[a-z\d-]+)\s*:/g)].map(
        (match) => match[1],
      ),
    );
    const references = [...globalCSS.matchAll(/var\((--[a-z\d-]+)/g)].map(
      (match) => match[1],
    );
    expect(
      references.filter((reference) => !definitions.has(reference)),
    ).toEqual([]);
  });
});
