'use strict';

// Données géographiques publiques, relevées sur DayZAide le 06/11/2026.
// Les codes changent en jeu : aucun code actif n'est enregistré ici.
const SOURCE_URL = 'https://dayzaide.fr/Template/Nasdara.php';
const MAP_URL = 'https://dayzaide.fr/Cartes/Index_Cartes.php?map=nasdara';

const BUNKERS = Object.freeze([
  ['072106', 'Basement Civilian', 7216, 5707],
  ['091044', 'Basement Civilian', 9168, 11946],
  ['112067', 'Basement Civilian', 11204, 9662],
  ['067058', 'Basement Medical', 6797, 10515],
  ['076076', 'Basement Medical', 7630, 8752],
  ['107123', 'Basement Medical', 10743, 4028],
  ['114053', 'Basement Medical', 11495, 11023],
  ['045055', 'Basement Storage', 4584, 10884],
  ['073090', 'Basement Storage', 7382, 7383],
  ['085115', 'Basement Storage', 8542, 4795],
  ['088112', 'Basement Storage', 8830, 5133],
  ['100121', 'Basement Storage', 10088, 4239],
  ['104083', 'Basement Storage', 10420, 8056],
  ['105102', 'Basement Storage', 10556, 6135],
  ['109086', 'Basement Storage', 10959, 7783],
  ['038066', 'Shelter Medical', 3862, 9775],
  ['087088', 'Shelter Medical', 8742, 7561],
  ['133021', 'Shelter Medical', 13323, 14238],
  ['065090', 'Shelter Office', 6560, 7362],
  ['028100', 'Shelter Storage', 2863, 6382],
  ['057074', 'Shelter Storage', 5719, 8970],
  ['067124', 'Shelter Storage', 6714, 3981],
  ['096109', 'Shelter Storage', 9634, 5441]
].map(([grid, type, x, z]) => Object.freeze({ grid, type, x, z })));

const ANTENNAS = Object.freeze([
  ['TC6', 5879, 7132],
  ['TC6', 9617, 4187],
  ['TC6', 10487, 3808],
  ['TC6', 11647, 13192],
  ['TC1', 9588, 4178],
  ['TC1', 10462, 3790],
  ['TC1', 11616, 13189],
  ['TC1', 6997, 11805],
  ['TC5', 10391, 3814],
  ['TC5', 2570, 5510],
  ['Bâtiment radio', 10409, 3836]
].map(([type, x, z]) => Object.freeze({ type, x, z })));

const MORSE_DIGITS = Object.freeze({
  '-----':'0', '.----':'1', '..---':'2', '...--':'3', '....-':'4',
  '.....':'5', '-....':'6', '--...':'7', '---..':'8', '----.':'9'
});

function normalizePosition(value) {
  const raw = String(value ?? '').trim();
  if (!/^(?:\d{6}|\d{3}\s+\d{3})$/.test(raw)) throw new Error('Position attendue : 6 chiffres, par exemple 100121 ou 100 121.');
  return raw.replace(/\s/g, '');
}

function findBunker(position) {
  const grid = normalizePosition(position);
  return BUNKERS.find(b => b.grid === grid) || null;
}

function decodeTransmission(signal) {
  const raw = String(signal ?? '').trim();
  if (!raw || raw.length > 300) throw new Error('Saisis les 6 ou 10 chiffres captés, ou du Morse (. et - séparés par des espaces).');

  let digits;
  if (/^[\d\s]+$/.test(raw)) {
    digits = raw.replace(/\s/g, '');
  } else if (/^[.\-\s/]+$/.test(raw)) {
    const symbols = raw.split(/[\s/]+/).filter(Boolean);
    if (symbols.length === 0) throw new Error('Transmission Morse vide.');
    digits = symbols.map(s => {
      if (!Object.prototype.hasOwnProperty.call(MORSE_DIGITS, s)) {
        throw new Error('Morse invalide : chaque chiffre doit avoir 5 points/traits, séparés par un espace.');
      }
      return MORSE_DIGITS[s];
    }).join('');
  } else {
    throw new Error('Format invalide : utilise seulement des chiffres ou du Morse avec . - espaces et /.');
  }

  if (!/^(?:\d{6}|\d{10})$/.test(digits)) {
    throw new Error('Signal incomplet : 6 chiffres de position, suivis éventuellement de 4 chiffres de cadenas.');
  }
  return {
    digits,
    position: digits.slice(0, 6),
    code: digits.length === 10 ? digits.slice(6) : null,
    bunker: findBunker(digits.slice(0, 6))
  };
}

module.exports = { SOURCE_URL, MAP_URL, BUNKERS, ANTENNAS, MORSE_DIGITS, normalizePosition, findBunker, decodeTransmission };
