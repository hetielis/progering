'use strict';

/* =====================================================================
   SEADISTUS – muuda siin!
   Vali, milliseid kiirklahve lapsed õpivad. Kustuta tähti, mida ei taha.
     'a' = vali kõik   'c' = kopeeri   'v' = kleebi
     'x' = lõika       'z' = võta tagasi   'f' = otsi
   (Kleepimise ja lõikamise tunnis kasutatakse ka Ctrl+C / Ctrl+V-d.)
   ===================================================================== */
const AKTIIVSED = ['a', 'c', 'v', 'x', 'z', 'f'];
const KIIRMANG_SEES = true;   // kas lõpus on kiirmäng?
const KIIRMANG_VOORE = 10;    // mitu ülesannet kiirmängus
/* ===================================================================== */

const IS_MAC = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
const MOD = IS_MAC ? '⌘' : 'Ctrl';
const MOD_LONG = IS_MAC ? '⌘ Cmd' : 'Ctrl';
const ORDER = ['a', 'c', 'v', 'x', 'z', 'f'];
const ACTIVE = ORDER.filter(k => AKTIIVSED.includes(k));

const $ = (s, r = document) => r.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rnd = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim().replace(/^[.,!?:;„“"]+|[.,!?:;„“"]+$/g, '').trim();
const short = t => { t = String(t).replace(/\s+/g, ' ').trim(); return t.length > 28 ? t.slice(0, 26) + '…' : t; };
const starsHtml = n => `<span class="stars">${[0, 1, 2].map(i => `<span class="${i < n ? 'on' : ''}">★</span>`).join('')}</span>`;

// {c} tekstis -> klahvikombinatsioon
const fmt = t => t.replace(/\{([a-z])\}/g, (_, k) =>
  `<span class="kbd-pair"><span class="kbd">${MOD}</span>+<span class="kbd">${k.toUpperCase()}</span></span>`);
const caps = (k, small) =>
  `<div class="combo${small ? ' small' : ''}"><span class="kc mod">${MOD_LONG}</span><span class="plus">+</span><span class="kc" data-k="${k}">${k.toUpperCase()}</span></div>`;

const MASCOT = `<svg class="mascot" viewBox="0 0 100 120" aria-hidden="true">
  <path d="M50 22 C50 6 70 12 74 2" fill="none" stroke="#2b2d42" stroke-width="4" stroke-linecap="round"/>
  <rect x="16" y="20" width="68" height="94" rx="34" fill="#fff" stroke="#2b2d42" stroke-width="4"/>
  <path d="M50 22 V54 M18 54 H82" stroke="#2b2d42" stroke-width="3" fill="none"/>
  <rect x="45" y="30" width="10" height="16" rx="5" fill="var(--c)"/>
  <g class="eyes"><circle cx="38" cy="72" r="5.5" fill="#2b2d42"/><circle cx="62" cy="72" r="5.5" fill="#2b2d42"/></g>
  <ellipse cx="29" cy="84" rx="6" ry="3.5" fill="#ffb3c7"/><ellipse cx="71" cy="84" rx="6" ry="3.5" fill="#ffb3c7"/>
  <path d="M41 86 Q50 96 59 86" fill="none" stroke="#2b2d42" stroke-width="3.5" stroke-linecap="round"/>
</svg>`;

