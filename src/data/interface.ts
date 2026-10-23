import source from './interface.json';
import { interfaceSchema } from '../lib/content';

/** One CMS-managed source for website wording and constrained actions. */
export const interfaceContent = interfaceSchema.parse(source);

/** The lightweight handwriting subset contains only the approved four words. */
export function usesSignatureFont(words: readonly string[]): boolean {
  return (
    words.length === 4 &&
    words.every(
      (word, index) =>
        word === ['Ideas', 'Analysis', 'Solutions', 'Impact'][index],
    )
  );
}
