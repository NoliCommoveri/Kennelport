// The breeder's instructions (docs/plans/site-builder.md, step 2, decision 19): every
// line of wording she reads in the Site Manager, as one list the owner edits. Each
// item has a key, the screen it's grouped under, where it appears, its default
// (today's wording: decision 14) and the names it may use ({kennel} everywhere;
// others where the screen has them, like {n} for a count).
//
// The owner's wording is set once for every site (the wording table) and can be
// changed per site (the site's build: wording); per template comes with templates
// (step 5). say() takes the site's, else every site's, else the default.
//
// The field labels and hints (forms.js LABELS, SHARED) and the choice words
// (ENUM_WORDS) stay where the forms are, and are listed here from there; the rest
// of the defaults are below. Not listed: the owner's own admin screens, and
// messages about KennelPort itself failing (a lost connection).
import { LABELS, SHARED, ENUM_WORDS } from './forms.js';

export class WordingError extends Error {}

// The screens, in the order the owner's editor lists them.
export const SCREENS = Object.freeze({
  home: 'Her home screen',
  notes: 'Saved, added, removed: the notes after a change',
  lists: 'Lists (dogs, litters, extras…)',
  fields: 'Every form: fields they share',
  site: 'Kennel details',
  dogs: 'A dog',
  health: 'A health result',
  partners: 'A partner kennel',
  litters: 'A litter',
  puppies: 'A puppy',
  reviews: 'A review',
  steps: 'A step (How it works)',
  expander: 'A policy, FAQ question or help section',
  extras: 'An extra',
  products: 'A recommended product',
  albums: 'An album',
  questions: 'An application question',
  homeblocks: 'Home page blocks',
  pages: 'Pages and wording',
  payment: 'How to pay',
  choices: 'Choices in lists',
  puppylist: 'Puppies at a glance',
  litterlist: 'Litters',
  doglist: 'Dogs',
  photos: 'Photos and albums',
  waitlistpage: 'Waitlist and application',
  waitlistlist: 'Your waitlist',
  inbox: 'Inbox',
  queue: 'Reviews to approve',
  publish: 'Publish',
  share: 'Share',
  kennelos: 'KennelOS',
  account: 'Your site: storage, copy, delete',
  errors: 'Errors: what to fix when a form isn\'t saved',
  signin: 'Signing in, and her sites',
  notifications: 'Notifications',
});

// Which screen a form's kind belongs to.
const KIND_SCREEN = {
  site: 'site', dogs: 'dogs', partners: 'partners', health: 'health', litters: 'litters', puppies: 'puppies', reviews: 'reviews', steps: 'steps',
  expander: 'expander', extras: 'extras', products: 'products', albums: 'albums', questions: 'questions',
  hero: 'homeblocks', facts: 'homeblocks', story: 'homeblocks', waitlist: 'pages', pickup: 'pages', products_page: 'pages', about: 'pages', contact: 'pages',
  extras_page: 'pages', payment: 'payment', safe_notice: 'payment',
};
const KIND_WORDS = {
  hero: 'Top of the page', facts: 'Facts row', story: 'Story', waitlist: 'Waitlist page (and Home\'s waitlist band)', pickup: 'Getting your pup home page',
  products_page: 'Recommended products page', about: 'Our story page', contact: 'Contact page', extras_page: 'Extras page', payment: 'Application fee and deposit',
  safe_notice: 'Safe-payment notice',
};

// Her home screen (manage/index.js siteHome), the website's tiles and set-up list.
const HOME = {
  'home.status.draft': 'Not published yet',
  'home.status.live': 'Live',
  'home.status.suspended': 'Switched off by KennelPort',
  'home.unpublished': 'changes not published yet',
  'home.view': 'View my site',
  'home.preview': 'Preview changes',
  'home.share': 'Share',
  'home.publish': 'Publish',
  'home.review_publish': 'Review and publish',
  'home.needs': 'Needs you',
  'home.needs.messages.one': '{n} new message',
  'home.needs.messages.many': '{n} new messages',
  'home.needs.messages.note': 'In your inbox',
  'home.needs.site_messages.one': '{n} new message from your website',
  'home.needs.site_messages.many': '{n} new messages from your website',
  'home.needs.reviews.one': '{n} review to approve',
  'home.needs.reviews.many': '{n} reviews to approve',
  'home.needs.reviews.note': 'From families',
  'home.needs.leaving.one': '{n} litter leaving your site',
  'home.needs.leaving.many': '{n} litters leaving your site',
  'home.needs.leaving.note': 'Keep or remove',
  'home.tile.puppies': 'Puppies',
  'home.tile.puppies.note': 'Statuses at a glance',
  'home.tile.litters': 'Litters',
  'home.tile.litters.note': 'Planned, current, past',
  'home.tile.litters.leaving': '{n} leaving your site',
  'home.tile.photos': 'Photos and albums',
  'home.tile.photos.note': 'Camera roll, galleries',
  'home.tile.waitlist': 'Your waitlist',
  'home.tile.waitlist.note': 'Families in order, offer pups',
  'home.tile.waitlist.one': '{n} family waiting',
  'home.tile.waitlist.many': '{n} families waiting',
  'home.tile.inbox': 'Inbox',
  'home.tile.inbox.note': 'Messages from your site',
  'home.tile.dogs': 'Dogs',
  'home.tile.dogs.note': 'Cards, health results',
  'home.setup': 'Set up your site',
  'home.setup.note': 'Set once, change now and then.',
  'home.setup.pages': 'Pages and wording',
  'home.setup.pages.note': 'Home, about, policies, FAQ…',
  'home.setup.waitlist': 'Waitlist and application',
  'home.setup.waitlist.online': 'Linked to KennelOS, which takes your applications',
  'home.setup.waitlist.linked': 'Linked to KennelOS · your questions',
  'home.setup.waitlist.offered': 'Your questions, or link KennelOS',
  'home.setup.waitlist.note': 'Open or closed, your questions',
  'home.setup.payment': 'How to pay',
  'home.setup.payment.note': 'Fee, deposit, scam warning',
  'home.setup.extras': 'Extras',
  'home.setup.extras.note': 'Packages and prices',
  'home.setup.products': 'Recommended products',
  'home.setup.products.note': 'Referral links, codes, home badges',
  'home.setup.reviews': 'Reviews',
  'home.setup.reviews.note': 'Add or hide',
  'home.setup.details': 'Kennel details',
  'home.setup.details.note': 'Name, contact, town',
  'home.setup.kennelos': 'KennelOS',
  'home.setup.kennelos.linked': 'Linked · last update {date}',
  'home.setup.kennelos.waiting': 'Linked · no update yet',
  'home.setup.kennelos.note': 'Link your dogs and litters',
  'home.notifications': 'Notifications on this device',
  'home.account': 'Your site: storage, copy, delete',
  'home.role': 'Your role: {role}.',
  'home.other_sites': 'Your other sites',
  'home.signout': 'Sign out',
};
const HOME_WHERE = {
  'home.status.draft': 'Her site\'s status, before its first publish', 'home.status.live': 'Her site\'s status, once published',
  'home.status.suspended': 'Her site\'s status, when KennelPort has switched it off', 'home.unpublished': 'After the status, while there are changes to publish',
  'home.needs': 'Heading over what\'s waiting for her', 'home.setup.note': 'Set up your site: the line under its heading',
};

// The notes after a change (screens.js), by the note in the address.
const NOTES = {
  saved: 'Saved to your draft. Publish when you\'re ready.',
  not_saved: 'Not saved: one of the lines is too long.',
  added: 'Added to your draft.',
  removed: 'Removed from your draft.',
  moved: 'Moved.',
  status: 'Status changed in your draft.',
  uploaded: 'Photos added.',
  embedded: 'Added to your draft. It shows on your site after you publish.',
  tagged: 'Saved.',
  tagmany: 'Tagged.',
  tagnone: 'Nothing tagged: tick at least one photo, then choose who\'s in them.',
  pick_none: 'Nothing changed: choose at least one photo first.',
  onprofile: 'They show on that profile now.',
  offprofile: 'Taken off that profile.',
  inalbum: 'Added to the album.',
  noalbum: 'That album isn\'t there any more.',
  deleted: 'Message deleted.',
  approved: 'Approved. It shows on your site after you publish.',
  declined: 'Declined and deleted.',
  published: 'Published. Visitors now see your changes.',
  listed: 'Added to your waitlist. It shows on your website now.',
  fulfilled: 'Marked fulfilled. Everyone below moved up.',
  back: 'Put back in its place.',
  listsaved: 'Saved. Your website shows it now.',
  unlisted: 'Deleted from your waitlist.',
  undone: 'Undone. Visitors see the version before.',
  kept: 'Kept. It stays as a past litter until you remove it.',
  litterremoved: 'Removed, with its puppies, albums and the photos nothing else uses.',
  matched: 'Matched. It now comes from KennelOS, with your photos and wording kept.',
  apart: 'Kept apart. KennelOS\'s one is added as new.',
  stopped: 'That device is no longer linked.',
  unlinked: 'Unlinked. Everything from KennelOS is now yours to edit here.',
  made_parent: 'Made a dog record for this parent and linked it. It\'s marked Not my dog: change that below if it was yours, and add its own parents.',
};
export const NOTE_KEYS = Object.keys(NOTES);

