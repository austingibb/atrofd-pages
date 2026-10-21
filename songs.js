// Album track lists checked against Wikipedia album pages, 2026-10-21.
// Sources: see SONG-SOURCES.md. Titles only; no lyrics or artwork.
const albumSongs = {
  'Self-titled': 'Implicit Demand for Proof|Fall Away|The Pantaloon|Addict with a Pen|Friend, Please|March to the Sea|Johnny Boy|Oh, Ms. Believer|Air Catcher|Trapdoor|A Car, a Torch, a Death|Taxi Cab|Before You Start Your Day|Isle of Flightless Birds',
  'Regional at Best': 'Guns for Hands|Holding On to You|Ode to Sleep|Slowtown|Car Radio|Forest|Glowing Eyes|Kitchen Sink|Anathema|Lovely|Ruby|Trees|Be Concerned|Clear|House of Gold|Two',
  'Vessel': 'Ode to Sleep|Holding On to You|Migraine|House of Gold|Car Radio|Semi-Automatic|Screen|The Run and Go|Fake You Out|Guns for Hands|Trees|Truce',
  'Blurryface': "Heavydirtysoul|Stressed Out|Ride|Fairly Local|Tear in My Heart|Lane Boy|The Judge|Doubt|Polarize|We Don't Believe What's on TV|Message Man|Hometown|Not Today|Goner",
  'Trench': 'Jumpsuit|Levitate|Morph|My Blood|Chlorine|Smithereens|Neon Gravestones|The Hype|Nico and the Niners|Cut My Lip|Bandito|Pet Cheetah|Legend|Leave the City',
  'Scaled and Icy': 'Good Day|Choker|Shy Away|The Outside|Saturday|Never Take It|Mulberry Street|Formidable|Bounce Man|No Chances|Redecorate',
  'Clancy': "Overcompensate|Next Semester|Backslide|Midwest Indigo|Routines in the Night|Vignette|The Craving|The Craving (Jenna's Version)|The Craving (Single Version)|Lavish|Navigating|Snap Back|Oldies Station|At the Risk of Feeling Dumb|Paladin Strait",
  'Breach': 'City Walls|Rawfear|Drum Show|Garbage|The Contract|Downstairs|Robot Voices|Center Mass|Cottonwood|One Way|Days Lie Dormant|Tally|Intentions|Drag Path',
  'Other releases': "Heathens|Cancer|Level of Concern|Christmas Saves the Year|The Line|Time to Say Goodbye|Save|Can't Help Falling in Love|Jar of Hearts|Mad World|Doubt (demo)"
};
function normalizeSong(title) {
  return title.normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g, '');
}
const songTitles = [...new Set(Object.values(albumSongs).flatMap(titles => titles.split('|')))];
const canonicalSongs = new Map(songTitles.map(title => [normalizeSong(title), title]));
canonicalSongs.set('atrofd', 'At the Risk of Feeling Dumb');
canonicalSongs.set('forrest', 'Forest');
function canonicalSong(title) { return canonicalSongs.get(normalizeSong(title)); }
function isKnownSong(title) { return Boolean(canonicalSong(title)); }

// Levenshtein edit distance: insertions, deletions, and substitutions.
function editDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return previous[b.length];
}
// Cache ordered word combinations so omitted middle words also match.
// Keep matching whitespace-insensitive, and avoid suggesting on generic words alone.
const genericFragments = new Set(['the', 'and', 'for', 'with', 'from', 'of', 'in', 'to']);
const searchableSongs = songTitles.map(song => {
  const words = song.split(/\s+/).map(normalizeSong).filter(Boolean);
  let fragments = [''];
  for (const word of words) fragments = fragments.concat(fragments.map(fragment => fragment + word));
  return { song, normalized: normalizeSong(song), fragments: [...new Set(fragments)].filter(fragment => fragment.length >= 3 && !genericFragments.has(fragment)) };
});
function closestSongs(title) {
  const query = normalizeSong(title);
  if (query.length < 3 || genericFragments.has(query) || isKnownSong(title)) return [];
  return searchableSongs.map(({ song, normalized, fragments }) => {
    let score = 0;
    const coverage = query.length / normalized.length;
    // Contiguous fragments may start or finish anywhere within the title.
    if (query.length >= 4 && normalized.includes(query)) score = 0.94 + 0.06 * coverage;
    for (const fragment of fragments) {
      const distance = editDistance(query, fragment);
      const length = Math.max(query.length, fragment.length);
      const similarity = 1 - distance / length;
      if (distance === 0) {
        score = Math.max(score, 0.94 + 0.06 * coverage);
      } else if (similarity >= 0.75 && distance <= Math.min(4, Math.max(1, Math.floor(length * 0.25)))) {
        // Exact partial matches outrank fuzzy ones; prefer fuller title coverage.
        score = Math.max(score, 0.85 * similarity + 0.05 * Math.min(1, coverage));
      }
    }
    return { song, score };
  }).filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score || a.song.localeCompare(b.song))
    .slice(0, 3).map(match => match.song);
}
