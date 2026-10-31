/*
 * ============================================================
 * BINAARLUKK — mängud avanevad alles pärast salakoodi lahendamist
 * ============================================================
 * Lisa see fail samasse kausta, kus on index.html, ja pane
 * index.html faili lõppu (PÄRAST suurt <script> plokki,
 * vahetult enne </body>) see rida:
 *
 *   <script src="binaarlukk.js"></script>
 *
 * Lapsed näevad kahendarvude rida ja tabelit. Iga kahendarv
 * tuleb muuta tavaliseks numbriks (0–9). Kui midagi on valesti,
 * tekib uus rida ja tuleb otsast alustada.
 */
(function () {
  "use strict";

  /* ---------------- ÕPETAJA SEADED ---------------- */
  const LUKK = {
    // Kood, mis tuleb välja kindla tõenäosusega (nt Kahooti PIN)
    eriKood: "670067",
    // 0.1 = 10% juhtudest on lahenduseks eriKood
    eriKoodiToenaosus: 0.1,
    // Mitu numbrit reas on (kehtib juhuslike ridade kohta)
    numbriteArv: 6
  };
  /* ------------------------------------------------ */

  const k = (typeof SEADED !== "undefined" && SEADED.kujundus) || {};
  const V = {
    roosa: k.aktiivneNupp || "#ce3696",
    tume: k.pealkiri || "#2f0750",
    roheline: k.kaardiPealkirjaTaust || "#c4ffbc",
    sinine: k.taust || "#b7deff"
  };

  const css = `
    #bl-lukk {
      position: fixed; inset: 0; z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 16px; overflow: auto;
      background: ${V.tume}e6;
      font-family: inherit;
    }
    #bl-lukk * { box-sizing: border-box; }
    .bl-kast {
      width: 100%; max-width: 820px; margin: auto;
      padding: 24px; border-radius: 26px;
      background: white; color: #333; text-align: center;
      border: 6px solid ${V.roosa};
      box-shadow: 0 12px 30px #0006;
    }
    .bl-kast h2 {
      margin: 0 0 6px; color: ${V.tume};
      font-size: clamp(1.6rem, 5vw, 2.4rem);
    }
    .bl-juhis { margin: 0 0 20px; font-size: 18px; font-weight: bold; color: #555; }
    .bl-sisu {
      display: flex; gap: 24px; align-items: flex-start;
      justify-content: center; flex-wrap: wrap;
    }
    .bl-tabel {
      border-collapse: separate; border-spacing: 0;
      border-radius: 16px; overflow: hidden;
      border: 3px solid ${V.tume}; font-size: 18px;
      flex: 0 0 auto;
    }
    .bl-tabel th {
      padding: 10px 16px; background: ${V.tume}; color: white;
    }
    .bl-tabel td {
      padding: 6px 16px; font-weight: bold;
      font-family: "Courier New", monospace; font-size: 20px;
    }
    .bl-tabel tbody tr:nth-child(odd) td { background: ${V.roheline}; }
    .bl-tabel tbody tr:nth-child(even) td { background: white; }
    .bl-tabel tbody tr:hover td { background: ${V.sinine}; }
    .bl-tabel td:first-child { border-right: 3px solid ${V.tume}; color: ${V.roosa}; }
    .bl-mang { flex: 1 1 340px; max-width: 460px; }
    .bl-rida {
      display: flex; flex-wrap: wrap; justify-content: center;
      gap: 10px; margin-bottom: 16px;
    }
    .bl-pesa {
      width: 66px; padding: 8px 4px; border-radius: 14px;
      background: ${V.sinine}; border: 3px solid ${V.tume};
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .bl-kahend {
      font-family: "Courier New", monospace; font-weight: bold;
      font-size: 19px; color: ${V.tume}; letter-spacing: 1px;
      min-height: 24px;
    }
    .bl-pesa input {
      width: 48px; height: 52px; text-align: center;
      font: inherit; font-size: 28px; font-weight: bold;
      border: 3px solid ${V.roosa}; border-radius: 10px;
      background: white; color: #333; outline: none;
    }
    .bl-pesa input:focus { box-shadow: 0 0 0 4px ${V.roosa}55; }
    .bl-pesa.vale { background: #ffb8b8; border-color: #d63031; }
    .bl-pesa.oige { background: ${V.roheline}; }
    #bl-teade { min-height: 28px; margin: 6px 0 12px; font-size: 18px; font-weight: bold; }
    #bl-nupp {
      width: 100%; padding: 14px 18px; border-radius: 14px;
      border: 3px solid ${V.roosa}; background: ${V.roosa}; color: white;
      font: inherit; font-size: 20px; font-weight: bold; cursor: pointer;
    }
    #bl-nupp:disabled { opacity: .6; cursor: default; }
    .bl-kood {
      margin: 6px 0 14px; font-size: clamp(2rem, 9vw, 3rem);
      font-weight: bold; letter-spacing: 6px; color: ${V.roosa};
    }
    .bl-raputa { animation: bl-raputa .45s; }
    @keyframes bl-raputa {
      0%, 100% { transform: translateX(0); }
      20%, 60% { transform: translateX(-10px); }
      40%, 80% { transform: translateX(10px); }
    }
  `;

  const stiil = document.createElement("style");
  stiil.textContent = css;
  document.head.append(stiil);

  const lukk = document.createElement("div");
  lukk.id = "bl-lukk";
  lukk.setAttribute("role", "dialog");
  lukk.setAttribute("aria-modal", "true");
  lukk.setAttribute("aria-labelledby", "bl-pealkiri");

  let tabeliRead = "";
  for (let i = 0; i <= 9; i++) {
    tabeliRead += `<tr><td>${i}</td><td>${i.toString(2)}</td></tr>`;
  }

  lukk.innerHTML = `
    <div class="bl-kast">
      <h2 id="bl-pealkiri"> SALAKOOD</h2>
      <p class="bl-juhis">
        Mängud on lukus! Muuda iga kahendarv tavaliseks numbriks.
        Tabel aitab sind.️
      </p>
      <div class="bl-sisu">
        <table class="bl-tabel">
          <thead><tr><th>Kümnendarv</th><th>Kahendarv</th></tr></thead>
          <tbody>${tabeliRead}</tbody>
        </table>
        <div class="bl-mang" id="bl-mang">
          <div class="bl-rida" id="bl-rida"></div>
          <p id="bl-teade" role="status"></p>
          <button id="bl-nupp" type="button">KONTROLLI ✔</button>
        </div>
      </div>
    </div>
  `;

  document.body.append(lukk);
  const vanaOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  const rida = lukk.querySelector("#bl-rida");
  const teade = lukk.querySelector("#bl-teade");
  const nupp = lukk.querySelector("#bl-nupp");
  const kast = lukk.querySelector(".bl-kast");

  let lahendus = [];
  let kontrollib = false;

  function uusRida() {
    if (Math.random() < LUKK.eriKoodiToenaosus) {
      lahendus = LUKK.eriKood.split("").map(Number);
    } else {
      lahendus = [];
      for (let i = 0; i < LUKK.numbriteArv; i++) {
        lahendus.push(Math.floor(Math.random() * 10));
      }
    }

    rida.replaceChildren();
    lahendus.forEach((arv, i) => {
      const pesa = document.createElement("div");
      pesa.className = "bl-pesa";

      const kahend = document.createElement("div");
      kahend.className = "bl-kahend";
      kahend.textContent = arv.toString(2);

      const sisend = document.createElement("input");
      sisend.type = "text";
      sisend.inputMode = "numeric";
      sisend.maxLength = 1;
      sisend.autocomplete = "off";
      sisend.setAttribute("aria-label", `Kahendarv ${arv.toString(2)} on kümnendarvuna`);

      sisend.addEventListener("input", () => {
        const numbrid = sisend.value.replace(/\D/g, "");
        sisend.value = numbrid.slice(-1);
        if (sisend.value) {
          const jargmine = rida.querySelectorAll("input")[i + 1];
          if (jargmine) jargmine.focus();
        }
      });

      sisend.addEventListener("keydown", e => {
        if (e.key === "Backspace" && !sisend.value) {
          const eelmine = rida.querySelectorAll("input")[i - 1];
          if (eelmine) eelmine.focus();
        } else if (e.key === "Enter") {
          kontrolli();
        }
      });

      pesa.append(kahend, sisend);
      rida.append(pesa);
    });

    const esimene = rida.querySelector("input");
    if (esimene) esimene.focus();
  }

  function kontrolli() {
    if (kontrollib) return;
    const sisendid = [...rida.querySelectorAll("input")];

    if (sisendid.some(s => s.value === "")) {
      teade.style.color = "#555";
      teade.textContent = "Täida enne kõik kastid!";
      return;
    }

    let koikOiged = true;
    sisendid.forEach((s, i) => {
      const oige = Number(s.value) === lahendus[i];
      s.parentElement.classList.add(oige ? "oige" : "vale");
      if (!oige) koikOiged = false;
    });

    if (koikOiged) {
      voit();
      return;
    }

    // Vale — näita hetkeks, mis läks valesti, siis uus rida
    kontrollib = true;
    nupp.disabled = true;
    sisendid.forEach(s => { s.disabled = true; });
    teade.style.color = "#d63031";
    teade.textContent = "Oi, päris õige ei olnud! Tuleb uus rida…";
    kast.classList.remove("bl-raputa");
    void kast.offsetWidth; // käivitab animatsiooni uuesti
    kast.classList.add("bl-raputa");

    setTimeout(() => {
      kontrollib = false;
      nupp.disabled = false;
      teade.style.color = "#555";
      teade.textContent = "Uus rida! Proovi uuesti!";
      uusRida();
    }, 1400);
  }

  function voit() {
    const kood = lahendus.join("");
    const mang = lukk.querySelector("#bl-mang");
    mang.innerHTML = `
      <p style="font-size:22px;font-weight:bold;margin:10px 0 0;color:${V.tume}">
        🎉 ÕIGE! Salakood on:
      </p>
      <div class="bl-kood">${kood}</div>
      <button id="bl-ava" type="button" style="
        width:100%;padding:14px 18px;border-radius:14px;
        border:3px solid ${V.roosa};background:${V.roosa};color:white;
        font:inherit;font-size:20px;font-weight:bold;cursor:pointer;">
        AVA MÄNGUD 🎮
      </button>
    `;
    const ava = mang.querySelector("#bl-ava");
    ava.focus();
    ava.addEventListener("click", () => {
      lukk.remove();
      document.body.style.overflow = vanaOverflow;
    });
  }

  nupp.addEventListener("click", kontrolli);
  uusRida();
})();