// The lists (screens.js LISTS): what each is called, and its shared lines.
const LIST_TITLES = {
  dogs: ['Dogs', 'dog'], litters: ['Litters', 'litter'], puppies: ['Puppies', 'puppy'], health: ['Health results', 'result'], reviews: ['Reviews', 'review'],
  steps: ['How it works', 'step'], extras: ['Extras', 'extra'], partners: ['Partner kennels', 'kennel'], products: ['Recommended products', 'product'],
  policies: ['Policies', 'policy'], faq: ['FAQ', 'question'], waitlist_help: ['Using your status page', 'section'], albums: ['Albums', 'album'],
  questions: ['Application questions', 'question'],
};
const LISTS = {
  'list.empty': 'None yet.',
  'list.add': 'Add {one}',
  'list.new': 'New {one}',
  'list.save': 'Save',
  'list.error': 'Not saved: {error}',
  // The line under each item.
  'lists.sub.hidden': 'hidden',
  'lists.sub.hidden_puppy': 'Hidden',
  'lists.sub.not_shown': 'not shown',
  'lists.sub.stage.planned': 'Planned',
  'lists.sub.stage.current': 'Born',
  'lists.sub.stage.past': 'Past',
  'lists.sub.package': '{weeks}-week package',
  'lists.sub.not_sent': 'Not sent by KennelOS · not shown',
  'lists.sub.code': 'code {code}',
  'lists.sub.transport': 'transport service',
  'lists.sub.home_badge': 'home page badge',
  'lists.sub.also_on': 'also on {places}',
  'lists.place.page': '{page} page',
  'lists.place.none': 'No page of your site has a place for these yet. Whoever set up your site can add one.',
  'lists.sub.photos.one': '{n} photo',
  'lists.sub.photos.many': '{n} photos',
  'lists.sub.must_answer': 'must answer',
  'lists.sub.optional': 'optional',
  'lists.qtype.text': 'Short answer',
  'lists.qtype.paragraph': 'Longer answer',
  'lists.qtype.choice': 'Choice',
  'lists.qtype.yes_no': 'Yes or no',
  'lists.qtype.litter': 'Which litter',
  'lists.qtype.phone': 'Phone',
  'lists.qtype.town': 'Town',
  // Home's blocks, on her Home page screen.
  'homeblocks.title.hero': 'Top of the page',
  'homeblocks.title.facts': 'Facts row',
  'homeblocks.title.story': 'Story',
  'homeblocks.title.dogs': 'Dogs row',
  'homeblocks.title.litters': 'Litters',
  'homeblocks.title.reviews': 'Reviews',
  'homeblocks.title.waitlist': 'Waitlist band',
  'homeblocks.on': 'on',
  'homeblocks.off': 'off',
  // Records from KennelOS waiting to be matched (her home screen, Publish).
  'kennelos.waiting.one': '{n} from KennelOS is waiting for you to match.',
  'kennelos.waiting.many': '{n} from KennelOS are waiting for you to match.',
  'kennelos.waiting.text.one': 'It has the same name as one already on your website. Until you answer, your website keeps showing your own version, without what KennelOS sent (its sex, health results and so on).',
  'kennelos.waiting.text.many': 'They have the same name as one already on your website. Until you answer, your website keeps showing your own version, without what KennelOS sent (its sex, health results and so on).',
  'kennelos.waiting.answer.one': 'Answer it',
  'kennelos.waiting.answer.many': 'Answer them',
};
// Where those lines show.
const LIST_WHERE = {
  'lists.sub': 'Under an item in a list', 'lists.qtype': 'An application question\'s kind, under it in the list',
  'lists.place.page': 'A page added for her, in the tick boxes for where a question or badge shows',
  'lists.place.none': 'Where a question or badge shows, when no page has a place for them',
  'homeblocks.title': 'A Home block\'s name, in the list and as its screen\'s heading', 'homeblocks.on': 'Beside a Home block that is on',
  'homeblocks.off': 'Beside a Home block that is off', 'kennelos.waiting': 'The "waiting for you to match" card, on her home screen and Publish',
};
const SCREEN_OF_LIST = { lists: 'lists', homeblocks: 'homeblocks', kennelos: 'kennelos' };

