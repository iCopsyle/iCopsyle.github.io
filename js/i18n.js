/* Every UI string in English and Arabic. Arabic is the default.
   Arabic copy comes from Protofolio/V3/js/i18n.js; game titles stay in English in both. */

export const STR = {
  en: {
    "meta.title": "Omar Alabdan · Game Designer",
    "name.a": "OMAR", "name.b": "ALABDAN", "name": "Omar Alabdan",
    "loading": "// Loading the desert",
    "role": "// Game designer & indie developer",
    "sub": "iCopsyle.<br>Six-plus years. Fourteen games.",
    "index": "////// Index", "nav.games": "Games", "nav.all": "All projects", "nav.contact": "Contact",
    "manifesto": "I design small, focused games: find the one idea that's genuinely fun, build it fast, then spend the rest of the time making it feel right.",
    "lang": "العربية", "lang.label": "Switch to Arabic",
    "sound": "Sound:", "on": "On", "off": "Off",
    "hint.power": "Scroll to power on", "hint.keep": "Keep scrolling", "hint.in": "Going in",
    "hint.hz": "Scroll to walk the road", "hint.ignh": "Scroll down the corridor", "hint.shelf": "Scroll to turn the shelf",
    "featured": "Featured", "howto": "How to play", "play": "Play on itch.io", "padhint": "or press <kbd>A</kbd> on the Game Boy",
    "time": "TIME",
    "every": "Every game", "drag": "Drag the shelf, or use <kbd>←</kbd> <kbd>→</kbd>",
    "contact.kicker": "////// Contact", "contact.title": "Let's make something<br>worth playing.",
    "contact.sub": "Studios, teams, collaborators: my inbox is open.", "copy": "Copy", "copied": "Copied",
    "twitter": "X / Twitter", "foot": "© 2026 Omar Alabdan",
    "narr.1": "Walk the corridor.", "narr.2": "Click on what you find.", "narr.3": "...Working on it."
  },
  ar: {
    "meta.title": "عمر العبدان · مصمّم ألعاب",
    "name.a": "عمر", "name.b": "العبدان", "name": "عمر العبدان",
    "loading": "// جارٍ تحميل الصحراء",
    "role": "// مصمّم ومطوّر ألعاب مستقل",
    "sub": "iCopsyle.<br>أكثر من ست سنوات. أربع عشرة لعبة.",
    "index": "////// الفهرس", "nav.games": "الألعاب", "nav.all": "كل المشاريع", "nav.contact": "تواصل",
    "manifesto": "أصمّم ألعابًا صغيرة ومركّزة: أجد الفكرة الممتعة فعلًا، أبنيها بسرعة، ثم أقضي بقية الوقت في صقلها حتى يصبح الإحساس بها صحيحًا.",
    "lang": "English", "lang.label": "التبديل إلى الإنجليزية",
    "sound": "الصوت:", "on": "يعمل", "off": "مغلق",
    "hint.power": "مرّر لتشغيل الجهاز", "hint.keep": "واصل التمرير", "hint.in": "ندخل الآن",
    "hint.hz": "مرّر لتمشي على الطريق", "hint.ignh": "مرّر لتمشي في الممر", "hint.shelf": "مرّر لتدوير الرف",
    "featured": "مختارة", "howto": "طريقة اللعب", "play": "العب على itch.io", "padhint": "أو اضغط <kbd>A</kbd> على الجهاز",
    "time": "الوقت",
    "every": "كل الألعاب", "drag": "اسحب الرف، أو استخدم <kbd>←</kbd> <kbd>→</kbd>",
    "contact.kicker": "////// تواصل", "contact.title": "لنصنع شيئًا<br>يستحق اللعب.",
    "contact.sub": "استوديوهات، فرق تطوير، متعاونون: بريدي مفتوح دائمًا.", "copy": "انسخ", "copied": "تم النسخ",
    "twitter": "X / تويتر", "foot": "© 2026 عمر العبدان",
    "narr.1": "امشِ في الممر.", "narr.2": "انقر على ما تجده.", "narr.3": "...قيد العمل."
  }
};