/* ===================== LUGU OTSIMISE TUNNI JAOKS ===================== */
const STORY = [
  'Draakon Bruno elas väikeses majas mäe otsas. Igal hommikul ärkas Bruno kell seitse ja pesi hambaid. Tal oli sada kaheksa hammast, nii et see võttis kaua aega.',
  'Pärast hommikusööki läks Bruno metsa jalutama. Metsas elasid tema sõbrad: siil, jänes ja üks väga jutukas vares. Vares rääkis alati ilmast. „Täna sajab kindlasti vihma!“ ütles vares. Aga päike paistis.',
  'Lõunaks tegi Bruno suppi. Ta pani potti porgandit, kartulit ja natuke tuld. Draakonid keedavad suppi oma hingeõhuga.',
  'Pärastlõunal läks Bruno poodi. Ta ostis uue mütsi, sest vana müts oli ära põlenud. Uus müts oli lilla ja täpiline. Müüja küsis: „Kas soovite ka rohelist salli?“ Bruno ütles, et kollane sall on tal juba olemas.',
  'Õhtul luges Bruno raamatut ja sõi oma lemmik toitu – vahvleid maasikamoosiga. Raamatus oli juttu printsessist, kes kartis pimedust. Bruno arvas, et see on naljakas, sest tema ise kartis ainult hiiri.',
  'Kell üheksa läks Bruno magama ja norskas nii kõvasti, et vares kukkus oksalt alla.',
];
const reFor = q => { const t = q.trim(); return t ? new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi') : null; };
const countIn = q => { const re = reFor(q); return re ? STORY.join(' ').match(new RegExp(re.source, 'gi'))?.length || 0 : 0; };

/* ===================== ÕPPETUNNID =====================
   Igal tunnil on 3 ülesannet. Ülesandes:
   say  – mida maskott ütleb      wins – aknad (ro = ainult lugemiseks)
   done – millal on tehtud        ok   – kiitus
   progress – vahepealsed vihjed  demo – „Vaata, kuidas käib“ sammud
   ====================================================== */
const L = {
  /* ---------- Ctrl + A ---------- */
  a: {
    name: 'Vali kõik', color: '#6d5dfc', what: 'Teeb kogu teksti siniseks.',
    tasks: [
      {
        say: 'Klõpsa teksti sisse ja tee KÕIK siniseks: {a}',
        wins: [{ id: 't', title: 'Kiri vanaemale.txt', ro: true, text: 'Kallis vanaema!\n\nMeil läheb hästi. Koer õppis ise ust lahti tegema ja sõi ära kõik pannkoogid. Kass on selle peale väga solvunud ja ei räägi koeraga.\n\nMusid!' }],
        done: c => c.ev.selAll > 0 && c.allSel('t'),
        ok: () => 'Kõik on sinine! Nii lihtne see ongi.',
        demo: [['say', 'Kõigepealt klõpsa teksti sisse…'], ['caret', 't', 0], ['wait', 700], ['say', '…ja siis {a}'], ['keys', 'a']],
      },
      {
        say: 'Ohh, kui igav jutt! Vali kõik ({a}) ja kustuta see <b>Delete</b> klahviga.',
        wins: [{ id: 't', title: 'Igav jutt.txt', text: 'Bla bla bla. See on maailma kõige igavam tekst. Bla bla. Siin ei juhtu mitte midagi. Bla bla bla bla. Haigutus. Bla.' }],
        done: c => c.val('t').trim() === '',
        ok: c => (c.ev.selAll ? 'Puhas leht! Igav jutt on kadunud.' : 'Kadus! Aga {a} ja Delete on palju kiirem.'),
        demo: [['caret', 't', 0], ['say', 'Vali kõik: {a}'], ['keys', 'a'], ['wait', 600], ['say', 'Nüüd vajuta <b>Delete</b>'], ['del']],
      },
      {
        say: 'Vali kõik ({a}) ja kirjuta asemele oma nimi.',
        wins: [{ id: 't', title: 'Minu nimi.txt', text: 'Siia tuleb sinu nimi' }],
        debounce: 1300,
        done: c => c.ev.selAll > 0 && !/siia tuleb/i.test(c.val('t')) && c.val('t').trim().length >= 2,
        ok: c => `Tere, <b>${esc(short(c.val('t')))}</b>! Väga hea!`,
        progress: (c, type) => (type === 'input' && !c.ev.selAll && !/siia tuleb sinu nimi/i.test(c.val('t')) ? 'Proovi nii: {a} ja siis kirjuta. Vana tekst kaob ise ära!' : null),
        demo: [['caret', 't', 0], ['keys', 'a'], ['wait', 500], ['say', 'Kui kõik on sinine, kirjuta lihtsalt otsa!'], ['type', 'Klõps']],
      },
    ],
  },

  /* ---------- Ctrl + C ---------- */
  c: {
    name: 'Kopeeri', color: '#0095d6', what: 'Jätab sinise teksti arvuti mällu.',
    tasks: [
      {
        say: 'Tee sõna <b>komm</b> siniseks (nipp: topeltklõps!) ja kopeeri: {c}',
        wins: [{ id: 't', title: 'Plaan.txt', ro: true, text: 'Võta üks komm ja pane see taskusse.\nÄra ütle emmele!' }],
        done: c => norm(c.ev.last) === 'komm',
        ok: () => '„komm“ on nüüd arvuti mälus! Vaata alla.',
        progress: (c, type) => (type === 'copy' ? `Kopeerisid „${esc(short(c.ev.last))}“. Aga vaja on „komm“!` : null),
        demo: [['say', 'Tee sõna siniseks…'], ['drag', 't', 'komm'], ['say', '…ja vajuta {c}'], ['keys', 'c']],
      },
      {
        say: 'Lohista hiirega üle lause <b>Mu koer oskab lennata.</b> ja kopeeri: {c}',
        wins: [{ id: 't', title: 'Saladus.txt', ro: true, text: 'Tere! Mu koer oskab lennata. Ta sööb ainult pitsat ja magab katusel.' }],
        done: c => norm(c.ev.last) === 'mu koer oskab lennata',
        ok: () => 'Terve lause on mälus!',
        progress: (c, type) => (type === 'copy' ? `Mälus on „${esc(short(c.ev.last))}“. Proovi uuesti – terve lause!` : null),
        demo: [['say', 'Hoia hiirenuppu all ja lohista…'], ['drag', 't', 'Mu koer oskab lennata.'], ['say', '…ja vajuta {c}'], ['keys', 'c']],
      },
      {
        say: 'Kopeeri robotite salakood (see on teisel real): {c}',
        wins: [{ id: 't', title: 'Salajane.txt', ro: true, text: 'Robotite salakood on:\nKARTUL-42\nÄra ütle seda kellelegi!' }],
        done: c => norm(c.ev.last) === 'kartul-42',
        ok: () => 'Salakood on mälus. Pssst!',
        progress: (c, type) => (type === 'copy' ? `Mälus on „${esc(short(c.ev.last))}“. Salakood on teisel real!` : null),
        demo: [['drag', 't', 'KARTUL-42'], ['keys', 'c']],
      },
    ],
  },

  /* ---------- Ctrl + V ---------- */
  v: {
    name: 'Kleebi', color: '#f0457f', what: 'Paneb mälus oleva teksti sinna, kus vilgub kursor.',
    tasks: [
      {
        say: 'Kopeeri <b>pannkook</b> ({c}), klõpsa paremas aknas teksti lõppu ja kleebi: {v}',
        wins: [
          { id: 'a', title: 'Sõnad.txt', ro: true, text: 'pannkook' },
          { id: 'b', title: 'Minu lemmiktoit.txt', text: 'Minu lemmiktoit on ' },
        ],
        done: c => c.ev.paste > 0 && /pannkook/i.test(c.val('b')),
        ok: () => 'Mmm, pannkook! Kleepimine töötab.',
        progress: (c, type) => (type === 'copy' && norm(c.ev.last) === 'pannkook' ? 'Hästi! Nüüd klõpsa paremas aknas teksti lõppu ja {v}' : null),
        demo: [['say', 'Kopeeri sõna…'], ['drag', 'a', 'pannkook'], ['keys', 'c'], ['say', 'Klõpsa sinna, kuhu tahad panna…'], ['caret', 'b', 'end'], ['wait', 500], ['say', '…ja {v}'], ['keys', 'v']],
      },
      {
        say: 'Kopeeri <b>hihii</b> üks kord ja kleebi see paremale <b>5 korda</b>!',
        wins: [
          { id: 'a', title: 'Naer.txt', ro: true, text: 'hihii' },
          { id: 'b', title: 'Naerupall.txt', text: '' },
        ],
        done: c => c.count('b', 'hihii') >= 5 && c.ev.paste >= 2,
        ok: () => 'Hihiihihiihihii! Kopeerid ühe korra – kleebid nii palju kui tahad.',
        progress: (c, type) => (type === 'paste' || type === 'input') && c.count('b', 'hihii') ? `${c.count('b', 'hihii')} / 5 – veel! {v}` : null,
        progressMood: 'ok',
        demo: [['drag', 'a', 'hihii'], ['keys', 'c'], ['caret', 'b', 'end'], ['keys', 'v'], ['keys', 'v'], ['keys', 'v'], ['say', 'Iga {v} paneb uue!']],
      },
      {
        say: 'Ehita naljakas lause! Kopeeri sõnu vasakult ja kleebi paremale. Vähemalt <b>3 tükki</b>.',
        wins: [
          { id: 'a', title: 'Sõnapank.txt', ro: true, text: 'Minu õpetaja\non tegelikult\nkaamel\nsalaagent\nja sööb\nsokke\nkomme\nhommikuks' },
          { id: 'b', title: 'Naljakas lause.txt', text: '' },
        ],
        debounce: 1500,
        done: c => c.ev.paste >= 3 && c.bank('a', 'b') >= 3,
        ok: c => `„${esc(c.val('b').replace(/\s+/g, ' ').trim())}“ – haha!`,
        progress: (c, type) => (type === 'paste' || type === 'input') && c.bank('a', 'b') ? `${Math.min(c.bank('a', 'b'), 3)} / 3 – jätka!` : null,
        progressMood: 'ok',
        demo: [['drag', 'a', 'Minu õpetaja'], ['keys', 'c'], ['caret', 'b', 'end'], ['keys', 'v'], ['type', ' '],
          ['drag', 'a', 'on tegelikult'], ['keys', 'c'], ['caret', 'b', 'end'], ['keys', 'v'], ['type', ' '],
          ['drag', 'a', 'kaamel'], ['keys', 'c'], ['caret', 'b', 'end'], ['keys', 'v']],
      },
    ],
  },

  /* ---------- Ctrl + X ---------- */
  x: {
    name: 'Lõika', color: '#ff7a00', what: 'Võtab sinise teksti ära ja paneb mällu.',
    tasks: [
      {
        say: 'Kassid ei söö kive! Tee <b>kivid</b> siniseks ja lõika välja: {x}',
        wins: [{ id: 't', title: 'Kassi menüü.txt', text: 'Kassi lemmiktoidud:\nkala\npiim\nkivid\nvorst' }],
        done: c => c.ev.cut > 0 && !/kivid/i.test(c.val('t')),
        ok: () => 'Kivid on läinud! Kass on õnnelik.',
        progress: (c, type) => (type === 'cut' && /kivid/i.test(c.val('t')) ? `Lõikasid „${esc(short(c.ev.last))}“. Tagasi saad {z} – proovi uuesti!` : null),
        demo: [['drag', 't', 'kivid'], ['say', 'Nüüd {x}'], ['keys', 'x']],
      },
      {
        say: 'Porgand on vales aknas! Lõika see ({x}) ja kleebi ({v}) juurviljade juurde.',
        wins: [
          { id: 'a', title: 'Puuviljad.txt', text: 'õun\nporgand\nbanaan\npirn' },
          { id: 'b', title: 'Juurviljad.txt', text: 'kartul\nkaalikas\n' },
        ],
        done: c => c.ev.cut > 0 && !/porgand/i.test(c.val('a')) && /porgand/i.test(c.val('b')),
        ok: () => 'Porgand on õiges kohas!',
        progress: (c, type) => (type === 'cut' && norm(c.ev.last) === 'porgand' ? 'Porgand on mälus! Klõpsa paremas aknas lõppu ja {v}' : null),
        demo: [['drag', 'a', 'porgand'], ['keys', 'x'], ['caret', 'b', 'end'], ['wait', 400], ['keys', 'v']],
      },
      {
        say: 'Retsept on sassis! Esimene rida peab olema <b>kõige lõpus</b>. Lõika see ja kleebi lõppu.',
        wins: [{ id: 't', title: 'Pannkoogid.txt', text: 'Söö pannkook ära!\nTee tainas.\nPrae pannil.\n' }],
        done: c => c.ev.cut > 0 && c.lines('t').join('|') === 'tee tainas|prae pannil|söö pannkook ära',
        ok: () => 'Nüüd on retsept õiges järjekorras!',
        progress: (c, type) => (type === 'cut' ? 'Rida on mälus! Klõpsa kõige lõppu ja {v}' : null),
        demo: [['drag', 't', 'Söö pannkook ära!\n'], ['keys', 'x'], ['caret', 't', 'end'], ['wait', 400], ['keys', 'v']],
      },
    ],
  },

  /* ---------- Ctrl + Z ---------- */
  z: {
    name: 'Võta tagasi', color: '#10a99a', what: 'Võtab viimase muudatuse tagasi.',
    tasks: [
      {
        say: 'Sa kirjutasid luuletuse. Aga kes see seal tuleb…?',
        wins: [{ id: 't', title: 'Minu luuletus.txt', text: 'Mu kass on suur ja paks,\nta magab terve päeva.\nKui kõht on tühi tal,\nsiis karjub ta: Mjäu!' }],
        start: async api => { await api.wait(900); await api.cat('t', 1); api.say('Oi ei! Kass kõndis üle klaviatuuri! Võta tagasi: {z}', 'hint'); },
        done: c => c.ev.undo > 0 && c.orig('t'),
        ok: () => 'Luuletus on päästetud!',
        progress: (c, type) => (type === 'undo' ? 'Hästi! Veel {z}!' : null),
        demo: [['start'], ['say', 'Vajuta {z}'], ['keys', 'z']],
      },
      {
        say: 'Kustuta kõik ära: {a} ja <b>Delete</b>. Ära karda!',
        wins: [{ id: 't', title: 'Kodutöö.txt', text: 'Minu väga tähtis kodutöö:\n7 + 5 = 12\n9 + 9 = 18\n10 + 10 = 20' }],
        done: c => c.st.emptied && c.orig('t'),
        ok: () => 'Kodutöö on tagasi! Ctrl+Z päästab alati.',
        progress: (c, type) => {
          if (type === 'input' && c.val('t').trim() === '' && !c.st.emptied) { c.st.emptied = true; return 'Kõik kadus?! Päästa see: {z}'; }
          return null;
        },
        demo: [['caret', 't', 0], ['keys', 'a'], ['del'], ['say', 'Kõik kadus! Aga…'], ['wait', 600], ['say', '…{z} toob tagasi!'], ['keys', 'z']],
      },
      {
        say: 'Kass tuli tagasi! Seekord kolm korda…',
        wins: [{ id: 't', title: 'Päevik.txt', text: 'Täna läksin kooli.\nSõin lõunaks suppi.\nMängisin õues palli.' }],
        start: async api => { await api.wait(800); await api.cat('t', 3); api.say('Vajuta {z} mitu korda, kuni tekst on jälle korras.', 'hint'); },
        done: c => c.ev.undo > 0 && c.orig('t'),
        ok: () => 'Kõik korras! Iga {z} võtab ühe sammu tagasi.',
        progress: (c, type) => (type === 'undo' ? 'Hästi! Veel {z}!' : null),
        progressMood: 'ok',
        demo: [['start'], ['keys', 'z'], ['keys', 'z'], ['keys', 'z']],
      },
    ],
  },

  /* ---------- Ctrl + F ---------- */
  f: {
    name: 'Otsi', color: '#d99a00', what: 'Leiab pikast tekstist kiiresti sõna üles.',
    tasks: [
      {
        say: 'Mitu korda on loos nimi <b>Bruno</b>? Otsi: {f}',
        quiz: () => { const n = countIn('Bruno'); return { opts: shuffle([n - 2, n - 1, n, n + 1]), right: n }; },
        demo: [['say', 'Vajuta {f}'], ['keys', 'f'], ['typefind', 'Bruno'], ['say', 'Kõik leitud kohad on kollased. Arv on otsingukasti kõrval!'], ['findnext'], ['findnext']],
      },
      {
        say: 'Mis värvi on Bruno uus <b>müts</b>? Otsi: {f}',
        quiz: () => ({ opts: shuffle(['roheline', 'lilla', 'kollane']), right: 'lilla' }),
        demo: [['keys', 'f'], ['typefind', 'müts'], ['say', 'Enter viib järgmise leitud kohani'], ['findnext'], ['findnext']],
      },
      {
        say: 'Mis on Bruno <b>lemmik</b> toit? Otsi: {f}',
        quiz: () => ({ opts: shuffle(['supp', 'vahvlid', 'porgandid']), right: 'vahvlid' }),
        demo: [['keys', 'f'], ['typefind', 'lemmik']],
      },
    ],
  },
};
for (const k in L) L[k].tasks.forEach(t => { if (t.quiz) { t.wins = [{ id: 'd', title: 'Draakon Bruno.txt', doc: true }]; } });

/* ===================== MOOTOR ===================== */
const G = { screen: 'home', lesson: null, round: 0, task: null, busy: false, demo: false, token: 0, ev: null, st: {}, clip: '', sp: null, find: { i: 0 }, quiz: null };
let progress = (() => { try { return JSON.parse(localStorage.getItem('klahvikangelane') || '{}'); } catch { return {}; } })();
const save = () => { try { localStorage.setItem('klahvikangelane', JSON.stringify(progress)); } catch { /* pole hullu */ } };
const root = $('#app');
const TA = id => $(`.win[data-win="${id}"] .ta`);

function ctx() {
  const val = id => (TA(id) ? TA(id).value : '');
  const task = G.task;
  return {
    ev: G.ev, st: G.st, val,
    allSel: id => { const t = TA(id); return !!t && t.value.length > 0 && t.selectionStart === 0 && t.selectionEnd === t.value.length; },
    count: (id, w) => (val(id).toLowerCase().match(new RegExp(w, 'g')) || []).length,
    lines: id => val(id).split('\n').map(norm).filter(Boolean),
    orig: id => val(id) === task.wins.find(w => w.id === id).text,
    bank: (from, to) => { const v = norm(val(to)); return task.wins.find(w => w.id === from).text.split('\n').filter(p => v.includes(norm(p))).length; },
  };
}

function say(text, mood = '') {
  const b = $('.bubble'); if (!b) return;
  b.className = 'bubble';
  void b.offsetWidth;
  b.className = 'bubble ' + mood;
  b.innerHTML = fmt(text);
}
function jump() { const m = $('.talk .mascot'); if (!m) return; m.classList.remove('jump'); void m.getBoundingClientRect(); m.classList.add('jump'); }

/* ---------- avaleht ---------- */
function goHome() {
  G.token++; G.screen = 'home'; G.busy = false; G.demo = false; closeOverlay();
  document.body.classList.remove('demo-on');
  root.innerHTML = `
    <header class="home-head">
      <div class="mascot-big" style="--c:#6d5dfc">${MASCOT}</div>
      <h1 class="logo">Klahvi<span>kangelane</span></h1>
      <p class="sub">Õpi arvuti nippe – nagu päris arvutis!</p>
    </header>
    <div class="cards">
      ${ACTIVE.map(k => `<button class="card" style="--c:${L[k].color}" data-go="${k}">
        ${caps(k, true)}<h3>${L[k].name}</h3><div class="card-what">${L[k].what}</div>
        ${starsHtml(progress[k] || 0)}</button>`).join('')}
      ${KIIRMANG_SEES && ACTIVE.length ? `<button class="card card-speed" style="--c:#ff4d8d" data-go="speed">
        <div class="speed-ic">? ? ?</div><h3>Kiirmäng</h3><div class="card-what">Kui kiire sa oled?</div>
        ${starsHtml(progress.speed || 0)}</button>` : ''}
    </div>
    <p class="foot">Hoia all <span class="kbd">${MOD}</span> ja vajuta tähte</p>`;
}

/* ---------- õppetund ---------- */
function miniKb(k) {
  const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map(row =>
    `<div class="kb-row">${[...row].map(ch =>
      `<span class="k ${ch.toLowerCase() === k ? 'hot' : ''}" data-key="${ch.toLowerCase()}">${ch}</span>`).join('')}</div>`).join('');
  const bottom = IS_MAC
    ? '<span class="k">fn</span><span class="k">⌃</span><span class="k">⌥</span><span class="k wide hot k-mod">⌘</span><span class="k space"></span>'
    : '<span class="k wide hot k-mod">Ctrl</span><span class="k">⊞</span><span class="k">Alt</span><span class="k space"></span>';
  return `<div class="kb">${rows}<div class="kb-row">${bottom}</div></div><div class="kb-label">Kus need klahvid on?</div>`;
}

function openLesson(k) {
  closeOverlay();
  G.screen = 'lesson'; G.lesson = k; G.round = 0; G.busy = false; G.demo = false;
  document.body.classList.remove('demo-on');
  const les = L[k];
  root.innerHTML = `
    <div style="--c:${les.color}">
      <div class="topbar">
        <button class="btn" data-go="home">← Kodu</button>
        <div class="title">${les.name}</div>
        <div id="lstars">${starsHtml(0)}</div>
      </div>
      <div class="lesson">
        <aside class="side">
          ${caps(k)}
          <h2>${les.name}</h2>
          <p class="what">${les.what}</p>
          ${miniKb(k)}
          <button class="btn primary demo-btn" data-btn="demo">▶ Vaata, kuidas käib</button>
        </aside>
        <main>
          <div class="talk">${MASCOT}<div class="bubble"></div></div>
          <div id="stage"></div>
          ${['c', 'v', 'x'].includes(k) ? `<div class="clipbar"><span class="clip-lbl">Arvuti mälus on:</span>
            <span class="clip-chip"></span><span class="clip-note">${MOD}+C või ${MOD}+X paneb siia</span></div>` : ''}
        </main>
      </div>
    </div>`;
  showClip(false);
  startTask();
}

function renderStage() {
  const t = G.task;
  const stage = $('#stage');
  stage.innerHTML = `<div class="desk" style="--n:${t.wins.length}">${t.wins.map(w => `
    <div class="win" data-win="${w.id}">
      <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span>${w.title}
        ${w.ro ? '<span class="lock">ainult lugemiseks</span>' : ''}</div>
      ${w.doc ? `<div class="findbar"><input class="find-in" placeholder="Otsi…" autocomplete="off" spellcheck="false">
          <span class="find-count"></span><button class="fbtn" data-find="prev" title="Eelmine">▲</button>
          <button class="fbtn" data-find="next" title="Järgmine">▼</button><button class="fbtn" data-find="close" title="Sulge">✕</button></div>
        <div class="doc"></div>`
        : `<textarea class="ta" spellcheck="false" ${w.ro ? 'readonly' : ''}>${esc(w.text)}</textarea>`}
    </div>`).join('')}</div>
    ${t.quiz ? `<div class="quiz">${G.quiz.opts.map(o => `<button class="btn ans" data-ans="${esc(o)}">${esc(o)}</button>`).join('')}</div>` : ''}`;
  stage.querySelectorAll('.ta').forEach(bindTa);
  if (t.quiz) { G.find = { i: 0 }; renderDoc(''); }
}

async function startTask(prefix = '') {
  const les = L[G.lesson];
  const tok = ++G.token;
  G.task = les.tasks[G.round];
  G.ev = { copy: 0, cut: 0, paste: 0, undo: 0, selAll: 0, last: '' };
  G.st = {};
  G.quiz = G.task.quiz ? G.task.quiz() : null;
  renderStage();
  say(prefix + G.task.say);
  if (G.task.start) {
    G.busy = true;
    await G.task.start(mkApi(tok));
    if (tok === G.token) G.busy = false;
  }
}

function mkApi(tok) {
  const live = () => tok === G.token;
  return {
    say: (t, m) => live() && say(t, m),
    wait: ms => sleep(ms),
    cat: (id, n) => catMess(id, n, live),
  };
}

/* Kass kõnnib üle klaviatuuri: muudab teksti nii, et Ctrl+Z töötab päriselt */
const MESS = ['jjjjjjkkkkkllllll', 'ööööääääõõõõ', 'asdfghjjjjjj'];
async function catMess(id, n, live) {
  for (let i = 0; i < n; i++) {
    const ta = TA(id); if (!ta || !live()) return;
    const win = ta.closest('.win');
    const cat = document.createElement('div');
    cat.className = 'cat-walk'; cat.textContent = '🐈';
    win.appendChild(cat);
    await sleep(800);
    if (!live()) return;
    const words = [...ta.value.matchAll(/[A-Za-zÕÄÖÜõäöüŠšŽž]{3,}/g)];
    const m = words[rnd(words.length)];
    ta.focus();
    ta.setSelectionRange(m.index, m.index + m[0].length);
    document.execCommand('insertText', false, MESS[i % MESS.length]);
    await sleep(1000);
    cat.remove();
  }
}

/* ---------- tekstikastide sündmused (päris kopeeri/kleebi/lõika/tagasi) ---------- */
let debounceTimer;
function bindTa(ta) {
  const selText = () => ta.value.slice(ta.selectionStart, ta.selectionEnd);
  ta.addEventListener('copy', () => {
    const t = selText();
    if (!t) { hint('Märgi enne midagi sinisega! Lohista hiirega üle teksti.'); return; }
    G.ev.copy++; G.ev.last = t; setClip(t); check('copy');
  });
  ta.addEventListener('cut', () => {
    const t = selText();
    if (!t) { hint('Märgi enne midagi sinisega!'); return; }
    if (ta.readOnly) { hint('Sellest aknast ei saa lõigata – see on ainult lugemiseks.'); return; }
    G.ev.cut++; G.ev.last = t; setClip(t); check('cut');
  });
  ta.addEventListener('paste', () => {
    if (ta.readOnly) { hint('Siia aknasse ei saa kleepida. Klõpsa teise akna sisse!'); return; }
    G.ev.paste++; setTimeout(() => check('paste'), 0);
  });
  ta.addEventListener('input', e => {
    if (e.inputType === 'historyUndo') { G.ev.undo++; check('undo'); return; }
    if (e.inputType === 'insertFromPaste') return; // paste juba kontrollib
    check('input');
  });
  ta.addEventListener('keydown', e => {
    // Ctrl+A tekstikastis valib alati kogu teksti
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'a' || e.code === 'KeyA') && ta.value.length) {
      G.ev.selAll++;
      setTimeout(() => check('selAll'), 0);
    }
  });
}