// Each screen's own lines (screens.js), drawn where the screen draws them:
// key → [screen, what it is, today's wording]. A line marked "Part of a line" or
// "up to a link or bold words" runs on round a link or bold words.
const SCREEN_LINES = {
  "products.or_paste_the_embed": ["products", "Field label", "Or paste the embed code they gave you"],
  "products.the_html_from_the": ["products", "Help under a field", "The HTML from the brand's referral page, starting with <a href=. It fills in your referral link and the picture. The code itself isn't kept."],
  "partners.or_paste_the_badge": ["partners", "Field label", "Or paste the badge code they gave you"],
  "partners.the_html_for_their": ["partners", "Help under a field", "The HTML for their badge or logo, starting with <a href=. It fills in their website and logo. The code itself isn't kept."],
  "photos.who_s_in_them": ["photos", "Choice in a list", "Who's in them…"],
  "photos.tag": ["photos", "Button", "Tag"],
  "photos.tick": ["photos", "Part of a line", "Tick"],
  "litterlist.leaving_your_site": ["litterlist", "Heading", "Leaving your site"],
  "litterlist.keep": ["litterlist", "Button", "Keep"],
  "litterlist.remove_now": ["litterlist", "Button", "Remove now"],
  "litterlist.partner_kennels": ["litterlist", "Link", "Partner kennels"],
  "litterlist.the_kennels_your_co": ["litterlist", "Line", "The kennels your co-owned dogs are shared with, and their logos."],
  "doglist.not_on_your_site": ["doglist", "Heading", "Not on your site"],
  "doglist.remove": ["doglist", "Button", "Remove"],
  "doglist.outside": ["doglist", "Line", "Outside dog"],
  "dogform.pedigree": ["dogs", "Heading", "Pedigree"],
  "dogform.pedigree_hint": ["dogs", "Line", "Its sire and dam, and theirs, from your dog records. A parent you typed by name can be made a dog record of its own, with a page and its own parents."],
  "dogform.no_parents": ["dogs", "Empty", "No sire or dam yet. Set them above, under Parents."],
  "dogform.name_only": ["dogs", "Line", "name only"],
  "dogform.make_record": ["dogs", "Button", "Make a dog record"],
  "dogform.sire": ["dogs", "Line", "Sire"],
  "dogform.dam": ["dogs", "Line", "Dam"],
  "kennelos.your_code": ["kennelos", "Notice", "Your code:"],
  "kennelos.each_phone_or_computer": ["kennelos", "Help line", "Each phone or computer you use KennelOS on links once, with its own code."],
  "kennelos.devices": ["kennelos", "Heading", "Devices"],
  "kennelos.stop_this_device": ["kennelos", "Button", "Stop this device"],
  "kennelos.prices": ["kennelos", "Heading", "Prices"],
  "kennelos.use_my_kennelos_prices": ["kennelos", "Line", "Use my KennelOS prices"],
  "kennelos.on_each_litter_s": ["kennelos", "Help under a field", "On: each litter's prices, deposits and full-registration amounts, and your extras' prices, come from KennelOS with the next Update website, and can't be changed here. Switching it on turns on Show prices for those litters, and for each new one KennelOS sends; you can still switch a litter's off. Off: you type them here, and they show only where you switch Show prices on. A puppy's own price and an adult's asking price are always typed here."],
  "kennelos.save": ["kennelos", "Button", "Save"],
  "kennelos.unlink": ["kennelos", "Heading", "Unlink"],
  "kennelos.every_device_stops_and": ["kennelos", "Help line", "Every device stops, and everything that came from KennelOS stays in your draft as ordinary content you can edit here. KennelOS's next Update website will say your site is no longer linked."],
  "kennelos.unlink_kennelos": ["kennelos", "Button", "Unlink KennelOS"],
  "kennelos.tick_to_keep_yours": ["kennelos", "Help under a field", "Tick to keep yours."],
  "kennelos.no_keep_them_apart": ["kennelos", "Button", "No, keep them apart"],
  "kennelos.already_on_your_site": ["kennelos", "Heading", "Already on your site?"],
  "kennelos.these_came_from_kennelos": ["kennelos", "Help line", "These came from KennelOS with the same name as one already on your website. Nothing is matched until you say so."],
  "pages.remove": ["pages", "Button", "Remove"],
  "pages.videos_and_posts": ["pages", "Heading", "Videos and posts"],
  "pages.link": ["pages", "Field label", "Link"],
  "pages.title": ["pages", "Field label", "Title"],
  "pages.optional_shown_under_it": ["pages", "Help under a field", "Optional, shown under it, like \"Opal at 6 weeks\"."],
  "pages.add": ["pages", "Button", "Add"],
  "share.demo_site": ["share", "Bold words", "Demo site."],
  "share.open_it_in_your": ["share", "Link", "Open it in your admin view"],
  "share.copy_link": ["share", "Part of a line", "Copy link"],
  "share.download_qr_code": ["share", "Link", "Download QR code"],
  "share.litters_and_albums_show": ["share", "Help line", "Litters and albums show here once they're published. The QR code is a picture you can print at any size."],
  "lists.removing_takes_it_off": ["lists", "Help line", "Removing takes it off your draft; it stays on the live site until you publish."],
  "lists.the_application_form_on": ["lists", "Help line", "The application form on your waitlist page always asks for the family's name and email. These questions come after, in this order. With none, it asks for a few lines about their family."],
  "photos.who_s_in_these": ["photos", "Heading", "Who's in these photos"],
  "photos.tick_the_photos_with": ["photos", "Help line", "Tick the photos with the same puppy or dog in them, choose who, then Tag. A puppy's photos show on its own page when its litter's \"Show each puppy's tagged photos\" is on, and are offered first when you choose its photo."],
  "lists.edit_the_list": ["lists", "Link", "Edit the list"],
  "photos.photos_of_this_litter": ["photos", "Heading", "Photos of this litter"],
  "photos.photos_added_here_are": ["photos", "Help line", "The photos on this litter's profile. To add or take some off, choose them on the Photos screen, then Show on a profile."],
  "photos.see_them_on_the": ["photos", "Link", "Open Photos"],
  "puppylist.set": ["puppylist", "Button", "Set"],
  "puppylist.add_a_puppy": ["puppylist", "Link", "Add a puppy"],
  "puppylist.no_current_litters": ["puppylist", "Help line, up to a link or bold words", "No current litters."],
  "puppylist.add_a_litter": ["puppylist", "Link", "Add a litter"],
  "site.save": ["site", "Button", "Save"],
  "waitlistpage.waitlist_policies": ["waitlistpage", "Heading", "Waitlist policies"],
  "waitlistpage.from_kennelos": ["waitlistpage", "Line", "from KennelOS"],
  "waitlistpage.shown_on_your_policies": ["waitlistpage", "Help line", "Shown on your Policies page under their own heading, below the ones here. Change them in KennelOS (your kennel's Waitlist settings, Policies); your website shows the change within a few minutes, no publish needed."],
  "waitlistpage.add_your_own_policies": ["waitlistpage", "Help line", "Add your own policies below: your health guarantee, spay and neuter, take-back, anything beyond the waitlist."],
  "waitlistpage.your_kennelos_waitlist": ["waitlistpage", "Heading", "Your KennelOS waitlist"],
  "waitlistpage.keep_your_waitlist_in": ["waitlistpage", "Help line", "Keep your waitlist in KennelOS? Paste the website feed address from its Online list card. Your waitlist page then shows your KennelOS list, and while you take applications online there, your KennelOS application form, in your website's style, with applications going straight to KennelOS. The simple waitlist and the questions set up here are then not used (the questions are, if you don't take applications online in KennelOS). Without KennelOS, leave this empty and use the questions and Your waitlist below."],
  "waitlistpage.website_feed_address": ["waitlistpage", "Field label", "Website feed address"],
  "waitlistpage.save": ["waitlistpage", "Button", "Save"],
  "pages.home": ["pages", "Bold words", "Home"],
  "pages.block_by_block": ["pages", "Line", "/ · block by block"],
  "pages.save_2": ["pages", "Button", "Save"],
  "waitlistpage.your_waitlist": ["waitlistpage", "Link", "Your waitlist"],
  "pages.show_it": ["pages", "Field label", "Show it"],
  "pages.save": ["pages", "Button", "Save"],
  "homeblocks.your_home_page_s": ["homeblocks", "Help line", "Your Home page's blocks, top to bottom, as KennelPort set them up with you. Switch each on or off and change its words."],
  "homeblocks.save": ["homeblocks", "Button", "Save"],
  "payment.save": ["payment", "Button", "Save"],
  "payment.shown_on_your_waitlist": ["payment", "Help line", "Shown on your waitlist page, so families don't have to email to ask. A How it works step can link here too: open the step and tick its How to pay box."],
  "photos.description": ["photos", "Field label", "Description"],
  "photos.save": ["photos", "Button", "Save"],
  "pm.how": ["photos", "Photos screen: help line", "Tap a row to open it. Tap photos to choose them; what you can do with them shows at the bottom."],
  "pm.on_a_profile": ["photos", "Photos screen bar: button", "Show on a profile…"],
  "pm.to_album": ["photos", "Photos screen bar: button", "Add to album…"],
  "pm.profile": ["photos", "Photos screen bar: field label", "Profile"],
  "pm.choose_profile": ["photos", "Photos screen bar: first choice in the list of profiles", "Choose a profile…"],
  "pm.show_on_it": ["photos", "Photos screen bar: button, put the chosen photos on the profile", "Show on it"],
  "pm.take_off_it": ["photos", "Photos screen bar: button, take the chosen photos off the profile", "Take off it"],
  "pm.album": ["photos", "Photos screen bar: field label", "Album"],
  "pm.add_to_it": ["photos", "Photos screen bar: button, add the chosen photos to the album", "Add to it"],
  "pm.no_albums": ["photos", "Photos screen bar: no albums yet", "No albums yet."],
  "pm.new_album": ["photos", "Photos screen bar: link to make an album", "Make one"],
  "pm.in_use": ["photos", "Removing photos that are in use: heading", "Used on your site"],
  "pm.in_use_then": ["photos", "Removing photos that are in use: what happens", "Removed, they come off those places. A spot with no photo shows nothing until you choose another."],
  "pm.remove_anyway": ["photos", "Removing photos that are in use: button", "Remove anyway"],
  "pm.keep": ["photos", "Removing photos that are in use: link back", "Keep them"],
  "slot.choose": ["photos", "Button: a photo spot with no photo yet", "Choose a photo"],
  "slot.replace": ["photos", "Button: change a spot's photo", "Replace"],
  "slot.choose_many": ["photos", "Button: change the photos of a spot that takes several", "Add or change photos"],
  "slot.remove": ["photos", "Button: take the photo out of a spot", "Remove"],
  "slot.none": ["photos", "A photo spot with no photo", "No photo yet"],
  "slot.count": ["photos", "How many photos a spot has", "{n} photos"],
  "library.title": ["photos", "Heading of the photo library window", "Your photos"],
  "library.upload": ["photos", "Button: upload in the photo library window", "Upload new photos"],
  "library.page_photos": ["photos", "Photo library: the tab of photos on her pages", "Page photos"],
  "library.profile_photos": ["photos", "Photo library: the tab of photos on dog, litter and puppy profiles", "Profile photos"],
  "library.pick_one": ["photos", "Photo library: help line, choosing one", "Tap a photo, then Replace."],
  "library.pick_many": ["photos", "Photo library: help line, choosing several", "Tap the photos you want, then Use these photos."],
  "library.replace": ["photos", "Photo library: button, choosing one", "Replace"],
  "library.use_many": ["photos", "Photo library: button, choosing several", "Use these photos"],
  "library.cancel": ["photos", "Photo library: button", "Cancel"],
  "library.failed": ["photos", "Photo library: it couldn't be opened", "Your photos couldn't be loaded. Check your connection and try again."],
  "library.chosen": ["photos", "Photo library: how many are chosen", "{n} chosen"],
  "library.too_many": ["photos", "Photo library: more chosen than the spot takes", "This spot takes {n} at most."],
  "library.empty": ["photos", "Photo library: a tab with no photos", "No photos here yet. Upload some above."],
  "library.just_added": ["photos", "Photo library: row of photos just uploaded", "Just added"],
  "library.not_used": ["photos", "Photo library: row of photos not on the site", "Not used anywhere"],
  "library.home": ["photos", "Photo library: the Home page's name", "Home"],
  "library.home_banner": ["photos", "Photo library: row name", "Home: banner"],
  "library.home_collage": ["photos", "Photo library: row name", "Home: collage"],
  "library.home_story": ["photos", "Photo library: row name", "Home: Photo and words"],
  "library.on_page": ["photos", "Photo library: row name, a block on a page", "{page}: {block}"],
  "library.block.photo": ["photos", "Photo library: a Photo block's name", "Photo"],
  "library.block.overlay": ["photos", "Photo library: a Text over a photo block's name", "Text over a photo"],
  "library.block.beside": ["photos", "Photo library: a Photo beside words block's name", "Photo beside words"],
  "library.block.collage": ["photos", "Photo library: a Collage block's name", "Collage"],
  "library.block.gallery": ["photos", "Photo library: a Gallery strip block's name", "Gallery strip"],
  "library.logo": ["photos", "Photo library: row name", "Logo"],
  "library.products": ["photos", "Photo library: row name", "Recommended products"],
  "library.extras": ["photos", "Photo library: row name", "Extras"],
  "library.partners": ["photos", "Photo library: row name", "Partner kennels"],
  "library.reviews": ["photos", "Photo library: row name", "Reviews"],
  "library.embeds": ["photos", "Photo library: row name", "Videos and posts"],
  "library.album": ["photos", "Photo library: row name, an album", "Album: {name}"],
  "library.dog": ["photos", "Photo library: row name, a dog's profile", "{name}'s profile"],
  "library.litter": ["photos", "Photo library: row name, a litter's page", "{name} litter"],
  "library.puppy": ["photos", "Photo library: row name, a puppy's profile", "{name}'s profile ({litter})"],
  "photos.remove": ["photos", "Button", "Remove"],
  "photos.albums": ["photos", "Link", "Albums"],
  "photos.galleries_with_their_own": ["photos", "Line", "Galleries with their own link, made from these photos."],
  "photos.what_s_in_the": ["photos", "Field label", "What's in the photo"],
  "photos.helps_visitors_who_use": ["photos", "Help under a field", "Helps visitors who use screen readers, and search engines. For example \"Willow on autumn leaves\"."],
  "photos.photos_are_made_smaller": ["photos", "Help line", "Photos are made smaller on your phone before they're sent, and the camera's location is removed."],
  "publish.demo_site": ["publish", "Bold words", "Demo site."],
  "publish.open_it_in_your": ["publish", "Link", "Open it in your admin view"],
  "publish.back": ["publish", "Link", "Back"],
  "publish.preview": ["publish", "Link", "Preview"],
  "publish.preview_the_whole_site": ["publish", "Link", "Preview the whole site"],
  "publish.undo_goes_back_to": ["publish", "Help line", "Undo goes back to the version before the one visitors see now."],
  "publish.undo_last_publish": ["publish", "Button", "Undo last publish"],
  "inbox.see_the_waitlist": ["inbox", "Link", "See the waitlist"],
  "inbox.add_to_waitlist": ["inbox", "Link", "Add to waitlist"],
  "inbox.email": ["inbox", "Label", "Email"],
  "inbox.phone": ["inbox", "Label", "Phone"],
  "inbox.reply": ["inbox", "Link", "Reply"],
  "inbox.copy_email": ["inbox", "Part of a line", "Copy email"],
  "inbox.mark_as_unread": ["inbox", "Button", "Mark as unread"],
  "inbox.delete_this_message": ["inbox", "Button", "Delete this message"],
  "inbox.messages_are_kept_for": ["inbox", "Help line", "Messages are kept for 90 days, then deleted. Reply opens your own email."],
  "waitlistlist.keep_their_name_private": ["waitlistlist", "Line", "Keep their name private"],
  "waitlistlist.the_list_shows_it": ["waitlistlist", "Help under a field", "The list shows it masked, like \"A***** K\" for Andrea Kim, in place of the name on the list."],
  "waitlistlist.added": ["waitlistlist", "Field label", "Added"],
  "waitlistlist.their_place_comes_from": ["waitlistlist", "Help under a field", "Their place comes from the order of the list, not this date."],
  "waitlistlist.they_go_to_the": ["waitlistlist", "Help line", "They go to the end of the list. Check what the list will show before adding."],
  "waitlistlist.delete_takes_them_off": ["waitlistlist", "Help line", "Delete takes them off without marking them fulfilled, and can't be undone."],
  "waitlistlist.delete_from_the_waitlist": ["waitlistlist", "Button", "Delete from the waitlist"],
  "waitlistlist.offer_pups": ["waitlistlist", "Link", "Offer pups"],
  "waitlistlist.fulfilled": ["waitlistlist", "Button", "Fulfilled"],
  "waitlistlist.edit": ["waitlistlist", "Link", "Edit"],
  "waitlistlist.not_used_your_website": ["waitlistlist", "Warning", "Not used: your website shows your KennelOS waitlist, so this list isn't shown on it, and families are added in KennelOS. Remove the KennelOS link under"],
  "waitlistlist.waitlist_and_application_3": ["waitlistlist", "Link", "Waitlist and application"],
  "waitlistlist.to_use_this_one": ["waitlistlist", "Part of a line", "to use this one instead."],
  "waitlistlist.families_in_order_your": ["waitlistlist", "Help line", "Families in order. Your website shows each one's place, the name on the list and what they want, straight away, with no publish. Offer pups opens your own email to them; Fulfilled takes them off and moves everyone below up."],
  "waitlistlist.add_a_family": ["waitlistlist", "Link", "Add a family"],
  "waitlistlist.keep_your_waitlist_in": ["waitlistlist", "Help line, up to a link or bold words", "Keep your waitlist in KennelOS Pro instead, with turns, deadlines and status pages for families? Link it under"],
  "waitlistlist.waitlist_and_application_2": ["waitlistlist", "Link", "Waitlist and application"],
  "waitlistlist.the_offer_pups_email": ["waitlistlist", "Help line, up to a link or bold words", "The Offer pups email's wording is under"],
  "waitlistlist.waitlist_and_application": ["waitlistlist", "Link", "Waitlist and application"],
  "waitlistlist.kept_90_days_then": ["waitlistlist", "Help line", "Kept 90 days, then deleted."],
  "waitlistlist.put_back": ["waitlistlist", "Button", "Put back"],
  "waitlistlist.delete": ["waitlistlist", "Button", "Delete"],
  "queue.they_agreed_to_it": ["queue", "Help line", "They agreed to it being shown with their first name and town."],
  "queue.approve": ["queue", "Button", "Approve"],
  "queue.decline_and_delete": ["queue", "Button", "Decline and delete"],
  "queue.an_approved_review_shows": ["queue", "Help line", "An approved review shows on your site after you publish. You can hide it later under Reviews."],
  "account.storage": ["account", "Heading", "Storage"],
  "account.download_a_copy_2": ["account", "Heading", "Download a copy"],
  "account.a_zip_of_your": ["account", "Help line", "A zip of your site's words, photos and messages. It's made on this device, so on a phone with many photos a computer may be quicker."],
  "account.download_a_copy": ["account", "Part of a line", "Download a copy"],
  "account.delete_my_site_2": ["account", "Heading", "Delete my site"],
  "account.this_deletes_every_dog": ["account", "Help line, up to a link or bold words", "This deletes every dog, litter, puppy, page, photo, review and message"],
  "account.straight_away": ["account", "Bold words", "straight away"],
  "account.there_s_no_undo": ["account", "Part of a line", ". There's no undo, and KennelPort keeps no copy, so download one first."],
  "account.your_address_then_shows": ["account", "Help line", "Your address then shows \"This breeder is no longer hosting with KennelPort\", and it isn't given to anyone else. Cloudflare keeps its own backup of deleted database rows for up to 30 days, which KennelPort can't turn off. Emails already sent stay where they arrived."],
  "account.type": ["account", "Field label", "Type"],
  "account.to_confirm": ["account", "Part of a line", "to confirm"],
  "account.delete_my_site": ["account", "Button", "Delete my site"],
  "account.for_safety_deleting_needs": ["account", "Help line, up to a link or bold words", "For safety, deleting needs a fresh sign-in."],
  "account.sign_out": ["account", "Button", "Sign out"],
  "account.sign_in_again_then": ["account", "Part of a line", ", sign in again, then come back here within 15 minutes."],
  // The lines a screen picks between (its states: linked or not, empty or not).
  "doglist.not_sent_by_kennelos": ["doglist", "Line", "Not sent by KennelOS"],
  "doglist.switched_off": ["doglist", "Line", "Switched off"],
  "kennelos.linked_to_kennelos": ["kennelos", "Line", "Linked to KennelOS"],
  "kennelos.link_kennelos": ["kennelos", "Line", "Link KennelOS"],
  "kennelos.when_you_press_update": ["kennelos", "Line", "When you press Update website in KennelOS, your dogs, litters, puppy statuses and health results arrive here in your draft. Nothing changes on your site until you Publish."],
  "kennelos.keep_your_dogs_and": ["kennelos", "Line", "Keep your dogs and litters in KennelOS Pro? Link it, and Update website in KennelOS sends them here, so you type them only once. In KennelOS, tick Show on website on the dogs, litters and pairings you want on your site."],
  "kennelos.this_demo_is_linked": ["kennelos", "Help line, up to a link or bold words", "This demo is linked to the linked sample, not to a KennelOS device. Its steps are sent from /ops."],
  "kennelos.link_another_device": ["kennelos", "Line", "Link another device"],
  "kennelos.show_a_link_code": ["kennelos", "Line", "Show a link code"],
  "kennelos.a_kennelos_device": ["kennelos", "Line", "A KennelOS device"],
  "kennelos.nothing_you_typed_changes": ["kennelos", "Help line, up to a link or bold words", "Nothing you typed changes."],
  "share.share_2": ["share", "Line", "Share"],
  "share.share": ["share", "Line", "Share"],
  "lists.partner_kennel_logos": ["lists", "Line", "Partner kennel logos"],
  "lists.photos_of_its_litter": ["lists", "Line", "Photos of its litter"],
  "lists.your_photos": ["lists", "Line", "Your photos"],
  "lists.not_used_right_now": ["lists", "Warning", "Not used right now: KennelOS takes your applications online, so your website shows your KennelOS form. These questions come back if you turn online applications off in KennelOS or remove the link."],
  "photos.puppies_of_its_litter": ["photos", "Line", "Puppies of its litter"],
  "photos.photo_3": ["photos", "Line", "Photo"],
  "photos.no_one_yet": ["photos", "Line", "No one yet"],
  "lists.none_yet": ["lists", "Line", "None yet."],
  "photos.photo_2": ["photos", "Line", "Photo"],
  "puppylist.not_sent_by_kennelos": ["puppylist", "Line", "Not sent by KennelOS"],
  "puppylist.hidden_2": ["puppylist", "Line", "Hidden"],
  "puppylist.hidden": ["puppylist", "Line", "Hidden"],
  "puppylist.no_puppies_yet": ["puppylist", "Help line, up to a link or bold words", "No puppies yet."],
  "puppylist.puppies": ["puppylist", "Line", "Puppies"],
  "site.your_logo": ["site", "Line", "Your logo"],
  "site.kennel_details": ["site", "Line", "Kennel details"],
  "waitlistpage.waitlist_policies_2": ["waitlistpage", "Heading", "Waitlist policies"],
  "waitlistpage.none_in_kennelos_yet": ["waitlistpage", "Help line, up to a link or bold words", "None in KennelOS yet. Add them in KennelOS, in your kennel's Waitlist settings under Policies, and they show on your Policies page under their own heading, below the ones here."],
  "waitlistpage.you_take_applications_online": ["waitlistpage", "Line", "You take applications online in KennelOS, so your waitlist page shows your KennelOS application form, and applications go to KennelOS, not to this Inbox."],
  "waitlistpage.you_aren_t_taking": ["waitlistpage", "Line", "You aren't taking applications online in KennelOS, so your waitlist page shows the application form set up here, and applications come to this Inbox."],
  "waitlistpage.kennelos_isn_t_sharing": ["waitlistpage", "Warning", "KennelOS isn't sharing your list with your website. In KennelOS, open the Online list card and turn on \"Let my KennelPort website show my list in its own style\". Until then, your waitlist page links to your KennelOS pages."],
  "waitlistpage.kennelos_has_no_waitlist": ["waitlistpage", "Warning", "KennelOS has no waitlist online at this address. Check the address, or put your list online in KennelOS first."],
  "waitlistpage.kennelos_couldn_t_be": ["waitlistpage", "Warning", "KennelOS couldn't be reached just now. Your waitlist page links to your KennelOS pages until it can."],
  "waitlistpage.your_waitlist_page_shows": ["waitlistpage", "Help line, up to a link or bold words", "Your waitlist page shows your KennelOS list. Remove the link to use the simple waitlist kept here instead."],
  "waitlistpage.remove": ["waitlistpage", "Button", "Remove"],
  "pages.off_2": ["pages", "Part of a line", " · off"],
  "pages.off": ["pages", "Part of a line", " · off"],
  "pages.pages": ["pages", "Line", "Pages"],
  "pages.this_page_is_on": ["pages", "Line", "This page is on"],
  "pages.off_it_leaves_the": ["pages", "Line", "Off: it leaves the menu and its address says \"This page isn't available\". Its words are kept."],
  "pages.name_in_the_menu_2": ["pages", "Line", "Name in the menu"],
  "pages.name_in_the_menu": ["pages", "Line", "Name in the menu"],
  "waitlistpage.your_application_questions_aren": ["waitlistpage", "Help line, up to a link or bold words", "Your application questions aren't used while KennelOS takes your applications online: your website shows your KennelOS form."],
  "waitlistpage.your_simple_waitlist_isn": ["waitlistpage", "Help line, up to a link or bold words", "Your simple waitlist isn't used while KennelOS is linked: your website shows your KennelOS list."],
  "pages.your_dogs_from_kennelos": ["pages", "Line", "Your dogs from KennelOS"],
  "pages.your_litters_from_kennelos": ["pages", "Line", "Your litters from KennelOS"],
  "pages.your_pups_from_kennelos": ["pages", "Line", "Your pups from KennelOS"],
  "pages.your_reviews": ["pages", "Line", "Your reviews"],
  "pages.a_family": ["pages", "Line", "A family"],
  "pages.eyebrow": ["pages", "Line", "Eyebrow"],
  "pages.heading": ["pages", "Line", "Heading"],
  "pages.line_under_it": ["pages", "Line", "Line under it"],
  "pages.own.banner": ["pages", "A banner KennelPort added: what it is", "A banner across the page"],
  "pages.own.button": ["pages", "A button KennelPort added: what it is", "A button"],
  "pages.own.divider": ["pages", "A divider KennelPort added: what it is", "A divider between parts of the page"],
  "pages.own.photo": ["pages", "A photo KennelPort added: what it is", "A photo"],
  "pages.own.overlay": ["pages", "Words over a photo KennelPort added: what it is", "Words over a photo"],
  "pages.own.gallery": ["pages", "A gallery strip KennelPort added: what it is", "A row of photos that open full size"],
  "pages.own.gallery_photos": ["pages", "Line: a gallery strip's photos, above its photo spot", "Choose your own photos for it, or leave it empty for the ones it started with."],
  "pages.own.album_link": ["pages", "Field label: the words of a gallery strip's link to its album", "Link to the album"],
  "pages.own.beside": ["pages", "A photo beside words KennelPort added: what it is", "A photo beside words"],
  "pages.own.factrow": ["pages", "A facts row KennelPort added: what it is", "A row of facts, each a big value over a small label"],
  "pages.own.facts": ["pages", "Field label: a facts row's facts", "Facts"],
  "pages.own.facts_hint": ["pages", "Hint: a facts row's facts", "A value and its label on each line. All empty: the facts it started with."],
  "pages.own.fact_value": ["pages", "Field label for screen readers: a fact's value", "Fact {n}, value"],
  "pages.own.fact_label": ["pages", "Field label for screen readers: a fact's label", "Fact {n}, label"],
  "pages.own.words": ["pages", "A text block KennelPort added: what it is", "A heading with a line and words under it"],
  "pages.own.words_body": ["pages", "Field label: a text block's words", "Words"],
  "pages.own.words_body_hint": ["pages", "Hint: a text block's words", "Empty: the words it started with. A blank line starts a new paragraph."],
  "pages.own.columns": ["pages", "Text in columns KennelPort added: what it is", "A heading with short sections side by side, each a subheading over its words"],
  "pages.own.cols": ["pages", "Field label: text in columns' sections", "Sections"],
  "pages.own.cols_hint": ["pages", "Hint: text in columns' sections", "They fill the columns left to right. A blank line in the words starts a new paragraph. All empty: the sections it started with."],
  "pages.own.col_heading": ["pages", "Field label: a section's subheading", "Section {n}: subheading"],
  "pages.own.col_words": ["pages", "Field label: a section's words", "Section {n}: words"],
  "pages.own.a_line": ["pages", "Field label: a banner's line", "A line"],
  "pages.own.button_words": ["pages", "Field label: a button's words", "Button words"],
  "pages.own.address": ["pages", "Field label: a button's outside address", "Web address it opens"],
  "pages.own.phone": ["pages", "Field label: a button's phone number", "Phone number"],
  "pages.own.email": ["pages", "Field label: a button's email address", "Email address"],
  "pages.own.from_details": ["pages", "Hint: phone or email from Kennel details", "Empty: the one in Kennel details."],
  "pages.own.empty_none": ["pages", "Hint: a heading or line left empty", "Leave it empty and nothing shows."],
  "pages.own.empty_is": ["pages", "Hint: what an empty field shows", "Empty: \"{text}\"."],
  "pages.own.goes_to": ["pages", "Line: where a button goes (a page)", "The button goes to {page}."],
  "pages.own.hidden": ["pages", "Line: a button hidden because its page is off", "Its button is hidden right now: {page} is switched off or has nothing to show."],
  "pages.own.photo_label": ["pages", "Field label: the photo of a block", "Photo"],
  "pages.own.caption": ["pages", "Field label: a photo's caption", "Caption"],
  "pages.own.no_photo": ["pages", "Line: a photo block with no photo", "No photo yet, so it doesn't show."],
  "pages.own.collage": ["pages", "A collage KennelPort added: what it is", "A collage of photos"],
  "pages.own.collage_photos": ["pages", "Line: a collage's photos, above its boxes", "A photo for each box, in order. With fewer photos than boxes, your site uses a layout for that many. None chosen: the photos it started with."],
  "pages.own.no_photos": ["pages", "Line: a collage with no photos", "No photos yet, so it doesn't show."],
  "homeblocks.home_page": ["homeblocks", "Line", "Home page"],
  "homeblocks.photos_for_the_home": ["homeblocks", "Line", "Photos for the Home page"],
  "homeblocks.this_block_is_on": ["homeblocks", "Line", "This block is on"],
  "homeblocks.off_it_leaves_the": ["homeblocks", "Line", "Off: it leaves the home page; its words are kept."],
  "payment.application_fee": ["payment", "Line", "Application fee"],
  "payment.puppy_deposit": ["payment", "Line", "Puppy deposit"],
  "payment.safe_payment_notice": ["payment", "Line", "Safe-payment notice"],
  "payment.how_a_family_pays_2": ["payment", "Line", "How a family pays the fee once you approve them."],
  "payment.how_a_family_pays": ["payment", "Line", "How a family pays the deposit once they choose a puppy."],
  "payment.filled_from_your_waitlist": ["payment", "Notice", "Filled from your waitlist settings in KennelOS. Change the wording there, then Update website; whether it shows is up to you here."],
  "payment.how_to_pay": ["payment", "Line", "How to pay"],
  "photos.no_photo_was_sent": ["photos", "Line", "No photo was sent."],
  "photos.not_found": ["photos", "Line", "Not found"],
  "photos.photo": ["photos", "Line", "Photo"],
  "photos.photos": ["photos", "Line", "Photos"],
  "publish.publish_3": ["publish", "Line", "Publish"],
  "publish.publish_2": ["publish", "Line", "Publish"],
  "publish.publish": ["publish", "Line", "Publish"],
  "publish.changes_since_your_last": ["publish", "Line", "Changes since your last publish"],
  "publish.nothing_to_publish": ["publish", "Line", "Nothing to publish"],
  "publish.your_website_already_shows": ["publish", "Help line, up to a link or bold words", "Your website already shows everything in your draft."],
  "inbox.on_your_waitlist": ["inbox", "Line", "On your waitlist."],
  "inbox.on_your_waitlist_marked": ["inbox", "Line", "On your waitlist, marked fulfilled."],
  "inbox.no_questions_answered": ["inbox", "Help line, up to a link or bold words", "No questions answered."],
  "inbox.inbox": ["inbox", "Line", "Inbox"],
  "inbox.no_messages_yet_messages": ["inbox", "Help line, up to a link or bold words", "No messages yet. Messages from your site's contact form, and applications from your waitlist page, land here."],
  "waitlistlist.their_name": ["waitlistlist", "Line", "Their name"],
  "waitlistlist.name_on_the_list": ["waitlistlist", "Line", "Name on the list"],
  "waitlistlist.what_your_website_shows": ["waitlistlist", "Line", "What your website shows. Leave empty for their first name and last initial, like \"Megan R.\"."],
  "waitlistlist.email": ["waitlistlist", "Line", "Email"],
  "waitlistlist.for_offer_pups_never": ["waitlistlist", "Line", "For Offer pups. Never shown."],
  "waitlistlist.phone": ["waitlistlist", "Line", "Phone"],
  "waitlistlist.never_shown": ["waitlistlist", "Line", "Never shown."],
  "waitlistlist.what_they_want": ["waitlistlist", "Line", "What they want"],
  "waitlistlist.shown_on_the_list": ["waitlistlist", "Line", "Shown on the list, like \"Female · Black & white\"."],
  "waitlistlist.save": ["waitlistlist", "Line", "Save"],
  "waitlistlist.add_to_waitlist_3": ["waitlistlist", "Line", "Add to waitlist"],
  "waitlistlist.add_to_waitlist_2": ["waitlistlist", "Line", "Add to waitlist"],
  "waitlistlist.add_to_waitlist": ["waitlistlist", "Line", "Add to waitlist"],
  "waitlistlist.no_email_add_one": ["waitlistlist", "Line", "No email: add one to offer pups."],
  "waitlistlist.your_waitlist": ["waitlistlist", "Line", "Your waitlist"],
  "waitlistlist.no_one_on_the": ["waitlistlist", "Line", "No one on the list yet. Add families from an application in your Inbox, or here."],
  "queue.reviews_to_approve": ["queue", "Line", "Reviews to approve"],
  "queue.no_reviews_waiting_families": ["queue", "Help line, up to a link or bold words", "No reviews waiting. Families send them from the Reviews page on your site."],
  "account.your_site_2": ["account", "Line", "Your site"],
  "account.your_site": ["account", "Line", "Your site"],
  "account.only_the_owner_can": ["account", "Warning", "Only the owner can delete the site."],
  "account.sign_in_again_first": ["account", "Line", "Sign in again first."],
  "lists.health_results": ["lists", "Line", "Health results"],
  "lists.puppies": ["lists", "Line", "Puppies"],
  // Her home screen's own lines (index.js siteHome), with the family portal's Today.
  "home.review_and_publish_3": ["home", "Link", "Review and publish"],
  "home.done_2": ["home", "Button", "Done"],
  "home.today": ["home", "Line", "Today"],
  "home.website": ["home", "Line", "Website"],
  "home.changes_not_published_yet": ["home", "Part of a line", "Changes not published yet"],
  "home.review_and_publish_2": ["home", "Link", "Review and publish"],
  "home.needs_you": ["home", "Heading", "Needs you"],
  "home.review_and_publish": ["home", "Link", "Review and publish"],
  "home.done": ["home", "Button", "Done"],
  "home.today_2": ["home", "Line", "Today"],
  "home.all_caught_up": ["home", "Line", "All caught up"],
  "home.nothing_needs_you_right": ["home", "Part of a line", "Nothing needs you right now."],
  "home.pickups_this_week_vet": ["home", "Help line, up to a link or bold words", "Pickups this week, vet records, messages and anything else waiting will show here."],
  "home.website_2": ["home", "Line", "Website"],
  // Before a site is chosen (index.js): signing in, her sites, Notifications. Every
  // site's wording only; {kennel} isn't known here.
  "signin.kennelport_site_manager": ["signin", "Line", "KennelPort Site Manager"],
  "signin.sign_in_with_the": ["signin", "Help line", "Sign in with the email address your website was set up with. We'll send you a 6-digit code; there's no password."],
  "signin.email": ["signin", "Field label", "Email"],
  "signin.send_me_a_code": ["signin", "Button", "Send me a code"],
  "signin.by_signing_in_you": ["signin", "Help line, up to a link or bold words", "By signing in you agree to KennelPort's"],
  "signin.terms_of_use": ["signin", "Link", "terms of use"],
  "signin.check_your_email": ["signin", "Line", "Check your email"],
  "signin.if": ["signin", "Help line, up to a link or bold words", "If"],
  "signin.code": ["signin", "Field label", "Code"],
  "signin.sign_in": ["signin", "Button", "Sign in"],
  "signin.send_a_new_code": ["signin", "Button", "Send a new code"],
  "signin.use_a_different_email": ["signin", "Link", "Use a different email"],
  "signin.no_website_here_yet": ["signin", "Line", "No website here yet"],
  "signin.this_email_isn_t": ["signin", "Help line", "This email isn't on any KennelPort site right now. If you think it should be, ask whoever set up your site."],
  "signin.sign_out_2": ["signin", "Button", "Sign out"],
  "signin.sign_out": ["signin", "Button", "Sign out"],
  "notifications.notifications": ["notifications", "Line", "Notifications"],
  "notifications.get_a_notification_on": ["notifications", "Help line", "Get a notification on this phone or computer when someone sends a message from your site, or a family sends a review to approve. It says who it's from, never what they wrote."],
  "notifications.checking_this_device": ["notifications", "Help line", "Checking this device…"],
  "notifications.turn_on_for_this": ["notifications", "Button", "Turn on for this device"],
  "notifications.send_a_test": ["notifications", "Button", "Send a test"],
  "notifications.turn_off": ["notifications", "Button", "Turn off"],
  "notifications.on_an_iphone_or": ["notifications", "Help line", "On an iPhone or iPad, notifications work only in the app on your home screen: in Safari, tap Share, then Add to Home Screen, open Site Manager from there and come back to this page."],
  "notifications.each_device_is_turned": ["notifications", "Help line", "Each device is turned on separately. Signing out turns this device off."],
  "signin.sign_in_2": ["signin", "Line", "Sign in"],
  "signin.your_code": ["signin", "Line", "Your code"],
  "signin.no_sites": ["signin", "Line", "No sites"],
  "signin.your_sites": ["signin", "Line", "Your sites"],
  "notifications.notifications_2": ["notifications", "Line", "Notifications"]
};

