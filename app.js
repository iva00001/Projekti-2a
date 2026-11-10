// app.js
// Pääsovelluslogiikka - natiivilla JavaScriptillä, ei ulkoisia kirjastoja

// ========== KONFIGURAATIO ==========
// Netlify-funktion päätepiste (toimii sekä paikallisesti että tuotannossa)
const API_ENDPOINT = '/.netlify/functions/lastfm';

// Pikavalinnat suosituille artisteille
const QUICK_ARTISTS = ['Cher', 'Radiohead', 'Daft Punk', 'Björk', 'Kendrick Lamar'];

// ========== TILA ==========
let currentArtist = '';
let currentAlbums = [];

// ========== DOM-VIITTEET ==========
const artistInput = document.getElementById('artist-input');
const searchBtn = document.getElementById('search-btn');
const quickPicks = document.getElementById('quick-picks');
const albumsContainer = document.getElementById('albums-container');
const albumDetail = document.getElementById('album-detail');
const statusMessage = document.getElementById('status-message');

// ========== APUFUNKTIOT ==========

/**
 * Näytä tilaviesti käyttäjälle
 */
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status ${type}`;
  statusMessage.classList.remove('hidden');
}

/**
 * Piilota tilaviesti
 */
function hideStatus() {
  statusMessage.classList.add('hidden');
}

/**
 * Tyhjennä albumien näyttö
 */
function clearAlbums() {
  albumsContainer.innerHTML = '';
  albumDetail.classList.add('hidden');
  currentAlbums = [];
}

/**
 * Muotoile kuuntelijamäärä luettavaan muotoon
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

// ========== API-KUTSUT ==========

/**
 * Hae artistin top-albumit Last.fm API:sta välityspalvelimen kautta
 */
async function fetchTopAlbums(artistName) {
  try {
    showStatus(`Haetaan artistin "${artistName}" albumeita...`, 'loading');
    clearAlbums();

    // Kutsu Netlify-funktiota, joka välittää pyynnön Last.fm:lle
    const response = await fetch(
      `${API_ENDPOINT}?method=artist.gettopalbums&artist=${encodeURIComponent(artistName)}&limit=12`
    );

    if (!response.ok) {
      throw new Error(`HTTP-virhe: ${response.status}`);
    }

    const data = await response.json();

    // Tarkista Last.fm API:n virheet
    if (data.error) {
      throw new Error(data.message || 'Last.fm API virhe');
    }

    // Tallenna data ja päivitä näkymä
    currentArtist = artistName;
    currentAlbums = data.topalbums?.album || [];

    if (currentAlbums.length === 0) {
      showStatus(`Artistille "${artistName}" ei löytynyt albumeita.`, 'warning');
      return;
    }

    hideStatus();
    renderAlbums(currentAlbums);

  } catch (error) {
    console.error('Virhe albumeita haettaessa:', error);
    showStatus(`Virhe: ${error.message}`, 'error');
  }
}

/**
 * Hae albumin tiedot ja kappalelista
 */
async function fetchAlbumDetails(artistName, albumName) {
  try {
    const response = await fetch(
      `${API_ENDPOINT}?method=album.getinfo&artist=${encodeURIComponent(artistName)}&album=${encodeURIComponent(albumName)}`
    );

    if (!response.ok) {
      throw new Error(`HTTP-virhe: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.message || 'Last.fm API virhe');
    }

    return data.album;
  } catch (error) {
    console.error('Virhe albumin tietoja haettaessa:', error);
    throw error;
  }
}

// ========== RENDERÖINTI ==========

/**
 * Renderöi albumikortit ruudukkoon
 */
function renderAlbums(albums) {
  albumsContainer.innerHTML = '';

  albums.forEach((album, index) => {
    const card = document.createElement('article');
    card.className = 'album-card';
    card.style.animationDelay = `${index * 0.05}s`;

    // Kuva (valitse suurin saatavilla oleva)
    const images = album.image || [];
    const largeImage = images.find(img => img.size === 'extralarge') || 
                       images.find(img => img.size === 'large') || 
                       images[images.length - 1];
    const imageUrl = largeImage?.['#text'] || 'https://via.placeholder.com/300x300?text=Ei+kuvaa';

    // Kuuntelijamäärä
    const listeners = album.listeners ? formatNumber(parseInt(album.listeners)) : '?';

    card.innerHTML = `
      <div class="album-cover">
        <img src="${imageUrl}" alt="${album.name}" loading="lazy">
      </div>
      <div class="album-info">
        <h3 class="album-name">${album.name}</h3>
        <p class="album-listeners">👥 ${listeners} kuuntelijaa</p>
      </div>
    `;

    // Klikkaus avaa albumin tiedot
    card.addEventListener('click', () => openAlbumDetail(album.name));

    albumsContainer.appendChild(card);
  });
}