function hint(t) { if (!G.demo) say(t, 'hint'); }

function check(type) {
  if (G.demo || G.busy || G.screen !== 'lesson') return;
  const t = G.task;
  const run = () => {
    if (G.demo || G.busy) return;
    const c = ctx();
    if (t.done && t.done(c)) { win(t.ok(c)); return; }
    const msg = t.progress && t.progress(c, type);
    if (msg) say(msg, t.progressMood || 'hint');
  };
  clearTimeout(debounceTimer);
  if (t.debounce && type === 'input') { debounceTimer = setTimeout(run, t.debounce); const c = ctx(); const msg = t.progress && t.progress(c, type); if (msg) say(msg, t.progressMood || 'hint'); }
  else run();
}

function setClip(t) { G.clip = t; showClip(true); }
function showClip(anim) {
  const chip = $('.clip-chip'); if (!chip) return;
  chip.className = 'clip-chip' + (G.clip ? '' : ' empty') + (anim ? ' pop' : '');
  chip.textContent = G.clip ? '„' + short(G.clip) + '“' : 'tühi';
}

/* ---------- otsimine ---------- */
function renderDoc(q) {
  const doc = $('.doc'); if (!doc) return 0;
  const re = reFor(q);
  let n = 0;
  doc.innerHTML = STORY.map(p => `<p>${re ? esc(p).replace(re, m => `<mark data-m="${n++}">${m}</mark>`) : esc(p)}</p>`).join('');
  if (G.find.i >= n) G.find.i = 0;
  const cur = doc.querySelector(`mark[data-m="${G.find.i}"]`);
  if (cur) { cur.classList.add('cur'); doc.scrollTop = cur.offsetTop - doc.clientHeight / 2; }
  $('.find-count').textContent = q.trim() ? (n ? `${G.find.i + 1}/${n}` : '0/0') : '';
  return n;
}
function openFind() {
  const bar = $('.findbar'); if (!bar) return;
  bar.classList.add('open');
  const inp = $('.find-in'); inp.focus(); inp.select();
}
function findStep(d) {
  const n = $('.doc').querySelectorAll('mark').length; if (!n) return;
  G.find.i = (G.find.i + d + n) % n;
  renderDoc($('.find-in').value);
}
function closeFind() { const bar = $('.findbar'); if (bar) { bar.classList.remove('open'); G.find.i = 0; renderDoc(''); } }