// The errors that tell her what to fix (content/model.js and records.js checks,
// which the import shares, so they stay as they are): each kind, matched by its
// words, is a line here. {path} is the field as the check names it (today's
// wording shows it), {field} its label on her form; the rest come from the check.
const ERRORS = [
  ['required', /^required$/, '{path}: required', 'A field that must be filled in, left empty'],
  ['too_long', /^longer than (?<max>\d+) characters$/, '{path}: longer than {max} characters', 'Too many characters'],
  ['web_address', /^not a web address$/, '{path}: not a web address', 'A web address that isn\'t one'],
  ['https', /^must start with https:\/\/$/, '{path}: must start with https://', 'A web address not starting https://'],
  ['phone', /^not a phone number$/, '{path}: not a phone number', 'A phone number that isn\'t one'],
  ['email', /^not an email address$/, '{path}: not an email address', 'An email address that isn\'t one'],
  ['number', /^a whole number from (?<min>-?\d+) to (?<max>-?\d+)$/, '{path}: a whole number from {min} to {max}', 'A number out of range, or not a whole number'],
  ['date', /^a date is YYYY-MM-DD$/, '{path}: a date is YYYY-MM-DD', 'A date that isn\'t one'],
  ['month', /^a month is YYYY-MM$/, '{path}: a month is YYYY-MM', 'A month that isn\'t one'],
  ['at_most', /^at most (?<max>\d+) items$/, '{path}: at most {max} items', 'Too many items in a list'],
  ['slug', /^a slug is lower-case letters, digits and hyphens$/, '{path}: a slug is lower-case letters, digits and hyphens', 'A web address part with other characters'],
  ['slug_used', /^"(?<slug>[^"]*)" is already used$/, '{path}: "{slug}" is already used', 'A web address part another one has'],
  ['slug_free', /^could not find a free web address$/, '{path}: could not find a free web address', 'No free web address to make from the name'],
  ['choice_options', /^a choice needs at least two options, one per line$/, '{path}: a choice needs at least two options, one per line', 'A choice question with fewer than two options'],
  ['photo_gone', /^that photo is no longer on this site$/, '{path}: that photo is no longer on this site', 'A chosen photo removed meanwhile'],
  ['photos_gone', /^a chosen photo is no longer on this site$/, '{path}: a chosen photo is no longer on this site', 'One of the chosen photos removed meanwhile'],
  ['litter_gone', /^that litter is no longer on this site$/, '{path}: that litter is no longer on this site', 'A chosen litter removed meanwhile'],
  ['dog_gone', /^that dog is no longer on this site$/, '{path}: that dog is no longer on this site', 'A chosen dog removed meanwhile'],
  ['kennel_gone', /^that kennel is no longer on your list$/, '{path}: that kennel is no longer on your list', 'A chosen partner kennel removed meanwhile'],
  ['gone', /^no longer exists$/, '{path}: no longer exists', 'What she was changing was removed meanwhile'],
  ['price_to', /^lower than the starting price$/, '{path}: lower than the starting price', 'A highest price below the lowest'],
  ['image_url', /^that picture's address isn't one your site can show from; choose a photo instead$/, '{path}: that picture\'s address isn\'t one your site can show from; choose a photo instead', 'A brand picture from an address the site can\'t show'],
  ['badge_picture', /^a home page badge needs a picture: choose one, or paste the embed code$/, '{path}: a home page badge needs a picture: choose one, or paste the embed code', 'A Home badge with no picture'],
  ['badges_max', /^the home page shows at most (?<max>\d+) badges: turn one off first$/, '{path}: the home page shows at most {max} badges: turn one off first', 'Too many Home badges'],
  ['place_picture', /^a badge needs a picture: choose one, or paste the embed code$/, '{path}: a badge needs a picture: choose one, or paste the embed code', 'A badge on other pages with no picture'],
  ['place', /^not a page of this site$/, '{path}: not a page of this site', 'A place for a question or badge that isn\'t a page of her site'],
  ['place_max', /^the (?<place>.+) shows at most (?<max>\d+) badges: take one off it first$/, '{path}: the {place} shows at most {max} badges: take one off it first', 'Too many badges on a page'],
  ['kennel_listed', /^that kennel is already on your list$/, '{path}: that kennel is already on your list', 'A partner kennel added twice'],
  ['partners_max', /^at most (?<max>\d+) partner kennels$/, '{path}: at most {max} partner kennels', 'Too many partner kennels'],
  ['albums_max', /^this site has reached its limit of (?<max>\d+) albums$/, '{path}: this site has reached its limit of {max} albums', 'Too many albums'],
  ['pay_methods', /^add at least one way to pay, or a payment page link, before showing it$/, '{path}: add at least one way to pay, or a payment page link, before showing it', 'How to pay shown with no way to pay'],
];
export const ERROR_KEYS = ERRORS.map(([k]) => k);