/**
 * Avaa albumin yksityiskohtanäkymä (kappalelista jne.)
 */
async function openAlbumDetail(albumName) {
  try {
    // Näytä latausindikaattori
    albumDetail.innerHTML = '<div class="detail-loading">Ladataan albumin tietoja...</div>';
    albumDetail.classList.remove('hidden');

    // Hae albumin tiedot API:sta
    const album = await fetchAlbumDetails(currentArtist, albumName);

    // Rakenna kappalelista
    const tracks = album.tracks?.track || [];
    const trackListHtml = tracks.map((track, i) => `
      <li class="track-item">
        <span class="track-number">${i + 1}</span>
        <span class="track-name">${track.name}</span>
        <span class="track-duration">${track.duration ? formatDuration(parseInt(track.duration)) : '—'}</span>
      </li>
    `).join('');

    // Kuva
    const images = album.image || [];
    const largeImage = images.find(img => img.size === 'extralarge') || 
                       images.find(img => img.size === 'large') || 
                       images[images.length - 1];
    const imageUrl = largeImage?.['#text'] || '';

    // Julkaisupäivä
    const releaseDate = album.releasedate || 'Ei tiedossa';

    // Renderöi yksityiskohdat
    albumDetail.innerHTML = `
      <div class="detail-header">
        <button class="close-btn" id="close-detail">✕</button>
        <div class="detail-cover">
          <img src="${imageUrl}" alt="${album.name}">
        </div>
        <div class="detail-meta">
          <h2>${album.name}</h2>
          <p class="detail-artist">${album.artist}</p>
          <p class="detail-release">📅 ${releaseDate}</p>
          <p class="detail-listeners">👥 ${formatNumber(parseInt(album.listeners || 0))} kuuntelijaa</p>
          <p class="detail-playcount">▶️ ${formatNumber(parseInt(album.playcount || 0))} toistoa</p>
        </div>
      </div>
      <div class="detail-tracks">
        <h3>Kappaleet (${tracks.length})</h3>
        <ol class="track-list">${trackListHtml || '<li>Ei kappaletietoja</li>'}</ol>
      </div>
    `;

    // Lisää sulkemisnappulan käsittelijä dynaamisesti
    document.getElementById('close-detail').addEventListener('click', closeAlbumDetail);

  } catch (error) {
    albumDetail.innerHTML = `<div class="detail-error">Virhe: ${error.message}</div>`;
  }
}

/**
 * Sulje albumin yksityiskohtanäkymä
 */
function closeAlbumDetail() {
  albumDetail.classList.add('hidden');
  albumDetail.innerHTML = '';
}

/**
 * Muotoile kappaleen kesto sekunneista
 */
function formatDuration(seconds) {
  if (isNaN(seconds)) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ========== TAPAHTUMANKÄSITTELIJÄT (dynaamisesti lisätyt) ==========

/**
 * Alusta pikavalintanapit dynaamisesti
 */
function initQuickPicks() {
  QUICK_ARTISTS.forEach(artist => {
    const btn = document.createElement('button');
    btn.className = 'quick-btn';
    btn.textContent = artist;
    
    // Dynaamisesti lisätty tapahtumankäsittelijä
    btn.addEventListener('click', () => {
      artistInput.value = artist;
      fetchTopAlbums(artist);
    });
    
    quickPicks.appendChild(btn);
  });
}

/**
 * Suorita haku
 */
function performSearch() {
  const artistName = artistInput.value.trim();
  if (!artistName) {
    showStatus('Kirjoita artistin nimi ensin.', 'warning');
    return;
  }
  fetchTopAlbums(artistName);
}

// ========== ALUSTUS ==========

/**
 * Sovelluksen käynnistys
 */
function init() {
  // Lisää tapahtumankäsittelijät dynaamisesti (vaatimuksen mukaisesti)
  searchBtn.addEventListener('click', performSearch);
  
  artistInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  // Alusta pikavalinnat
  initQuickPicks();

  // Lataa oletusartisti
  artistInput.value = 'Cher';
  fetchTopAlbums('Cher');

  console.log('✅ Last.fm-sovellus alustettu');
}

// Käynnistä kun DOM on valmis
document.addEventListener('DOMContentLoaded', init);