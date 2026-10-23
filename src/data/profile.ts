import source from './profile.json';
import { parsePublicProfile } from '../lib/content';

/** Published professional facts are sourced from the owner's LinkedIn profile and CV. */
export const profile = parsePublicProfile(source);
