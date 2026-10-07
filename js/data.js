/* Portfolio content, carried over from Protofolio/V3 (js/data.js + js/i18n.js).
   Every game fact comes from its itch.io page. Do not invent new ones. */

export const PROFILE = {
  name: "Omar Alabdan",
  handle: "iCopsyle",
  role: "Game designer & indie developer",
  line: "Six-plus years designing and building games. Mechanics first, polished until they feel right, and actually shipped.",
  statement: "I like small, focused games: find the one idea that's genuinely fun, build it fast, then spend the rest of the time making it feel right. A lot of mine end up being about time.",
  email: "omar.abdan800@gmail.com",
  links: [
    { label: "itch.io", value: "icopsyle.itch.io", href: "https://icopsyle.itch.io/" },
    { label: "X / Twitter", value: "@iCopsyle", href: "https://twitter.com/iCopsyle" }
  ],
  facts: [
    ["Experience", "6+ years"],
    ["Released", "14 games"],
    ["Works in", "2D & 3D"]
  ]
};

/* The three featured games. `shots` are shown inside the Game Boy screen. */
export const FEATURED = [
  {
    slug: "hourzero", title: "HourZero", year: "2026", genre: "Shooter", platform: "Browser",
    tagline: "Seconds before it hits.",
    blurb: "A fast, close-range shooter set in the last minutes before impact. Every hit buys you seconds, every miss costs them.",
    controls: [["WASD", "Move"], ["LMB", "Fire"], ["C", "Slide"]],
    accent: "#ff5a2a",
    shots: ["assets/img/reel-hourzero.jpg", "assets/img/hourzero-1.jpg", "assets/img/hourzero-2.jpg", "assets/img/hourzero-3.jpg"],
    href: "https://icopsyle.itch.io/hourzero"
  },
  {
    slug: "insert-game-name-here", title: "Insert Game Name Here", year: "2026", genre: "First-person", platform: "Browser",
    tagline: "Working on it.",
    blurb: "A first-person browser game. Walk the corridor, click on what you find.",
    controls: [["WASD", "Move"], ["LMB", "Interact"]],
    accent: "#ea93b6",
    shots: ["assets/img/reel-insert-game-name-here.jpg", "assets/img/insert-game-name-here-1.jpg", "assets/img/insert-game-name-here-2.jpg"],
    href: "https://icopsyle.itch.io/insert-game-name-here"
  },
  {
    slug: "ticking-grains", title: "Ticking Grains", year: "2026", genre: "Puzzle platformer", platform: "Browser",
    tagline: "You are the timer. Keep yourself running.",
    blurb: "A platformer where jumping flips you upside down, and flipping is the only thing keeping your sand from running out.",
    controls: [["WASD", "Move"], ["Space", "Jump"]],
    accent: "#f2b134",
    shots: ["assets/img/reel-ticking-grains.jpg", "assets/img/ticking-grains-1.jpg", "assets/img/ticking-grains-2.jpg", "assets/img/ticking-grains-3.jpg"],
    href: "https://icopsyle.itch.io/ticking-grains"
  }
];

/* Everything else, newest first. Shown as the cartridge shelf. */
export const LIBRARY = [
  { slug: "memory", title: "Memory", year: "2025", genre: "Word game", tagline: "New word, or have you seen it before?" },
  { slug: "many-doors-one-room", title: "Many Doors One Room", year: "2025", genre: "Adventure", tagline: "200 doors. One of them is yours." },
  { slug: "jabaldillah", title: "JabalDillah", year: "", genre: "Windows", tagline: "Released on itch.io." },
  { slug: "clockracer", title: "ClockRacer", year: "", genre: "Windows", tagline: "In development." },
  { slug: "csc113-experience", title: "CSC113 Experience", year: "2024", genre: "Simulation", tagline: "Try to survive a semester at KSU." },
  { slug: "follow", title: "Follow The Soul", year: "2024", genre: "Horror survival", tagline: "A game where you need to get more souls." },
  { slug: "tictacpro", title: "TicTacPro", year: "2024", genre: "Strategy", tagline: "A better tic-tac-toe." },
  { slug: "strong-connection", title: "Strong Communication", year: "2021", genre: "Co-op platformer", tagline: "Reach the end of the level by helping each other." },
  { slug: "ai-race", title: "AI Race", year: "2021", genre: "Racing", tagline: "Outrun the path-finding pack." },
  { slug: "the-mysterious-dimension", title: "The Mysterious Dimension", year: "2020", genre: "Shooter", tagline: "Time is the key." },
  { slug: "galaxy-jump", title: "Galaxy Jump", year: "2020", genre: "3D parkour", tagline: "Enjoy a space trip!" }
].map(g => ({ ...g, thumb: `assets/img/thumb-${g.slug}.jpg`, href: `https://icopsyle.itch.io/${g.slug}` }));
