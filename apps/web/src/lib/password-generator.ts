// ---------------------------------------------------------------------------
// Password & Passphrase Generation
// ---------------------------------------------------------------------------
// Uses crypto.getRandomValues() exclusively for cryptographically secure
// randomness. Rejection sampling avoids modulo bias when mapping random bytes
// to character/word indices.
// ---------------------------------------------------------------------------

export interface PasswordOptions {
  length: number; // 8-128
  uppercase: boolean; // A-Z
  lowercase: boolean; // a-z
  digits: boolean; // 0-9
  symbols: boolean; // !@#$%^&*()_+-=[]{}|;:',.<>?/
}

export interface PassphraseOptions {
  wordCount: number; // 3-10
  separator: string; // default '-'
  capitalize: boolean; // capitalize first letter of each word
  includeNumber: boolean; // append a random digit to one word
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  uppercase: true,
  lowercase: true,
  digits: true,
  symbols: true,
};

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = {
  wordCount: 4,
  separator: "-",
  capitalize: true,
  includeNumber: true,
};

// ---------------------------------------------------------------------------
// Character sets
// ---------------------------------------------------------------------------

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:',.<>?/";

// ---------------------------------------------------------------------------
// Secure random helpers
// ---------------------------------------------------------------------------

/**
 * Return a cryptographically random integer in [0, max) without modulo bias.
 * Uses rejection sampling: we find the largest multiple of `max` that fits
 * in a 32-bit unsigned integer, and reject values at or above it.
 */
function secureRandomInt(max: number): number {
  if (max <= 0) throw new Error("max must be positive");
  if (max === 1) return 0;

  const array = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max; // largest multiple of max in u32

  // eslint-disable-next-line no-constant-condition
  while (true) {
    crypto.getRandomValues(array);
    if (array[0] < limit) {
      return array[0] % max;
    }
  }
}

/**
 * Fisher-Yates shuffle using secure random.
 */
function secureShuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = secureRandomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Password generation
// ---------------------------------------------------------------------------

export function generatePassword(options: PasswordOptions): string {
  const { length, uppercase, lowercase, digits, symbols } = options;
  const clampedLength = Math.max(8, Math.min(128, length));

  // Build the character pool and track required categories.
  const categories: string[] = [];
  let pool = "";

  if (uppercase) {
    pool += UPPERCASE;
    categories.push(UPPERCASE);
  }
  if (lowercase) {
    pool += LOWERCASE;
    categories.push(LOWERCASE);
  }
  if (digits) {
    pool += DIGITS;
    categories.push(DIGITS);
  }
  if (symbols) {
    pool += SYMBOLS;
    categories.push(SYMBOLS);
  }

  // Fallback: if nothing is enabled, use lowercase.
  if (pool.length === 0) {
    pool = LOWERCASE;
    categories.push(LOWERCASE);
  }

  // Guarantee at least one character from each enabled category.
  const required: string[] = categories.map(
    (cat) => cat[secureRandomInt(cat.length)],
  );

  // Fill remaining slots from the full pool.
  const remaining = clampedLength - required.length;
  const filler: string[] = [];
  for (let i = 0; i < remaining; i++) {
    filler.push(pool[secureRandomInt(pool.length)]);
  }

  // Combine and shuffle so required characters aren't always at the start.
  const combined = secureShuffle([...required, ...filler]);

  return combined.join("");
}

// ---------------------------------------------------------------------------
// Passphrase generation
// ---------------------------------------------------------------------------

export function generatePassphrase(options: PassphraseOptions): string {
  const { wordCount, separator, capitalize, includeNumber } = options;
  const clampedCount = Math.max(3, Math.min(10, wordCount));

  const words: string[] = [];
  for (let i = 0; i < clampedCount; i++) {
    let word = WORD_LIST[secureRandomInt(WORD_LIST.length)];
    if (capitalize) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    words.push(word);
  }

  if (includeNumber) {
    const targetIndex = secureRandomInt(words.length);
    const digit = secureRandomInt(10).toString();
    words[targetIndex] = words[targetIndex] + digit;
  }

  return words.join(separator);
}