function answer(btn) {
  const ok = String(G.quiz.right) === btn.dataset.ans;
  if (ok) { btn.classList.add('primary'); win('Õige! Otsimine aitas.'); }
  else { btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake'); say('Ei ole päris nii… Otsi {f} abil ja loe hoolega!', 'hint'); }
}

/* ---------- võit ---------- */
async function win(msg) {
  if (G.demo || G.busy) return;
  G.busy = true;
  say(msg, 'ok'); jump();
  G.round++;
  $('#lstars').innerHTML = starsHtml(G.round);
  const tok = G.token;
  await sleep(2000);
  if (tok !== G.token) return;
  G.busy = false;
  if (G.round >= L[G.lesson].tasks.length) finishLesson();
  else startTask();
}

function finishLesson() {
  const k = G.lesson;
  progress[k] = 3; save();
  G.screen = 'done';
  const next = ACTIVE[ACTIVE.indexOf(k) + 1];
  const nextBtn = next
    ? `<button class="btn primary" data-go="${next}">Edasi: ${L[next].name} →</button>`
    : KIIRMANG_SEES ? '<button class="btn primary" data-go="speed">Kiirmäng →</button>' : '';
  showOverlay(`<h2>Super!</h2>${caps(k)}<p>${L[k].what}</p>${starsHtml(3)}
    <div class="win-btns"><button class="btn" data-go="home">Kodu</button>
      <button class="btn" data-go="${k}">Uuesti</button>${nextBtn}</div>`, L[k].color);
}

/* ---------- „Vaata, kuidas käib“ ---------- */
async function pressKeys(k) {
  setMod(true); await sleep(300);
  flashLetter(k, 350); echo(k); await sleep(400);
  setMod(false);
}

async function runDemo() {
  if (G.screen !== 'lesson' || G.busy || G.demo) return;
  const tok = ++G.token;
  const live = () => tok === G.token;
  G.demo = true;
  document.body.classList.add('demo-on');
  G.ev = { copy: 0, cut: 0, paste: 0, undo: 0, selAll: 0, last: '' };
  G.st = {};
  renderStage();
  say('Vaata, kuidas käib!');
  const active = () => document.activeElement;
  for (const [type, a, b] of G.task.demo) {
    await sleep(type === 'say' ? 200 : 750);
    if (!live()) return;
    if (type === 'say') { say(a); await sleep(500); }
    if (type === 'wait') await sleep(a);
    if (type === 'start') await G.task.start({ say: () => {}, wait: sleep, cat: (id, n) => catMess(id, n, live) });
    if (type === 'caret') { const ta = TA(a); ta.focus(); const p = b === 'end' ? ta.value.length : b; ta.setSelectionRange(p, p); ta.closest('.win').classList.add('pulse'); setTimeout(() => ta.closest('.win').classList.remove('pulse'), 600); }
    if (type === 'drag') {
      const ta = TA(a); const s = ta.value.indexOf(b); ta.focus();
      for (let i = 1; i <= b.length; i++) { ta.setSelectionRange(s, s + i); await sleep(Math.max(25, 500 / b.length)); }
    }
    if (type === 'type') for (const ch of a) { document.execCommand('insertText', false, ch); await sleep(120); }
    if (type === 'del') { await sleep(200); document.execCommand('delete'); }
    if (type === 'keys') {
      await pressKeys(a);
      const ta = active();
      const sel = ta && ta.value !== undefined ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : '';
      if (a === 'a') ta.select();
      if (a === 'c') setClip(sel);
      if (a === 'x') { setClip(sel); document.execCommand('delete'); }
      if (a === 'v') document.execCommand('insertText', false, G.clip);
      if (a === 'z') document.execCommand('undo');
      if (a === 'f') openFind();
    }
    if (type === 'typefind') {
      const inp = $('.find-in');
      for (const ch of a) { inp.value += ch; G.find.i = 0; renderDoc(inp.value); await sleep(150); }
    }
    if (type === 'findnext') { echoText('Enter'); findStep(1); }
  }
  await sleep(1800);
  if (!live()) return;
  G.demo = false;
  document.body.classList.remove('demo-on');
  startTask('Nüüd sina! ');
}

/* ---------- kiirmäng ---------- */
const VERB = { a: 'Vali kõik!', c: 'Kopeeri!', v: 'Kleebi!', x: 'Lõika!', z: 'Võta tagasi!', f: 'Otsi!' };
const pick = prev => { const pool = ACTIVE.length > 1 ? ACTIVE.filter(k => k !== prev) : ACTIVE; return pool[rnd(pool.length)]; };

function openSpeed() {
  closeOverlay();
  G.token++; G.screen = 'speed'; G.demo = false; G.busy = false;
  G.sp = { i: 0, total: KIIRMANG_VOORE, cur: pick(null), miss: 0, t0: Date.now(), shake: false, hint: false };
  renderSpeed();
}

function renderSpeed() {
  const sp = G.sp;
  root.innerHTML = `
    <div style="--c:#ff4d8d">
      <div class="topbar"><button class="btn" data-go="home">← Kodu</button><div class="title">Kiirmäng</div></div>
      <div class="speed">
        <div class="bar"><div style="width:${sp.i / sp.total * 100}%"></div></div>
        <div class="prompt ${sp.shake ? 'shake' : 'pop'}" style="--c:${L[sp.cur].color}">
          <div class="p-name">${VERB[sp.cur]}</div>
          <div class="p-hint">${sp.hint ? fmt(`Vihje: {${sp.cur}}`) : ''}</div>
        </div>
        <p class="p-q">Vajuta õiget kiirklahvi · ${sp.i + 1} / ${sp.total}</p>
      </div>
    </div>`;
}

function speedKey(k) {
  const sp = G.sp;
  if (k === sp.cur) {
    sp.i++;
    if (sp.i >= sp.total) return finishSpeed();
    sp.cur = pick(sp.cur); sp.shake = false; sp.hint = false;
  } else { sp.miss++; sp.shake = true; sp.hint = true; }
  renderSpeed();
}

function finishSpeed() {
  const sp = G.sp;
  const sec = Math.round((Date.now() - sp.t0) / 1000);
  const st = sp.miss <= 1 ? 3 : sp.miss <= 3 ? 2 : 1;
  progress.speed = Math.max(progress.speed || 0, st); save();
  G.screen = 'done';
  showOverlay(`<h2>Valmis!</h2>
    <p style="font-size:24px;color:var(--ink)">Aeg: <b>${sec} sek</b> · ${sp.miss ? 'vigu: <b>' + sp.miss + '</b>' : '<b>ühtegi viga!</b>'}</p>
    ${starsHtml(st)}
    <div class="win-btns"><button class="btn" data-go="home">Kodu</button>
      <button class="btn primary" data-go="speed">Veel kord</button></div>`, '#ff4d8d');
}

/* ---------- aken, konfetti, klahvide efektid ---------- */
function showOverlay(html, color) {
  closeOverlay();
  const o = document.createElement('div');
  o.className = 'overlay'; o.style.setProperty('--c', color);
  o.innerHTML = `<div class="win-box">${html}</div>`;
  document.body.appendChild(o);
  confetti();
}
function closeOverlay() { document.querySelectorAll('.overlay').forEach(o => o.remove()); }

function confetti() {
  const colors = ['#ff5d8f', '#6d5dfc', '#ffbe0b', '#10a99a', '#0095d6', '#ff7a00'];
  for (let i = 0; i < 90; i++) {
    const d = document.createElement('div');
    d.className = 'confetti';
    d.style.left = Math.random() * 100 + 'vw';
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = 2 + Math.random() * 2 + 's';
    d.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 5000);
  }
}

