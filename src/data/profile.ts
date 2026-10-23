import source from './profile.json';
import { profileSchema } from '../lib/content';

/** Published professional facts are sourced from the owner's LinkedIn profile and CV. */
export const profile = profileSchema.parse(source);
