// Keep the artist in the query, never in the site's displayed branding.
function searchUrl(location = '', song = 'At the Risk of Feeling Dumb') {
  const url = new URL('https://www.youtube.com/results');
  const canonical = canonicalSong(song);
  const title = (canonical || song).replace(/"/g, '');
  const artist = canonical ? ' "Twenty One Pilots"' : '';
  url.searchParams.set('search_query', `"${title}"${artist} live ${location}`.trim());
  url.searchParams.set('sp', 'CAI='); // YouTube: sort by upload date.
  return url.href;
}
document.querySelectorAll('[data-search]').forEach(link => {
  if (link.dataset.search === 'artist-wide') {
    const url = new URL('https://www.youtube.com/results');
    url.searchParams.set('search_query', '"Twenty One Pilots" live');
    url.searchParams.set('sp', 'CAI='); // YouTube: sort by upload date.
    link.href = url.href;
  } else {
    link.href = searchUrl(link.dataset.search);
  }
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
});
const yearSelect = document.querySelector('#year');
for (let year = new Date().getFullYear(); year >= 1980; year--) {
  const option = document.createElement('option');
  option.value = String(year);
  option.textContent = String(year);
  yearSelect.append(option);
}
const songInput = document.querySelector('#song');
const songNote = document.querySelector('#song-note');
function updateSongNote() {
  const title = songInput.value.trim();
  songNote.replaceChildren();
  if (!title || isKnownSong(title)) return;
  const matches = closestSongs(title);
  if (!matches.length) {
    songNote.textContent = 'You can search other artists here, but it was made for the band that shall not be named 😉';
    return;
  }
  const label = document.createElement('span');
  label.textContent = 'Did you mean ';
  songNote.append(label);
  matches.forEach(match => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'song-suggestion';
    button.textContent = match;
    button.addEventListener('click', () => {
      songInput.value = match;
      songInput.setCustomValidity('');
      updateSongNote();
      songInput.focus();
    });
    songNote.append(button);
  });
}
songInput.addEventListener('input', () => {
  songInput.setCustomValidity('');
  updateSongNote();
});
document.querySelector('#city-search').addEventListener('submit', event => {
  event.preventDefault();
  const song = songInput.value.trim();
  if (!normalizeSong(song)) {
    songInput.setCustomValidity('Enter a song name with letters or numbers.');
    songInput.reportValidity();
    return;
  }
  updateSongNote();
  const input = document.querySelector('#city');
  const city = input.value.trim();
  const filters = [city, yearSelect.value].filter(Boolean).join(' ');
  window.open(searchUrl(filters, song), '_blank', 'noopener,noreferrer');
});

const tickerToggle = document.querySelector('#ticker-toggle');
tickerToggle.addEventListener('click', () => {
  const paused = tickerToggle.getAttribute('aria-pressed') !== 'true';
  tickerToggle.setAttribute('aria-pressed', String(paused));
  tickerToggle.textContent = paused ? 'Resume banner' : 'Pause banner';
  document.querySelector('.ticker-track').style.animationPlayState = paused ? 'paused' : '';
});
