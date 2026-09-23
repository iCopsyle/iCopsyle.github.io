/* Every fact here comes from the game's itch.io page.
   Years marked `approx: true` are inferred from upload order, not stated on itch. */

window.BASE_THEME = { bg: "#1b2a8f", face: "#13206e", fg: "#f4efe6", accent: "#ff6a1a", on: "#140a02" };

window.GAMES = [
  {
    slug: "insert-game-name-here", title: "Insert Game Name Here", year: "2026",
    jam: "GameZanga 14", genre: "First-person", platform: "Browser",
    tagline: "Working on it.",
    blurb: "A first-person browser game. Walk the corridor, click on what you find.",
    controls: [["WASD", "Move"], ["LMB", "Interact"]],
    theme: { bg: "#0b5a14", face: "#063b0c", fg: "#f3f1ea", accent: "#ea93b6", on: "#2a0b18" }
  },
  {
    slug: "hourzero", title: "HourZero", year: "2026",
    jam: "Sop Game Jam 2026", genre: "Shooter", platform: "Browser", rating: [5, 1],
    tagline: "Seconds before it hits.",
    blurb: "A fast, close-range shooter set in the last minutes before impact. Every hit buys you seconds, every miss costs them. Descend one layer at a time before the timer runs out.",
    controls: [["WASD", "Move"], ["LMB", "Fire"], ["Shift", "Run"], ["Space", "Jump"], ["C", "Slide"]],
    theme: { bg: "#3f0a06", face: "#240504", fg: "#ffe6db", accent: "#ff4b1f", on: "#1c0301" }
  },
  {
    slug: "ticking-grains", title: "Ticking Grains", year: "2026",
    jam: "GMTK Game Jam 2026", genre: "Puzzle platformer", platform: "Browser", rating: [5, 1],
    tagline: "You are the timer. Keep yourself running.",
    blurb: "A platformer where jumping flips you upside down, and flipping is the only thing keeping your sand from running out.",
    controls: [["WASD", "Move"], ["Space", "Jump"]],
    theme: { bg: "#172342", face: "#0e172e", fg: "#f5edd9", accent: "#f2b134", on: "#1d1402" }
  },
  {
    slug: "memory", title: "Memory", year: "2025", approx: true,
    genre: "Word game", platform: "Browser",
    tagline: "New word, or have you seen it before?",
    blurb: "One word at a time: call whether it's new or one you've already seen. Three hearts, and the words start to look alike.",
    controls: [["LMB", "Answer"]],
    theme: { bg: "#0c0a0d", face: "#1b171d", fg: "#f3eef4", accent: "#e8283f", on: "#ffffff" }
  },
  {
    slug: "many-doors-one-room", title: "Many Doors One Room", year: "2025",
    jam: "Devs That Jam 36h #13", genre: "Adventure", platform: "Browser",
    tagline: "200 doors. One of them is yours.",
    blurb: "Stranded on a lone cloud drifting through the stars, you face 200 floating doors numbered −100 to 100. One opens into your own room; the rest open into little games that hint where it is.",
    record: "Dev's best time: 5:44",
    controls: [["WASD", "Move"], ["Space", "Jump"], ["E", "Open door"], ["Tab", "Hint log"]],
    theme: { bg: "#1c130e", face: "#2c1d13", fg: "#f1e6d9", accent: "#45d9f2", on: "#03191d" }
  },
  {
    slug: "csc113-experience", title: "CSC113 Experience", year: "2024", approx: true,
    jam: "University project", genre: "Simulation", platform: "Windows",
    tagline: "Try to survive a semester at KSU.",
    blurb: "A small game made for a university course. Keep your GPA alive through the semester and put your name on the offline leaderboard.",
    controls: [["WASD", "Move"]],
    theme: { bg: "#555a67", face: "#43474f", fg: "#ffffff", accent: "#ff4747", on: "#1a0000" }
  },
  {
    slug: "follow", title: "Follow The Soul", year: "2024",
    jam: "Devs That Jam 36h (Apr ’24)", genre: "Horror survival", platform: "Browser",
    tagline: "A game where you need to get more souls.",
    blurb: "A 36-hour horror jam game. Kill people and hide in their bodies using souls. Fail to kill and your soul count drains until you're gone.",
    controls: [["WASD", "Walk"], ["E", "Enter / exit a soul"]],
    theme: { bg: "#3e171b", face: "#290e11", fg: "#f5dfcc", accent: "#ec9b5e", on: "#260d02" }
  },
  {
    slug: "tictacpro", title: "TicTacPro", year: "2024", approx: true,
    genre: "Strategy", platform: "Browser", rating: [5, 1],
    tagline: "A better tic-tac-toe.",
    blurb: "Tic-tac-toe with a clock running. Take on the AI, or play both sides yourself.",
    controls: [["LMB", "Place"]],
    theme: { bg: "#4b637d", face: "#33465b", fg: "#fdf4dc", accent: "#ff5a5f", on: "#2a0204" }
  },
  {
    slug: "strong-connection", title: "Strong Communication", year: "2021",
    jam: "GMTK Game Jam 2021", genre: "Co-op platformer", platform: "Browser",
    tagline: "Reach the end of the level by helping each other.",
    blurb: "Two characters, one level. Switch between them and grapple your way to the exit together.",
    controls: [["WASD", "Move"], ["Tab", "Switch player"], ["E", "Hold to grapple"], ["Space", "Jump"], ["R", "Restart"]],
    theme: { bg: "#062c41", face: "#0b3b55", fg: "#e8f7f3", accent: "#f7920a", on: "#1f1000" }
  },
  {
    slug: "ai-race", title: "AI Race", year: "2021",
    jam: "100 CodeGame Challenge", genre: "Racing", platform: "Browser",
    tagline: "Outrun the path-finding pack.",
    blurb: "A 3D foot race against a crowd of path-finding AI runners. Sprint, jump, and beat them to the end of the track.",
    controls: [["W", "Run"], ["A D", "Turn"], ["Shift", "Sprint"], ["Space", "Jump"]],
    theme: { bg: "#dde4e6", face: "#c5d0d3", fg: "#121819", accent: "#b3261e", on: "#ffffff" }
  },
  {
    slug: "galaxy-jump", title: "Galaxy Jump", year: "2020", approx: true,
    jam: "Prototype", genre: "3D parkour", platform: "Browser",
    tagline: "Enjoy a space trip!",
    blurb: "A 3D parkour prototype among the stars. Sprint, jump, and don't fall down.",
    controls: [["WASD", "Move"], ["Shift", "Sprint"]],
    theme: { bg: "#1d1747", face: "#120e30", fg: "#f1eaff", accent: "#ff5fdb", on: "#2a0322" }
  },
  {
    slug: "the-mysterious-dimension", title: "The Mysterious Dimension", year: "2020",
    jam: "Ajman Summer Game Jam", genre: "Shooter", platform: "Browser", rating: [5, 4],
    tagline: "Time is the key.",
    blurb: "Bend time with your movement to beat every enemy and find your missing friend. The less you move, the longer you live. Two cutscenes, one boss, one surprise.",
    controls: [["WASD", "Move"], ["LMB", "Shoot"]],
    theme: { bg: "#fb6e17", face: "#e25c0a", fg: "#240b00", accent: "#1b1446", on: "#ffffff" }
  }
];

/* On itch with a cover but no description, year or screenshots. */
window.OFF_DIAL = [
  { slug: "jabaldillah", title: "JabalDillah", titleAr: "جبل الدلة", platform: "Windows", rating: [5, 1], note: "Released", cover: true },
  { slug: "clockracer", title: "ClockRacer", platform: "Windows", note: "In development", cover: true }
];

window.JAMS = [
  { date: "2026", jam: "GameZanga 14", game: "Insert Game Name Here" },
  { date: "03 AUG 2026", jam: "Sop Game Jam 2026", game: "HourZero" },
  { date: "26 JUL 2026", jam: "GMTK Game Jam 2026", game: "Ticking Grains" },
  { date: "27 APR 2025", jam: "Devs That Jam 36h #13", game: "Many Doors One Room", hours: 36 },
  { date: "29 APR 2024", jam: "Devs That Jam 36h", game: "Follow The Soul", hours: 36 },
  { date: "14 JUN 2021", jam: "GMTK Game Jam 2021", game: "Strong Communication", hours: 48 },
  { date: "02 JAN 2021", jam: "100 CodeGame Challenge", game: "AI Race" },
  { date: "10 AUG 2020", jam: "Ajman Summer Game Jam", game: "The Mysterious Dimension" }
];

window.ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