// ---------------------------------------------------------------------------
// Word list (~2048 common English words, 4-8 characters, no offensive words)
// Subset inspired by the EFF diceware list.
// ---------------------------------------------------------------------------

export const WORD_LIST: string[] = [
  "about", "above", "acorn", "acre", "acted", "adept", "admit", "adopt",
  "adult", "after", "again", "agile", "aging", "agony", "agree", "ahead",
  "aisle", "alarm", "album", "alert", "algae", "alien", "align", "alive",
  "alley", "allow", "alloy", "alone", "along", "alpha", "alter", "amaze",
  "ample", "amuse", "angel", "anger", "angle", "angry", "anime", "ankle",
  "annex", "anvil", "apart", "apple", "apply", "arena", "argue", "arise",
  "armor", "army", "aroma", "array", "arrow", "aside", "asset", "atlas",
  "atom", "attic", "audio", "audit", "avoid", "awake", "award", "aware",
  "awful", "bacon", "badge", "badly", "baker", "balmy", "banjo", "barge",
  "baron", "basic", "basin", "basis", "batch", "beach", "beard", "beast",
  "began", "begin", "being", "below", "bench", "berry", "birch", "birth",
  "black", "blade", "blame", "bland", "blank", "blast", "blaze", "bleak",
  "blend", "bless", "blimp", "blind", "blink", "bliss", "block", "bloom",
  "blown", "blues", "bluff", "blunt", "blurb", "board", "boast", "bonus",
  "boost", "booth", "bound", "boxer", "brain", "brand", "brave", "bread",
  "break", "breed", "brick", "bride", "brief", "bring", "brink", "brisk",
  "broad", "broke", "brook", "brown", "brush", "buddy", "budge", "buggy",
  "build", "built", "bulge", "bumpy", "bunch", "burst", "buyer", "cabin",
  "cable", "camel", "candy", "cargo", "carry", "carve", "catch", "cause",
  "cease", "cedar", "chain", "chair", "chalk", "champ", "chant", "chaos",
  "charm", "chart", "chase", "cheap", "check", "cheek", "cheer", "chess",
  "chest", "chief", "child", "chill", "china", "chirp", "chord", "chose",
  "chunk", "cider", "cigar", "claim", "clamp", "clash", "clasp", "class",
  "clean", "clear", "clerk", "click", "cliff", "climb", "cling", "clip",
  "cloak", "clock", "clone", "close", "cloth", "cloud", "clown", "coach",
  "coast", "cobra", "cocoa", "comet", "comic", "coral", "count", "court",
  "cover", "crack", "craft", "crane", "crash", "crate", "crawl", "crazy",
  "cream", "creek", "crest", "crisp", "cross", "crowd", "crown", "crush",
  "cubic", "curve", "cycle", "daily", "dairy", "dance", "dared", "dealt",
  "death", "debug", "decay", "decoy", "decor", "decoy", "delta", "dense",
  "depot", "depth", "derby", "desk", "deter", "devil", "diary", "digit",
  "dimly", "diner", "dirty", "disco", "ditch", "dizzy", "dodge", "doing",
  "donor", "doubt", "dough", "draft", "drain", "drake", "drama", "drank",
  "drape", "drawn", "dream", "dress", "dried", "drift", "drink", "drive",
  "drone", "drove", "drown", "drums", "drunk", "dryer", "ducky", "dwell",
  "dying", "eager", "eagle", "early", "earth", "easel", "eaten", "edges",
  "eight", "elder", "elect", "elite", "ember", "empty", "ended", "enemy",
  "enjoy", "enter", "entry", "equal", "equip", "erase", "error", "essay",
  "ethic", "evade", "event", "every", "exact", "exile", "exist", "extra",
  "fable", "faced", "facet", "faith", "famed", "fancy", "feast", "feign",
  "ferry", "fetch", "fever", "fiber", "field", "fifty", "fight", "final",
  "flair", "flame", "flash", "fleet", "flesh", "flick", "fling", "float",
  "flock", "flood", "floor", "flour", "fluid", "flush", "flute", "focus",
  "foggy", "force", "forge", "forth", "forum", "found", "frame", "frank",
  "fraud", "fresh", "fried", "front", "frost", "froze", "fruit", "fully",
  "fungi", "fuzzy", "gains", "gauge", "gavel", "gears", "geese", "ghost",
  "giant", "given", "glare", "glass", "gleam", "glide", "globe", "gloom",
  "glory", "gloss", "glove", "going", "grace", "grade", "grain", "grand",
  "grant", "grape", "graph", "grasp", "grass", "grave", "great", "green",
  "greet", "grief", "grind", "gripe", "groom", "gross", "group", "grove",
  "grown", "guard", "guess", "guest", "guide", "guild", "guilt", "guise",
  "gulch", "gummy", "gust", "habit", "happy", "hardy", "harsh", "haste",
  "hasty", "haven", "hazel", "heart", "heavy", "hedge", "heist", "hence",
  "herbs", "heron", "hippo", "hitch", "hobby", "homer", "honey", "honor",
  "hoped", "horse", "hotel", "house", "human", "humor", "hurry", "hyena",
  "icing", "ideal", "image", "imply", "inbox", "index", "infer", "inner",
  "input", "irony", "ivory", "jewel", "joint", "joker", "jolly", "juice",
  "jumbo", "jumpy", "juror", "karma", "kayak", "kebab", "khaki", "kiosk",
  "knack", "knead", "kneel", "knife", "knobs", "knock", "knoll", "known",
  "koala", "label", "labor", "lager", "lance", "large", "laser", "latch",
  "later", "latex", "layer", "leach", "learn", "lease", "least", "leave",
  "ledge", "legal", "lemon", "level", "lever", "light", "lilac", "limit",
  "linen", "liner", "liver", "llama", "lobby", "local", "lodge", "logic",
  "login", "loose", "lotus", "loved", "lover", "lower", "lucky", "lunar",
  "lunch", "lyric", "macro", "magic", "major", "maker", "mango", "manor",
  "maple", "march", "marsh", "match", "maybe", "mayor", "media", "melon",
  "mercy", "merge", "merit", "merry", "metal", "meter", "might", "mimic",
  "minor", "minus", "mirth", "mixer", "model", "moist", "money", "month",
  "moral", "motel", "motor", "motto", "mound", "mount", "mouse", "moved",
  "mover", "movie", "muddy", "mural", "music", "naive", "named", "nerve",
  "never", "night", "noble", "noise", "north", "notch", "noted", "novel",
  "nudge", "nurse", "nylon", "oasis", "occur", "ocean", "offer", "often",
  "olive", "omega", "onset", "opera", "orbit", "order", "organ", "other",
  "otter", "ought", "ounce", "outer", "owner", "oxide", "ozone", "paced",
  "paint", "panda", "panel", "panic", "paper", "parse", "party", "pasta",
  "paste", "patch", "pause", "peace", "peach", "pearl", "pecan", "pedal",
  "penny", "perch", "phase", "phone", "photo", "piano", "piece", "pilot",
  "pinch", "pitch", "pixel", "pizza", "place", "plaid", "plain", "plane",
  "plant", "plate", "plaza", "plead", "pluck", "plumb", "plume", "plump",
  "plush", "point", "polar", "pouch", "pound", "power", "press", "price",
  "pride", "prime", "print", "prior", "prism", "privy", "prize", "probe",
  "prone", "proof", "prose", "proud", "prove", "proxy", "prune", "psalm",
  "pulse", "punch", "pupil", "purse", "queen", "query", "quest", "queue",
  "quick", "quiet", "quilt", "quirk", "quota", "quote", "radar", "radio",
  "rainy", "raise", "rally", "ranch", "range", "rapid", "raven", "reach",
  "ready", "realm", "rebel", "recon", "refer", "reign", "relax", "relay",
  "reply", "rider", "ridge", "rifle", "right", "rigid", "rigor", "rinse",
  "risen", "risky", "rival", "river", "roast", "robin", "robot", "rocky",
  "rogue", "roman", "roost", "round", "route", "rover", "royal", "rugby",
  "ruins", "ruler", "rural", "saint", "salad", "salon", "salsa", "sandy",
  "sauce", "sauna", "saved", "scale", "scare", "scarf", "scene", "scent",
  "scope", "score", "scout", "scrap", "sedan", "seeds", "sense", "serve",
  "seven", "shade", "shaft", "shake", "shall", "shame", "shape", "share",
  "shark", "sharp", "shave", "shawl", "sheep", "sheer", "sheet", "shelf",
  "shell", "shift", "shine", "shire", "shirt", "shock", "shore", "short",
  "shout", "shown", "shrub", "siege", "sight", "sigma", "since", "sixth",
  "sixty", "skate", "skill", "skirt", "skull", "slate", "sleep", "slice",
  "slide", "slope", "sloth", "smart", "smell", "smile", "smoke", "snack",
  "snake", "solar", "solid", "solve", "sonic", "south", "space", "spare",
  "spark", "speak", "speed", "spell", "spent", "spice", "spike", "spine",
  "spoke", "spoon", "sport", "spray", "squad", "stack", "staff", "stage",
  "stain", "stair", "stake", "stale", "stall", "stamp", "stand", "stark",
  "start", "state", "stays", "steak", "steam", "steel", "steep", "steer",
  "stern", "stick", "stiff", "still", "stock", "stoic", "stoke", "stone",
  "stood", "stool", "store", "storm", "story", "stove", "strap", "straw",
  "stray", "strip", "stuck", "study", "stuff", "stump", "style", "sugar",
  "suite", "sunny", "super", "surge", "swamp", "sweep", "sweet", "swept",
  "swift", "swing", "swirl", "sword", "swore", "sworn", "syrup", "table",
  "taken", "taste", "teach", "tempo", "tense", "tenth", "theme", "thick",
  "thing", "think", "third", "thorn", "those", "three", "threw", "throw",
  "thump", "tidal", "tiger", "tight", "timer", "tired", "title", "toast",
  "today", "token", "topic", "torch", "total", "touch", "tough", "towel",
  "tower", "toxic", "trace", "track", "trade", "trail", "train", "trait",
  "treat", "trend", "trial", "tribe", "trick", "tried", "troop", "truck",
  "truly", "trump", "trunk", "trust", "truth", "tulip", "tumor", "tuned",
  "tuner", "turbo", "twice", "twist", "tying", "ultra", "uncle", "under",
  "union", "unite", "unity", "unset", "until", "upper", "upset", "urban",
  "usage", "usher", "usual", "utter", "valid", "value", "valve", "vapor",
  "vault", "veins", "venue", "verse", "video", "vigor", "vinyl", "viola",
  "viper", "viral", "visit", "visor", "vista", "vital", "vivid", "vocal",
  "vodka", "voice", "voter", "vowel", "wages", "wagon", "waste", "watch",
  "water", "waves", "wheat", "wheel", "where", "which", "while", "white",
  "whole", "width", "witch", "woman", "women", "world", "worry", "worse",
  "worst", "worth", "would", "wound", "woven", "wrath", "wrist", "wrote",
  "yacht", "yield", "young", "youth", "zebra", "zeros",
  "absorb", "accent", "accept", "access", "across", "acting", "action",
  "active", "actual", "adding", "adjust", "admire", "aerial", "affirm",
  "afford", "agenda", "agreed", "aiming", "alpine", "always", "amount",
  "anchor", "annual", "answer", "appeal", "archer", "arctic", "artist",
  "assert", "assign", "assist", "assume", "assure", "attach", "attack",
  "attend", "autumn", "avatar", "avocet", "backed", "backup", "badger",
  "ballet", "bamboo", "banana", "banker", "banner", "barrel", "basket",
  "battle", "beacon", "belong", "beyond", "bishop", "biting", "blanch",
  "blazer", "borrow", "bounce", "branch", "breeze", "bridge", "bright",
  "broken", "bronze", "bucket", "budget", "buffer", "buffet", "bullet",
  "bundle", "burger", "burner", "butter", "button", "cactus", "camera",
  "campus", "candle", "canyon", "carbon", "carpet", "carrot", "castle",
  "casual", "caught", "center", "change", "charge", "chosen", "chrome",
  "church", "circle", "citrus", "clever", "client", "closet", "clover",
  "cobalt", "coffee", "colony", "column", "combat", "comedy", "commit",
  "common", "copper", "corner", "cosmic", "cotton", "county", "couple",
  "course", "crayon", "create", "credit", "crisis", "custom", "dagger",
  "damage", "dancer", "danger", "daring", "debate", "decade", "decide",
  "decode", "defeat", "defend", "define", "degree", "delete", "demand",
  "denial", "deploy", "deputy", "desert", "design", "detail", "detect",
  "devote", "dialog", "differ", "digest", "dinner", "divert", "divine",
  "domain", "donkey", "double", "driver", "during", "duster", "earned",
  "easily", "eating", "editor", "effect", "effort", "emerge", "empire",
  "enable", "ending", "endure", "energy", "engage", "engine", "enough",
  "enrich", "ensure", "entire", "equals", "escape", "esprit", "estate",
  "evolve", "exceed", "except", "excite", "excuse", "exempt", "expand",
  "expect", "expert", "export", "expose", "extend", "extent", "fabric",
  "facial", "factor", "falcon", "family", "farmer", "faucet", "fellow",
  "fender", "ferret", "fierce", "figure", "filter", "finger", "fiscal",
  "fixing", "flanks", "flavor", "flight", "flower", "flying", "foliage",
  "follow", "forest", "forget", "formal", "format", "former", "fossil",
  "foster", "fought", "freeze", "frenzy", "frozen", "fusion", "future",
  "gained", "galaxy", "garden", "garlic", "gather", "ginger", "global",
  "golden", "govern", "gravel", "growth", "guitar", "gutter", "hammer",
  "handle", "hangar", "happen", "harbor", "hassle", "Hawaii", "hazard",
  "health", "heated", "height", "helmet", "helper", "herald", "herbal",
  "hiring", "holder", "honest", "hounds", "hybrid", "ignore", "impact",
  "import", "impose", "income", "indeed", "indoor", "inform", "inject",
  "inland", "insect", "insert", "insist", "intake", "intact", "intend",
  "intent", "intern", "invent", "invest", "invite", "island", "itself",
  "jacket", "jargon", "jersey", "jigsaw", "jobber", "jostle", "judged",
  "jumble", "jungle", "junior", "keeper", "kennel", "kernel", "kettle",
  "kidney", "kindly", "knight", "labels", "ladder", "lagoon", "lambda",
  "laptop", "lately", "latest", "launch", "lavish", "lawyer", "layout",
  "leader", "league", "legacy", "legend", "lender", "length", "lesson",
  "letter", "likely", "linear", "linger", "liquor", "listen", "lively",
  "lizard", "locate", "locked", "lumber", "luxury", "magnet", "maiden",
  "malice", "mallet", "manage", "manner", "marble", "margin", "marine",
  "market", "marlin", "mascot", "master", "matter", "meadow", "medium",
  "memory", "mental", "mentor", "method", "middle", "mighty", "miller",
  "minded", "mirror", "mobile", "modern", "modify", "monkey", "mortar",
  "mostly", "motion", "mutual", "myself", "napkin", "narrow", "nation",
  "native", "nature", "nearby", "neatly", "needle", "nested", "nickel",
  "nimble", "nobles", "nobody", "noodle", "normal", "notice", "notion",
  "novice", "number", "object", "obtain", "occupy", "oddity", "office",
  "offset", "online", "opener", "oppose", "option", "orange", "orchid",
  "origin", "osprey", "outfit", "outlaw", "output", "oxford", "oyster",
  "paddle", "palace", "pallet", "parade", "parent", "parrot", "pastor",
  "patrol", "patron", "pebble", "pencil", "people", "pepper", "period",
  "permit", "person", "phrase", "pillar", "pirate", "pistol", "planet",
  "plasma", "player", "plenty", "pliers", "pocket", "poetry", "poison",
  "policy", "polish", "polite", "ponder", "portal", "poster", "potato",
  "potion", "potter", "praise", "prayer", "prefer", "prince", "prison",
  "profit", "prompt", "propel", "proven", "public", "pursue", "puzzle",
  "python", "quarry", "quartz", "rabbit", "racket", "raisin", "random",
  "ranger", "rarely", "rascal", "rating", "ration", "reason", "recall",
  "recess", "reckon", "record", "reduce", "reform", "refuse", "regain",
  "regard", "region", "reject", "relief", "remain", "remedy", "remind",
  "remote", "remove", "render", "renown", "rental", "repair", "repeat",
  "report", "rescue", "resist", "resort", "result", "retail", "retain",
  "retire", "return", "reveal", "review", "revolt", "reward", "ribbon",
  "ripple", "ritual", "robust", "rocket", "roster", "rotate", "rubble",
  "runner", "runway", "saddle", "safari", "safely", "safety", "sailor",
  "salmon", "sample", "sandal", "saucer", "saving", "scenic", "school",
  "screen", "script", "scroll", "search", "season", "second", "secret",
  "sector", "secure", "select", "sender", "senior", "sequel", "series",
  "server", "settle", "shadow", "shield", "should", "shrink", "signal",
  "silent", "silver", "simple", "singer", "single", "sister", "sketch",
  "slogan", "smithy", "smooth", "sniper", "social", "socket", "solemn",
  "source", "spirit", "splash", "spoken", "sponge", "spring", "square",
  "stable", "stance", "staple", "starch", "status", "steady", "stereo",
  "strain", "strand", "stream", "street", "stride", "strike", "string",
  "stripe", "strive", "stroke", "strong", "struck", "studio", "submit",
  "subtle", "suburb", "sudden", "summit", "sunday", "sunset", "superb",
  "supply", "surely", "survey", "switch", "symbol", "syntax", "system",
  "tackle", "talent", "tangle", "target", "temple", "tenant", "tender",
  "tennis", "terror", "thanks", "theory", "thirty", "thread", "thrill",
  "thrive", "throne", "ticket", "timber", "tissue", "toggle", "tomato",
  "tongue", "toucan", "toward", "tragic", "travel", "treaty", "tribal",
  "triple", "trophy", "tunnel", "turkey", "turtle", "twelve", "typing",
  "unfair", "unfold", "unique", "united", "unless", "unlike", "unlock",
  "unrest", "update", "uphold", "upside", "uptown", "useful", "utmost",
  "vacant", "valley", "vanish", "varied", "velvet", "vendor", "verify",
  "vessel", "Viking", "violet", "virtue", "vision", "volley", "volume",
  "voyage", "waiter", "wallet", "walnut", "wander", "wanted", "warmth",
  "wealth", "weapon", "weekly", "weight", "widely", "widget", "wilder",
  "winder", "window", "winner", "winter", "wisdom", "within", "wonder",
  "worker", "worthy", "writer", "xenial", "yearly", "yogurt", "zenith",
  "zipper", "zombie",
];