// A check's error as her screens say it: the owner's line for its kind, or the
// error as it is (an error of another kind, or wording not in the list).
export function sayError(message, say, labelOf = (name) => name) {
  const m = String(message ?? '').match(/^([A-Za-z0-9_.[\] -]+): ([\s\S]+)$/);
  if (!m) return String(message ?? '');
  const [, path, rest] = m;
  for (const [k, re] of ERRORS) {
    const g = rest.match(re);
    if (g) return say(`error.${k}`, { path, field: labelOf(path.split('.').pop().replace(/\[\d+\]$/, '')), ...(g.groups ?? {}) });
  }
  return String(message);
}

// The errors from her other screens, each a whole message matched by its words (the
// code that finds the problem keeps today's words, as its tests and the import use
// them; the screen says it in the owner's). By group, as each screen asks for its own:
// [key, screen, words, default, where]. A named part of the words is a name the line
// can use. Left out: messages about KennelPort itself failing (not set up, an email
// that couldn't be sent), the demo site's, the owner's own screens, and what
// KennelOS's app shows when it links (kennelos/link.js ApiError: its words, not hers).
const MESSAGES = {
  waitlist: [
    ['required', 'errors', /^Please fill in (?<what>.+)\.$/, 'Please fill in {what}.', 'Your waitlist: a family\'s detail that must be filled in, left empty'],
    ['too_long', 'errors', /^(?<What>.+) is too long \(at most (?<max>\d+) characters\)\.$/, '{What} is too long (at most {max} characters).', 'Your waitlist: a family\'s detail with too many characters ({What} is {what} with a capital)'],
    ['email', 'errors', /^That email address doesn't look right\.$/, 'That email address doesn\'t look right.', 'Your waitlist: an email address that isn\'t one'],
    ['date', 'errors', /^Give the date added as a date\.$/, 'Give the date added as a date.', 'Your waitlist: a date added that isn\'t a date'],
  ],
  photos: [
    ['camera_data', 'errors', /^This photo still carries its camera data \(EXIF\/XMP\), which can include where it was taken\. Re-save it first\.$/, 'This photo still carries its camera data (EXIF/XMP), which can include where it was taken. Re-save it first.', 'Photos: a photo with its camera data still in it'],
    ['damaged', 'errors', /^This JPEG is damaged\.$/, 'This JPEG is damaged.', 'Photos: a damaged JPEG'],
    ['empty', 'errors', /^The file is empty\.$/, 'The file is empty.', 'Photos: an empty file'],
    ['too_large', 'errors', /^The photo is too large \((?<kb>\d+) KB; at most (?<max>\d+) KB\)\.$/, 'The photo is too large ({kb} KB; at most {max} KB).', 'Photos: a photo file too large ({kb} is its size)'],
    ['kind', 'errors', /^Only WebP or JPEG photos can be uploaded\.$/, 'Only WebP or JPEG photos can be uploaded.', 'Photos: a file that isn\'t a WebP or JPEG photo'],
    ['unreadable', 'errors', /^The photo's size couldn't be read\.$/, 'The photo\'s size couldn\'t be read.', 'Photos: a photo whose size can\'t be read'],
    ['too_big', 'errors', /^The photo is (?<width>\d+)×(?<height>\d+); at most (?<max>\d+) pixels a side\.$/, 'The photo is {width}×{height}; at most {max} pixels a side.', 'Photos: a photo with too many pixels'],
    ['limit', 'errors', /^This site has reached its limit of (?<max>\d+) photos\.$/, 'This site has reached its limit of {max} photos.', 'Photos: the site\'s number of photos used up'],
    ['storage', 'errors', /^This site has reached its storage limit\.$/, 'This site has reached its storage limit.', 'Photos: the site\'s storage used up'],
  ],
  videos: [
    ['link', 'errors', /^Paste the link to the video or post, starting with https:\/\/$/, 'Paste the link to the video or post, starting with https://', 'Videos and posts: a link that isn\'t a web address'],
    ['too_long', 'errors', /^That link is too long\.$/, 'That link is too long.', 'Videos and posts: a link too long'],
    ['unknown', 'errors', /^That link isn't one KennelPort can show\. Links from (?<known>.+) work: open the video or post and copy its address\.$/, 'That link isn\'t one KennelPort can show. Links from {known} work: open the video or post and copy its address.', 'Videos and posts: a link from a site KennelPort can\'t show ({known} lists the ones it can)'],
    ['page_gone', 'errors', /^That page is no longer on this site\.$/, 'That page is no longer on this site.', 'Videos and posts: the page they were for removed meanwhile'],
    ['max', 'errors', /^At most (?<max>\d+) videos and posts in one place\.$/, 'At most {max} videos and posts in one place.', 'Videos and posts: too many in one place'],
    ['twice', 'errors', /^That one's already here\.$/, 'That one\'s already here.', 'Videos and posts: one added twice'],
  ],
  badge: [
    ['too_long', 'errors', /^That embed code is too long\. Paste just the code they gave you\.$/, 'That embed code is too long. Paste just the code they gave you.', 'A badge\'s embed code: too long'],
    ['nothing', 'errors', /^No link or picture found in that code\. Paste the whole code, from <a to <\/a>\.$/, 'No link or picture found in that code. Paste the whole code, from <a to </a>.', 'A badge\'s embed code: no link or picture in it'],
    ['fetch', 'errors', /^The picture in that code couldn't be fetched\. Download the logo from their page, choose it as the picture above, and save\.$/, 'The picture in that code couldn\'t be fetched. Download the logo from their page, choose it as the picture above, and save.', 'A badge\'s embed code: its picture couldn\'t be fetched'],
    ['too_large', 'errors', /^The picture in that code is too large\. Download the logo from their page, choose it as the picture above, and save\.$/, 'The picture in that code is too large. Download the logo from their page, choose it as the picture above, and save.', 'A badge\'s embed code: its picture too large'],
    ['copy', 'errors', /^Your link is filled in, but the picture in that code can't be copied \((?<reason>.+)\)\. Download the logo from their page, choose it as the picture above, and save\.$/, 'Your link is filled in, but the picture in that code can\'t be copied ({reason}). Download the logo from their page, choose it as the picture above, and save.', 'A badge\'s embed code: its picture can\'t be used as a photo ({reason} is the Photos error, without its stop)'],
  ],
  feed: [
    ['paste', 'errors', /^Paste the website feed address from KennelOS's Online list card\.$/, 'Paste the website feed address from KennelOS\'s Online list card.', 'Waitlist page, KennelOS feed: an address that isn\'t one'],
    ['not_kennelos', 'errors', /^That isn't a KennelOS address\. It starts (?<start>.+)\.$/, 'That isn\'t a KennelOS address. It starts {start}.', 'Waitlist page, KennelOS feed: an address that isn\'t KennelOS\'s ({start} is how a KennelOS address starts)'],
    ['no_kennel', 'errors', /^That KennelOS address doesn't name a kennel\. Copy the website feed address from the Online list card\.$/, 'That KennelOS address doesn\'t name a kennel. Copy the website feed address from the Online list card.', 'Waitlist page, KennelOS feed: an address with no kennel in it'],
  ],
  kennelos: [
    ['codes', 'errors', /^Too many codes asked for\. Try again in an hour\.$/, 'Too many codes asked for. Try again in an hour.', 'KennelOS: too many link codes asked for'],
    ['answered', 'errors', /^That match has already been answered\.$/, 'That match has already been answered.', 'KennelOS: a match answered already (on another device, say)'],
    ['record_gone', 'errors', /^That website record is no longer there\.$/, 'That website record is no longer there.', 'KennelOS: a match whose website record was removed meanwhile'],
  ],
  account: [
    ['confirm', 'errors', /^Type (?<subdomain>[a-z0-9-]+) to confirm\.$/, 'Type {subdomain} to confirm.', 'Your site, Delete: the site\'s name not typed to confirm'],
  ],
  publish: [
    ['too_large', 'errors', /^the site is too large to publish \((?<bytes>\d+) bytes\)$/, 'the site is too large to publish ({bytes} bytes)', 'Publish: the site too large to publish'],
    ['no_earlier', 'errors', /^there is no earlier version to go back to$/, 'there is no earlier version to go back to', 'Publish: Undo with no earlier version'],
  ],
  signin: [
    ['codes', 'signin', /^Too many codes asked for\. Try again in an hour\.$/, 'Too many codes asked for. Try again in an hour.', 'Error: too many codes asked for'],
    ['email', 'signin', /^That isn't an email address\.$/, 'That isn\'t an email address.', 'Error: an email address that isn\'t one'],
    ['wrong', 'signin', /^That code isn't right\. Check the latest email, or ask for a new code\.$/, 'That code isn\'t right. Check the latest email, or ask for a new code.', 'Error: a code that isn\'t right'],
    ['expired', 'signin', /^That code has expired\. Ask for a new one\.$/, 'That code has expired. Ask for a new one.', 'Error: a code that has expired'],
    ['tries', 'signin', /^Too many tries\. Ask for a new code\.$/, 'Too many tries. Ask for a new code.', 'Error: too many wrong codes'],
    ['used', 'signin', /^That code has already been used\.$/, 'That code has already been used.', 'Error: a code used already'],
  ],
};