function setMod(down) { document.querySelectorAll('.kc.mod, .k-mod').forEach(el => el.classList.toggle('down', down)); }
function flashLetter(k, ms = 220) {
  const els = document.querySelectorAll(`.kc[data-k="${k}"], .k[data-key="${k}"]`);
  els.forEach(el => el.classList.add('down'));
  setTimeout(() => els.forEach(el => el.classList.remove('down')), ms);
}
let echoTimer;
function echoText(t) {
  const e = $('#echo');
  e.textContent = t;
  e.classList.add('show');
  clearTimeout(echoTimer);
  echoTimer = setTimeout(() => e.classList.remove('show'), 1000);
}
const echo = k => echoText(`${MOD} + ${k.toUpperCase()}  ·  ${L[k].name}`);

/* ---------- sündmused ---------- */
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { const g = go.dataset.go; if (g === 'home') goHome(); else if (g === 'speed') openSpeed(); else openLesson(g); return; }
  if (e.target.closest('[data-btn="demo"]')) { runDemo(); return; }
  if (G.screen !== 'lesson' || G.demo) return;
  const f = e.target.closest('[data-find]');
  if (f) { const a = f.dataset.find; if (a === 'close') closeFind(); else findStep(a === 'next' ? 1 : -1); return; }
  const ans = e.target.closest('[data-ans]');
  if (ans && !G.busy) answer(ans);
});

