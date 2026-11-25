export interface SyncTheoryCardConfig {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  note: string;
  accentHex: string;
}

export interface CockpitMetricConfig {
  label: string;
  value: string;
}

export const DREAM_FAIRY_CONFIG = {
  airlineName: 'DREAM FAIRY AIRWAYS',
  recipientName: 'Shravani',
  recipientNickname: 'Dream Fairy',
  senderSignature: 'Yours Dreamfairy',
  birthdayDate: '06 December 2026',
  originCity: 'Bangalore',

  palette: {
    babyBlue: '#CFE8FA',
    lavender: '#DFD5FA',
    blushPink: '#FADCE8',
    cloudWhite: '#FCFDFE',
    champagneGold: '#E6C98F',
    ink: '#1B2138',
    inkMuted: '#4C5574',
  },

  hero: {
    quote:
      'Somewhere between a random conversation and countless little coincidences, someone became really special.',
    greeting: 'Hey Captain',
    subtitle: 'Your birthday flight is ready, Dream Fairy.',
    ctaLabel: 'BOARD YOUR FLIGHT ✈️',
  },

  boardingPass: {
    airline: 'DREAM FAIRY AIRWAYS',
    flightCode: 'DF-0612',
    routeOrigin: 'BLR',
    routeOriginCity: 'Bangalore',
    routeDestination: 'DREAMS',
    routeDestinationCity: 'Universe of Dreams',
    fields: {
      passenger: 'SHRAVANI',
      flight: 'DF-0612',
      destination: 'A UNIVERSE OF DREAMS',
      departure: '06 DECEMBER 2026',
      seat: 'FIRST CLASS',
      status: 'EXTRAORDINARY HUMAN',
    },
    gate: '06D',
    boardingGroup: 'PRIORITY MAGIC',
  },

  universe: {
    heading: 'Miles apart, but somehow on the same wavelength.',
    paragraphs: [
      "Who knew someone I haven't even met in person could become such a beautiful part of my life?",
      'You have this magical way of making people feel better, making them smile and reminding them to keep going.',
      'Thank you for always cheering me up, motivating me and being my little sunshine in unexpected ways.',
      'Some connections are just different. And ours is one of my favourites.',
    ],
    starLabels: {
      left: 'Shravani',
      right: 'Yours Dreamfairy',
    },
  },

  syncTheory: {
    heading: 'Are we secretly the same person?',
    closingMessage:
      'Different cities, same frequency. At this point, even the universe is probably confused.',
    cards: [
      {
        id: 'outfit',
        index: '01',
        title: 'SAME OUTFIT ENERGY',
        subtitle: 'Unplanned wardrobe twins',
        note: 'Different closets, same colours, same vibe — without even texting about it first.',
        accentHex: '#CFE8FA',
      },
      {
        id: 'dance',
        index: '02',
        title: 'SAME DANCE ENERGY',
        subtitle: 'Zero choreography needed',
        note: 'The exact same random mood, rhythm, and joyful main-character energy whenever music plays.',
        accentHex: '#FADCE8',
      },
      {
        id: 'thoughts',
        index: '03',
        title: 'SAME RANDOM THOUGHTS',
        subtitle: 'Shared braincell moments',
        note: 'Thinking of the exact same thing at the exact same minute before either of us types a word.',
        accentHex: '#DFD5FA',
      },
      {
        id: 'wavelength',
        index: '04',
        title: 'SAME WAVELENGTH',
        subtitle: 'Effortless understanding',
        note: 'Knowing just what to say to lift each other up, even from hundreds of kilometres away.',
        accentHex: '#F6E9CB',
      },
      {
        id: 'coincidences',
        index: '05',
        title: 'TOO MANY COINCIDENCES',
        subtitle: 'Written in the stars',
        note: 'At some point coincidences stop being accidental and turn into a favourite little friendship.',
        accentHex: '#E8F4FD',
      },
    ] as SyncTheoryCardConfig[],
  },

  pilotDream: {
    heading: 'THE SKY IS WAITING FOR YOU, CAPTAIN.',
    message:
      "One day, you'll be sitting in that cockpit, looking at the endless sky, knowing you made your dream come true.",
    ctaLabel: 'TAKE OFF TO YOUR DREAMS ✈️',
    takeoffQuote:
      "One day, I'll look up at the sky and proudly say... that's MY Dream Fairy flying up there.",
    dashboard: [
      { label: 'DESTINATION', value: 'YOUR DREAMS' },
      { label: 'ALTITUDE', value: 'UNLIMITED' },
      { label: 'CONFIDENCE', value: '100%' },
      { label: 'CLEARANCE', value: 'GRANTED' },
      { label: 'PILOT STATUS', value: 'FUTURE CAPTAIN' },
    ] as CockpitMetricConfig[],
  },

  letter: {
    sectionTitle: 'A Letter From Your Dream Fairy',
    promptHint: 'Click the glass envelope to open your birthday letter',
    salutation: 'Dear Shravani,',
    paragraphs: [
      'Happiest Birthday to my Dream Fairy! 💗',
      "It's honestly funny how we haven't even met in person, yet you've become someone so special to me.",
      'Thank you for being that person who cheers me up, motivates me and makes me feel like I can take on anything.',
      "I love how we randomly sync in the tiniest things. Our outfits, our dance vibes, our thoughts... it's almost like we share one little universe.",
      "I hope life gives you every beautiful thing you've ever wished for. I hope you get endless reasons to smile, endless opportunities to grow and all the courage you need to chase your dreams.",
      "And please, never stop dreaming about that cockpit and those beautiful skies. I genuinely hope I get to see you become the pilot you've always wanted to be.",
      "Someday, we absolutely need to meet, laugh endlessly and create all those memories we've been missing out on.",
      'Until then, keep shining, keep being your magical self and keep flying towards everything you deserve.',
      'You deserve the entire sky, Dream Fairy.',
    ],
    closing: 'With lots of love,',
    signature: 'Yours Dreamfairy 💗',
  },

  finale: {
    heading: 'HAPPY BIRTHDAY, SHRAVANI!',
    subtitle: 'To the girl who was born to touch the skies.',
    paragraphs: [
      'May every flight take you closer to your dreams, every sunrise bring you happiness and every year make your world more beautiful.',
      'Keep dreaming. Keep shining. Keep flying.',
    ],
    signatureLead: 'Forever your biggest cheerleader,',
    signatureName: 'Yours Dreamfairy 💗',
    replayLabel: 'REPLAY OUR LITTLE ADVENTURE',
  },
} as const;
