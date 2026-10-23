import portrait from '../assets/portrait.png';
import alpine from '../assets/alpine.webp';
import contact from '../assets/contact.webp';
import banking from '../assets/banking-review.webp';
import fintech from '../assets/fintech-review.webp';
import insurance from '../assets/insurance-review.webp';

/** Replace portrait.png once to update both Hero and About. See README. */
export const media = {
  portrait,
  portraitAlt:
    'Temporary professional portrait, to be replaced with Konstantin’s own photo',
  portraitTemporary: true,
  alpine,
  contact,
  projects: [banking, fintech, insurance],
} as const;