document.addEventListener('input', e => {
  if (!e.target.classList.contains('find-in') || G.demo) return;
  G.find.i = 0; renderDoc(e.target.value);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Control' || e.key === 'Meta') { setMod(true); return; }
  if (e.target.classList && e.target.classList.contains('find-in')) {
    if (e.key === 'Enter') { e.preventDefault(); findStep(e.shiftKey ? -1 : 1); return; }
    if (e.key === 'Escape') { closeFind(); return; }
  }
  if (!(e.ctrlKey || e.metaKey)) return;
  let k = (e.key || '').toLowerCase();
  if (!ORDER.includes(k) && e.code && e.code.startsWith('Key')) k = e.code.slice(3).toLowerCase();
  if (!ORDER.includes(k)) return;
  if (G.screen === 'speed') { e.preventDefault(); if (!e.repeat) { flashLetter(k); echo(k); speedKey(k); } return; }
  if (G.screen !== 'lesson') return;
  if (G.demo) { e.preventDefault(); return; }
  if (!e.repeat) { flashLetter(k); echo(k); }

  if (k === 'f') {
    e.preventDefault();
    if (G.lesson === 'f') openFind();
    else say('{f} on otsimine – seda õpid tunnis „Otsi“.', 'hint');
    return;
  }
  const inText = e.target.tagName === 'TEXTAREA' || (e.target.classList && e.target.classList.contains('find-in'));
  if (inText) return; // päris tekstikastis teeb brauser päris asja
  e.preventDefault();
  const tips = {
    a: 'Klõpsa enne teksti sisse, siis {a}',
    c: 'Märgi enne tekst sinisega, siis {c}',
    x: 'Märgi enne tekst sinisega, siis {x}',
    v: 'Klõpsa enne sinna, kuhu tahad kleepida, siis {v}',
    z: 'Klõpsa enne teksti sisse, siis {z}',
  };
  if (G.task && !G.task.quiz) say(tips[k], 'hint');
});
document.addEventListener('keyup', e => { if (e.key === 'Control' || e.key === 'Meta') setMod(false); });
window.addEventListener('blur', () => setMod(false));

goHome();