// How the waitlist's errors name a family's detail ({what} in them).
const WAITLIST_WHAT = {
  name: 'their name', email: 'the email', list_name: 'the name on the list', phone: 'the phone number', wants: 'what they want', added_on: 'the date added',
};

// A message from one of her screens (its group above) as the owner words it, or as
// it is (a message of another kind).
export function sayMessage(group, message, say) {
  const text = String(message ?? '');
  for (const [k, , re] of MESSAGES[group] ?? []) {
    const g = text.match(re);
    if (!g) continue;
    const vars = { ...(g.groups ?? {}) };
    if (vars.what ?? vars.What) {
      const said = (phrase) => {
        const f = Object.entries(WAITLIST_WHAT).find(([, p]) => p === phrase.toLowerCase());
        return f ? say(`error.waitlist.what.${f[0]}`) : phrase;
      };
      const what = said(vars.what ?? vars.What);
      vars.what = what;
      vars.What = what.charAt(0).toUpperCase() + what.slice(1);
    }
    if (vars.reason) vars.reason = sayMessage('photos', `${vars.reason}.`, say).replace(/\.$/, '');
    return say(`error.${group}.${k}`, vars);
  }
  return text;
}

// ---------- the catalog ----------

const items = new Map();
// Before a site is chosen there's no kennel to name.
const NO_KENNEL = new Set(['signin', 'notifications']);
const add = (key, screen, where, text, vars = []) => items.set(key, { key, screen, where, text: text ?? '', vars: [...(NO_KENNEL.has(screen) ? [] : ['kennel']), ...vars] });

