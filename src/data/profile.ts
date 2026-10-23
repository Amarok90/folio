import source from './profile.json';
import { profileSchema } from '../lib/content';

/** Only the owner's supplied name and title are populated; unknown facts remain null. */
export const profile = profileSchema.parse(source);