/* Per-game Arabic copy (V3's GAMES_AR, plus the two itch pages without a description). */
const GAMES_AR = {
  "memory": { tagline: "كلمة جديدة، أم رأيتها من قبل؟" },
  "many-doors-one-room": { tagline: "200 باب. واحد منها لك." },
  "csc113-experience": { tagline: "حاول النجاة من فصل دراسي في جامعة الملك سعود." },
  "follow": { tagline: "لعبة عليك فيها جمع المزيد من الأرواح." },
  "tictacpro": { tagline: "إكس-أو، لكن أفضل." },
  "strong-connection": { tagline: "صِلا إلى نهاية المرحلة بمساعدة بعضكما." },
  "ai-race": { tagline: "تفوّق على حشد من عدّائي الذكاء الاصطناعي." },
  "galaxy-jump": { tagline: "استمتع برحلة في الفضاء!" },
  "the-mysterious-dimension": { tagline: "الوقت هو المفتاح." },
  "jabaldillah": { tagline: "منشورة على itch.io." },
  "clockracer": { tagline: "قيد التطوير." },
  "hourzero": { tagline: "ثوانٍ قبل الاصطدام.", blurb: "لعبة تصويب سريعة وقريبة المدى في الدقائق الأخيرة قبل الاصطدام. كل إصابة تمنحك ثوانيَ إضافية، وكل إخفاق يسلبك منها." },
  "insert-game-name-here": { tagline: "قيد العمل.", blurb: "لعبة من منظور الشخص الأول تعمل في المتصفح. تجوّل في الممر وتفاعل مع ما تجده." },
  "ticking-grains": { tagline: "أنت المؤقّت. أبقِ نفسك تعمل.", blurb: "لعبة منصّات يقلبك فيها القفز رأسًا على عقب، والانقلاب هو الشيء الوحيد الذي يمنع رملك من النفاد." }
};

const WORDS_AR = {
  "Shooter": "تصويب", "First-person": "منظور الشخص الأول", "Puzzle platformer": "ألغاز ومنصّات", "Word game": "لعبة كلمات",
  "Adventure": "مغامرة", "Simulation": "محاكاة", "Horror survival": "رعب ونجاة", "Strategy": "استراتيجية",
  "Co-op platformer": "منصّات تعاونية", "Racing": "سباق", "3D parkour": "باركور ثلاثي الأبعاد",
  "Browser": "المتصفح", "Windows": "ويندوز",
  "Move": "تحرّك", "Fire": "أطلق", "Run": "اركض", "Jump": "اقفز", "Slide": "انزلق", "Interact": "تفاعل"
};

let lang = "ar";
try { lang = localStorage.getItem("lang") || "ar"; } catch (e) {}
if (lang !== "en" && lang !== "ar") lang = "ar";

export const getLang = () => lang;
export const isAr = () => lang === "ar";
export function setLang(l) {
  lang = l;
  try { localStorage.setItem("lang", l); } catch (e) {}
  applyDocLang();
}
export const t = key => (STR[lang] && STR[lang][key]) ?? STR.en[key] ?? key;
export const word = w => (lang === "ar" && WORDS_AR[w]) || w;

/* A game's display copy in the current language (titles stay English). */
export function gameText(g) {
  const ar = lang === "ar" ? GAMES_AR[g.slug] || {} : {};
  return {
    tagline: ar.tagline || g.tagline,
    blurb: ar.blurb || g.blurb,
    genre: g.genre ? word(g.genre) : "",
    platform: g.platform ? word(g.platform) : "",
    controls: (g.controls || []).map(([k, v]) => [k, word(v)])
  };
}

export function applyDocLang() {
  const el = document.documentElement;
  el.lang = lang;
  el.dir = lang === "ar" ? "rtl" : "ltr";
  document.title = t("meta.title");
  document.querySelectorAll("[data-i18n]").forEach(n => { n.textContent = t(n.dataset.i18n); });
  document.querySelectorAll("[data-i18n-html]").forEach(n => { n.innerHTML = t(n.dataset.i18nHtml); });
  document.querySelectorAll("[data-i18n-aria]").forEach(n => { n.setAttribute("aria-label", t(n.dataset.i18nAria)); });
}
