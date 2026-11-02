// The AK sample's content (docs/reference/ak-sample.html) as a content document
// (content/io.js). /ops can load it into a site's draft as a starting point, and
// the tests render it. What's real and what's made up is in docs/reference/README.md:
// names marked * and every person, review, policy and price detail beyond the
// homegoing packages are made up. No photos: the sample's photos aren't in this
// repository, so the template shows its "Photos coming soon" placeholders.
const TESTS_F = [
  { test: 'BAER hearing', result: 'Normal, both ears', show: true },
  { test: 'Patellas (OFA)', result: 'Normal', show: true },
  { test: 'Eyes (CAER)', result: 'Normal', show: true },
  { test: 'JHC (HSF4 DNA)', result: 'Clear', show: true },
];

export const AK_SAMPLE = {
  site: {
    kennel_name: 'AK Boston Terriers',
    tagline: 'The American Gentleman',
    blurb: 'Home-raised, health-tested Boston Terriers, and a family to call on for the life of your dog.',
    breed: 'Boston Terrier',
    monogram: 'AK',
    town: 'Tulsa',
    region: 'Oklahoma',
    contact_email: 'hello@akbostons.example',
    facebook_label: 'AK Boston Terrier Friends',
    show_other_prices: true,
  },
  home: {
    hero: {
      eyebrow: 'Boston Terriers, raised at home',
      headline: 'Small dogs with big hearts',
      script: 'and tuxedos to match',
      intro: 'We raise a few litters of Boston Terriers each year in our home: health-tested parents, puppies handled from day one, and a lifetime of support once yours goes home.',
      primary_label: 'Join the waitlist',
      secondary_label: 'See our puppies',
    },
    facts: { items: [['5', 'Bostons at home'], ['3', 'Newborns this fall'], ['8 wks', 'Before going home']] },
    story: {
      eyebrow: 'About AK Boston Terriers',
      heading: 'Raised underfoot,',
      script: 'loved for life',
      text: 'Our Bostons live in the house with us, not in a kennel building. Puppies are born in our living room, grow up with the sounds of a busy home, and meet kids, visitors and the vacuum before they ever meet you.',
      features: [
        { icon: 'shield', title: 'Health tested', text: 'Hearing, eyes, knees and the cataract gene, checked on every parent.' },
        { icon: 'home', title: 'Home raised', text: 'Early handling, crate starts and potty-pad training before pickup.' },
        { icon: 'heart', title: 'Lifetime support', text: 'Questions at 2 a.m. or 12 years on, we answer, and we always take our dogs back.' },
      ],
      link_label: 'Read our full story',
    },
    dogs: { eyebrow: 'Our parent dogs', heading: 'Meet our Bostons', lede: 'Hover or tap a card to turn it over for health testing and a little about each dog.', link_label: 'See all our dogs' },
    litters: { eyebrow: 'Litters', heading: 'Current and upcoming', link_label: 'View all puppies' },
    reviews: { eyebrow: 'Families', heading: 'What our families say', link_label: 'All reviews' },
    waitlist: { heading: 'Hoping for a Boston of your own?', line: 'Puppies go to families on our waitlist, in order. See where the list stands today, or apply to join it.', button_label: 'Join the waitlist' },
  },
  pages: {
    about: {
      eyebrow: 'About us', heading: 'Our story', lede: 'How a single Boston on the couch turned into AK Boston Terriers.',
      text: "It started with Ziva. She was supposed to be our only dog, and within a year she'd convinced the whole family that a house isn't a home without a Boston in it.\n\nWe bred our first litter after two years of learning from mentors in the breed, joining our club, and health testing everything we could. Today we keep a small group of girls and one boy, plan one or two litters a year, and keep in touch with nearly every family who has taken one of our puppies home.\n\nWe breed for the Boston we love: a sturdy, square little dog with a kind eye, a clown's sense of humor and good manners in the house. Show quality matters to us, but temperament and health come first, every time.",
      facts: [['Breed', 'Boston Terrier only'], ['Litters a year', 'One or two'], ['Puppies go home', 'At 8 weeks']],
    },
    reviews: { eyebrow: 'Reviews', heading: 'From our families' },
    contact: { eyebrow: 'Contact', heading: 'Say hello', lede: "Visits are by appointment once you're on the waitlist. Messages are the quickest way to reach us.", location_note: 'Exact address shared once your pickup is booked.' },
    dogs: { eyebrow: 'Kennel residents', heading: 'Our Bostons', lede: 'The dogs behind every AK litter. Turn a card over for health testing.' },
    litters: { eyebrow: 'Puppies', heading: 'Puppies', lede: "Puppies are offered to our waitlist families in order. Status shown here comes straight from our records, so it's never out of date." },
    how_it_works: { eyebrow: 'How it works', heading: 'From application to home', lede: 'Five steps, the same for every family.' },
    extras: { eyebrow: 'Extras', heading: 'Extended homegoing', lede: "Most puppies go home at 8 weeks. If you'd like yours to stay with us a little longer, choose one of these packages when you pick your puppy.", note: 'Prices shown are the full puppy price for each package. The range depends on the puppy.' },
    policies: { eyebrow: 'Our promises', heading: 'Policies' },
    faq: { eyebrow: 'Questions', heading: 'FAQ' },
    waitlist: { eyebrow: 'Waitlist', heading: 'Our waitlist' },
    waitlist_help: { eyebrow: 'Waitlist', heading: 'Using your status page', lede: "Already on our waitlist? Your private status page shows your place, your litters and your turn, and it's where you send us changes." },
  },
  dogs: [
    { slug: 'willow', call_name: 'Willow', registered_name: "AK's Wild at Heart", sex: 'female', role: 'Dam', color: 'Black & white', health: TESTS_F, bio: 'Our mud-puddle girl. Willow loves playing in dirt and mud, and we love her anyway. Mom to the Gem litter.' },
    { slug: 'ziva', call_name: 'Ziva', registered_name: "AK's Ziva the Brave", sex: 'female', role: 'Dam', color: 'Black & white', health: TESTS_F, bio: 'The one who started it all. Calm, square and steady, with the classic Boston blaze. Mom to Contessa.' },
    { slug: 'peaches', call_name: 'Peaches', registered_name: "AK's Just Peachy", sex: 'female', role: 'Dam', color: 'Black & white', health: TESTS_F, bio: "Peaches doesn't miss a meal, or a chance to smile for the camera. Planned pairing for early 2027." },
    { slug: 'pearl', call_name: 'Pearl*', registered_name: "AK's Pearl of the South*", sex: 'female', role: 'Dam', color: 'Black & white', health: TESTS_F, bio: 'Sweet, sun-loving and a little dramatic about bath time. Next heat expected around March.' },
    { slug: 'boone', call_name: 'Boone*', registered_name: "AK's Southern Gentleman*", sex: 'male', role: 'Sire', color: 'Black & white', health: [...TESTS_F, { test: 'Cardiac (OFA)', result: 'Normal', show: true }], bio: 'Our gentleman. Big ears, bigger heart, and the sire of both current litters.' },
  ],
  litters: [
    {
      slug: 'gem-2026', name: 'The Gem litter', stage: 'current', dam: 'willow', sire: 'boone', born_on: '2026-10-28', ready_on: '2026-12-23',
      summary: 'Three babies, one week old, growing fast.',
      puppies: [
        { slug: 'opal', name: 'Opal', collar: 'pink collar', sex: 'female', color: 'Black & white', status: 'available', bio: 'Our pink-collar girl. Loudest at feeding time and first to find the warm spot.' },
        { slug: 'diamond', name: 'Diamond', collar: 'blue collar', sex: 'male', color: 'Black & white', status: 'available', bio: 'Blue-collar boy with a wide white blaze. Photos coming this week.' },
        { slug: 'onyx', name: 'Onyx', collar: 'black collar', sex: 'male', color: 'Black & white', status: 'reserved', bio: 'The darkest of the three, with a little white snip. Picked by our #1 family.' },
      ],
    },
    {
      slug: 'ziva-boone-2026', name: 'Ziva × Boone*', stage: 'current', dam: 'ziva', sire: 'boone', born_on: '2026-08-24', ready_on: '2026-10-19',
      puppies: [
        { slug: 'contessa', name: 'Contessa', collar: 'purple collar', sex: 'female', color: 'Black & white', status: 'available', bio: 'Ten weeks old, crate-started and nearly potty-pad trained. Ready to go home now.' },
      ],
    },
    { slug: 'peaches-boone-2027', name: 'Peaches × Boone*', stage: 'planned', plan_label: 'Planned pairing', dam: 'peaches', sire: 'boone', expected_label: 'Mid-February 2027', ready_label: 'Mid-April 2027' },
    { slug: 'pearl-2027', name: 'Pearl*', stage: 'planned', plan_label: 'Upcoming heat', dam: 'pearl', expected_label: 'Spring 2027, if all goes to plan', summary: 'Heat estimated around March 2027.' },
  ],
  reviews: [
    { topic: 'temperament', first_name: 'The Rivera family', rating: 5, quote: 'Our boy is the funniest, sweetest dog. He came home already used to the crate and slept through the second night.' },
    { topic: 'process', first_name: 'Dana & Mike', rating: 5, quote: 'Watching our number move up the list took the guessing out of it. When it was our turn we had 48 hours to choose and never felt rushed.' },
    { topic: 'health', first_name: 'Sarah L.', rating: 5, quote: 'Every test result was there for both parents. Our vet said she was one of the healthiest Boston puppies she had seen.' },
    { topic: 'temperament', first_name: 'The Okafor family', rating: 5, quote: 'Great with our kids from day one. Gentle with the toddler, ready to play with the ten-year-old.' },
    { topic: 'process', first_name: 'Jen & Tom', rating: 5, quote: 'Weekly photos, a care binder and a call the first night home. We felt looked after the whole way.' },
  ],
  steps: [
    { heading: 'Apply', body: 'Fill out the puppy application. We read every one and reply within a week.', detail: 'We ask about your home, your schedule, other pets and what you hope for in a Boston. There are no wrong answers; it helps us match the right puppy to you.' },
    { heading: 'Pay the application fee', body: 'Once approved, a $300 fee holds your place. Your place is set the day it arrives.', detail: "The fee comes off your puppy's price. If you change your mind before your turn, it can move to a later litter.", pay_link: true },
    { heading: 'Watch your number', body: 'Your name appears on our public waitlist as first name and last initial, or masked if you ask.', detail: 'Positions move up as families ahead of you take puppies. You can sign in any time to see your own details, pause, or change your preferences.' },
    { heading: 'Choose your puppy', body: "When a litter is ready and it's your turn, we email you. You have 48 hours to pick or pass.", detail: "Passing once doesn't cost your place. You can tell us ahead of time to skip a litter that isn't right for you. Your deposit is due within 48 hours of choosing.", pay_link: true },
    { heading: 'Go home at 8 weeks', body: 'Pick up here or meet us. Your puppy comes with a care binder, food and a blanket that smells like home.', detail: 'Puppies go home with their first shots, deworming, a vet check and microchip, plus our number for life.' },
  ],
  expanders: {
    policies: [
      { heading: 'Health guarantee', body: 'Every puppy has a vet exam before going home and a two-year guarantee against life-threatening genetic conditions. If a covered condition is diagnosed, we offer a replacement puppy or a partial refund.', start_open: true },
      { heading: 'Deposits and refunds', body: "The $300 application fee comes off your puppy's price. It's refundable until you've chosen a puppy, and can move to a later litter at any time." },
      { heading: 'Spay and neuter', body: 'Companion puppies go home on limited registration with a spay/neuter agreement by 18 months. Full registration is available to approved show and breeding homes.' },
      { heading: 'Take-back for life', body: "If you can ever no longer keep your dog, at any age, it comes back to us. We'll care for it and help find its next home." },
    ],
    faq: [
      { heading: 'How much is a puppy?', body: 'It depends on how long your puppy stays with us. Extended homegoing at 10, 12 or 16 weeks runs from $2,500 to $4,400; see Extras for each package. Your $300 application fee comes off the price.', start_open: true },
      { heading: 'Do Boston Terriers have breathing problems?', body: 'Bostons are a short-nosed breed, so we choose parents with open nostrils and good airways, keep them lean, and talk you through warm-weather care.' },
      { heading: 'Can I visit before my turn?', body: "Yes, once you're on the waitlist. Puppy visits start at five weeks, after their first vet check." },
      { heading: 'Do you ship?', body: "We don't ship puppies as cargo. Pickup is here, or we can arrange a flight nanny or meet you within a few hours' drive." },
      { heading: 'What colors do you have?', body: "Mostly black and white, with an occasional seal or brindle. Color doesn't change price." },
    ],
    waitlist_help: [
      { heading: '1. Get your sign-in code', body: 'Draft: we email a 6-digit code to the address on your application. No code? Enter that email under Current Applicants and press Send me a new code. Check your spam folder.', start_open: true },
      { heading: '2. Sign in', body: 'Draft: enter the code under Current Applicants: See Your Details. Codes last 15 minutes and work once. This device remembers you for 90 days.' },
      { heading: "3. What you'll see", body: "Draft: your place on the list, the litters you're waiting for and your place in each, your application fee if it's still due, and your turn when it comes." },
      { heading: '4. Choosing your puppy, or passing', body: "Draft: when it's your turn, the puppies still open show on your page. Choose one, or pass on this litter, before the deadline shown." },
      { heading: '5. Asking for changes', body: "Draft: ask for a pause, change which litters you're waiting for, or ask to change a preference such as sex or color. Requests come to us to approve, and your page shows them as waiting until we do." },
      { heading: '6. Messages and pickup times', body: 'Draft: send us a private message, and once your puppy is nearly ready, ask for a pickup time.' },
      { heading: '7. Leaving the list', body: 'Draft: you can ask to leave the waitlist from your page at any time.' },
      { heading: '8. A new phone or computer', body: 'Draft: sign in again with a new code. Signing out on a shared computer keeps your page private.' },
    ],
  },
  extras: [
    { kind: 'homegoing', weeks: 10, name: '10-Week Homegoing', price_from: 2500, price_to: 2800, description: 'Two additional weeks with us before your puppy moves to their forever home.', lead_in: 'During this additional time, we continue working on:', checklist: ['Individualized socialization', 'Household exposure', 'Confidence-building experiences', 'Crate-training foundations', 'Potty-training foundations', 'Handling & grooming introduction', 'Age-appropriate enrichment', 'Household manners and routine'], closing: 'The extra time lets your puppy keep maturing within the structure and routine of our home before making the move to your family.' },
    { kind: 'homegoing', weeks: 12, name: '12-Week Extended Homegoing', price_from: 3000, price_to: 3200, description: 'An additional month of development beyond the traditional 8-week homegoing age.', lead_in: 'Your puppy will continue receiving:', checklist: ['Individualized socialization', 'Household and environmental exposure', 'Confidence-building experiences', 'Crate-training foundations', 'Potty-training development', 'Grooming and handling practice', 'Age-appropriate enrichment and training', 'Continued structure and household routines'] },
    { kind: 'homegoing', weeks: 16, name: '16-Week Premier Development Package', price_from: 4200, price_to: 4400, featured: true, description: 'Our most comprehensive option, for families who want their puppy to stay with us through 16 weeks of age: eight more weeks for maturity, socialization, potty training, training foundations and veterinary care.', lead_in: 'During this time, your puppy continues receiving:', checklist: ['Individualized socialization', 'Household & environmental exposure', 'Confidence-building experiences', 'Crate-training foundations', 'Potty training', 'Training foundations', 'Veterinary care through 16 weeks'] },
  ],
};