// Where each line of her home screen sits, from its key: a tile, a set-up row, a
// button, and the lines that go with them.
const SUFFIX = {
  note: 'the line under it', one: 'its count, for one', many: 'its count, for more than one', leaving: 'while litters are leaving her site',
  online: 'while KennelOS takes her applications', linked: 'while linked to KennelOS', offered: 'when she could link KennelOS', waiting: 'linked, before the first update',
};
const NEEDS = { messages: 'new messages', site_messages: 'new messages from her website (with the family portal)', reviews: 'reviews to approve', leaving: 'litters leaving her site' };
function homeWhere(k, t) {
  if (HOME_WHERE[k]) return HOME_WHERE[k];
  const parts = k.split('.');
  const last = parts.at(-1);
  if (parts[1] === 'needs' && parts.length > 2) return `Needs you: ${NEEDS[parts[2]]}, ${SUFFIX[last] ?? 'its line'}`;
  const parent = SUFFIX[last] ? parts.slice(0, -1).join('.') : k;
  const name = HOME[parent] ?? t;
  const what = parts[1] === 'tile' ? `The "${name}" tile` : parts[1] === 'setup' && parent !== 'home.setup' ? `Set up your site: "${name}"` : parent === 'home.setup' ? 'Set up your site: its heading' : `"${name}"`;
  return parent === k ? (parts[1] === 'tile' || parts[1] === 'setup' ? what : `The ${name.includes('{') ? 'line' : 'button or line'} ${what}`) : `${what}: ${SUFFIX[last]}`;
}
for (const [k, t] of Object.entries(HOME)) add(k, 'home', homeWhere(k, t), t, [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
for (const [k, [screen, what, t]] of Object.entries(SCREEN_LINES)) add(k, screen, what, t, [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => v !== 'kennel'));
for (const [k, , t, where] of ERRORS) add(`error.${k}`, 'errors', where, t, ['path', 'field', ...[...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => !['path', 'field'].includes(v))]);
for (const [group, list] of Object.entries(MESSAGES)) {
  for (const [k, screen, , t, where] of list) {
    const names = new Set([...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
    if (names.has('what') || names.has('What')) names.add('what').add('What');
    add(`error.${group}.${k}`, screen, where, t, [...names]);
  }
}
for (const [k, t] of Object.entries(WAITLIST_WHAT)) add(`error.waitlist.what.${k}`, 'errors', `Your waitlist: how its errors name "${t}" ({what})`, t);
for (const [k, t] of Object.entries(NOTES)) add(`note.${k}`, 'notes', 'At the top of the screen after the change', t);
for (const [k, [title, one]] of Object.entries(LIST_TITLES)) {
  add(`list.${k}.title`, 'lists', 'The list\'s heading', title);
  add(`list.${k}.one`, 'lists', 'One of them, as in "Add a dog" and "New dog"', one);
}
add('list.empty', 'lists', 'In a list with nothing in it yet', LISTS['list.empty']);
add('list.add', 'lists', 'The button under a list, and on a new one\'s form', LISTS['list.add'], ['one']);
add('list.new', 'lists', 'The heading of a new one\'s form', LISTS['list.new'], ['one']);
add('list.save', 'lists', 'The button on a form', LISTS['list.save']);
add('list.error', 'lists', 'When a form isn\'t saved, before what was wrong', LISTS['list.error'], ['error']);
for (const [k, t] of Object.entries(LISTS)) {
  if (!/^(lists|homeblocks|kennelos)\./.test(k)) continue;
  const where = Object.entries(LIST_WHERE).find(([p]) => k === p || k.startsWith(`${p}.`))?.[1] ?? 'A line';
  const how = k.endsWith('.one') ? ', for one' : k.endsWith('.many') ? ', for more than one' : '';
  add(k, SCREEN_OF_LIST[k.split('.')[0]], `${where}${how}: "${t}"`, t, [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
}
for (const [n, [label, hint]] of Object.entries(SHARED)) {
  add(`f.${n}`, 'fields', `The "${label}" field, on every form that has it`, label);
  add(`f.${n}.hint`, 'fields', `The help under "${label}"`, hint);
}
for (const [kind, list] of Object.entries(LABELS)) {
  const screen = KIND_SCREEN[kind] ?? 'fields';
  const on = KIND_WORDS[kind] ? ` (${KIND_WORDS[kind]})` : '';
  for (const [n, [label, hint]] of Object.entries(list)) {
    add(`f.${kind}.${n}`, screen, `The "${label}" field${on}`, label);
    add(`f.${kind}.${n}.hint`, screen, `The help under "${label}"${on}`, hint);
  }
}
for (const [group, words] of Object.entries(ENUM_WORDS)) {
  if (group === 'scheme') continue; // the schemes' own names
  for (const [v, t] of Object.entries(words)) add(`c.${group}.${v}`, 'choices', `In the "${group.replace(/_/g, ' ')}" choices`, t);
}

export const CATALOG = items;
export const itemsOn = (screen) => [...items.values()].filter((x) => x.screen === screen);

// ---------- saying it ----------

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));

// A sayer: the wording for a site, with its names. say(key, vars) → text; a key the
// list doesn't have says itself, so a mistake shows instead of vanishing.
export function sayer({ every = {}, site = {} } = {}, names = {}) {
  const say = (key, vars = {}) => {
    const own = site[key] ?? every[key];
    const text = own ?? items.get(key)?.text ?? key;
    return fill(text, { ...names, ...vars });
  };
  // One or many: the key's .one or .many.
  say.n = (key, n, vars = {}) => say(`${key}.${n === 1 ? 'one' : 'many'}`, { n, ...vars });
  return say;
}
export const defaultSay = sayer();

// ---------- storing it ----------

export const WORDING_MAX = 600;

// One item's wording as the owner typed it: '' means "what it follows" (null);
// names it can't use are refused, saying which it can.
export function cleanWording(key, text) {
  const item = items.get(key);
  if (!item) throw new WordingError(`${key} isn't in the list.`);
  const t = String(text ?? '').replace(/\r\n?/g, '\n').trim();
  if (!t) return null;
  if (t.length > WORDING_MAX) throw new WordingError(`"${item.where}" is ${WORDING_MAX} characters at most.`);
  const bad = [...t.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((v) => !item.vars.includes(v));
  if (bad.length) throw new WordingError(`"${item.where}" can't use {${bad[0]}}. ${item.vars.length ? `It can use ${item.vars.map((v) => `{${v}}`).join(', ')}.` : 'It has no names to fill in.'}`);
  return t;
}

// Every site's wording (the wording table).
export async function everyWording(env) {
  const { results } = await env.DB.prepare('SELECT key, text FROM wording').all();
  return Object.fromEntries(results.filter((r) => items.has(r.key)).map((r) => [r.key, r.text]));
}

export async function saveEveryWording(env, changes) {
  const now = new Date().toISOString();
  const s = [];
  for (const [key, text] of Object.entries(changes)) {
    const t = cleanWording(key, text);
    s.push(t == null || t === items.get(key).text ? env.DB.prepare('DELETE FROM wording WHERE key = ?').bind(key)
      : env.DB.prepare('INSERT INTO wording (key, text, updated_at) VALUES (?, ?, ?) ON CONFLICT (key) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at').bind(key, t, now));
  }
  if (s.length) await env.DB.batch(s);
}

// A site's own wording, in its build.
export const siteWording = (build) => Object.fromEntries(Object.entries(build?.wording ?? {}).filter(([k, v]) => items.has(k) && typeof v === 'string'));

// The build with a site's wording changed: '' (or the every-site wording) follows
// every site again.
export function withWording(build, changes, every = {}) {
  const next = structuredClone(build ?? {});
  const w = siteWording(next);
  for (const [key, text] of Object.entries(changes)) {
    const t = cleanWording(key, text);
    if (t == null || t === (every[key] ?? items.get(key).text)) delete w[key]; else w[key] = t;
  }
  if (Object.keys(w).length) next.wording = w; else delete next.wording;
  return next;
}
