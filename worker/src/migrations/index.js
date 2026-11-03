// The ordered migration list /ops applies. Adding a migration means adding its
// .sql file beside this one AND a line here; the runner only knows what this
// list names.
//
// Rules (as in KennelOS cloud):
// - pre-launch, 0001 may be edited on staging (it then reads as drifted);
// - from the first real site on production, forward-only and additive, and an
//   applied file is never edited: its checksum is what drift is measured by;
// - semicolons inside strings, comments and trigger bodies are fine:
//   lib/sql.js understands them.
import schema from './0001_schema.sql';
import content from './0002_content.sql';
import accounts from './0003_accounts.sql';
import messages from './0004_messages.sql';
import photoTags from './0005_photo_tags.sql';
import payment from './0006_payment.sql';
import application from './0007_application.sql';
import feed from './0008_feed.sql';
import waitlist from './0009_waitlist.sql';
import logo from './0010_logo.sql';
import albums from './0011_albums.sql';
import embeds from './0012_embeds.sql';
import usage from './0013_usage.sql';
import customDomains from './0014_custom_domains.sql';
import kennelosLink from './0015_kennelos_link.sql';
import products from './0016_products.sql';
import registration from './0017_registration.sql';
import puppyPhotos from './0018_puppy_photos.sql';
import albumOrder from './0019_album_order.sql';
import puppyMorePhotos from './0020_puppy_more_photos.sql';
import faqPlacesLitterNames from './0021_faq_places_litter_names.sql';

export const MIGRATIONS = [
  { id: '0001', name: 'schema', sql: schema },
  { id: '0002', name: 'content', sql: content },
  { id: '0003', name: 'accounts', sql: accounts },
  { id: '0004', name: 'messages', sql: messages },
  { id: '0005', name: 'photo_tags', sql: photoTags },
  { id: '0006', name: 'payment', sql: payment },
  { id: '0007', name: 'application', sql: application },
  { id: '0008', name: 'feed', sql: feed },
  { id: '0009', name: 'waitlist', sql: waitlist },
  { id: '0010', name: 'logo', sql: logo },
  { id: '0011', name: 'albums', sql: albums },
  { id: '0012', name: 'embeds', sql: embeds },
  { id: '0013', name: 'usage', sql: usage },
  { id: '0014', name: 'custom_domains', sql: customDomains },
  { id: '0015', name: 'kennelos_link', sql: kennelosLink },
  { id: '0016', name: 'products', sql: products },
  { id: '0017', name: 'registration', sql: registration },
  { id: '0018', name: 'puppy_photos', sql: puppyPhotos },
  { id: '0019', name: 'album_order', sql: albumOrder },
  { id: '0020', name: 'puppy_more_photos', sql: puppyMorePhotos },
  { id: '0021', name: 'faq_places_litter_names', sql: faqPlacesLitterNames },
];
