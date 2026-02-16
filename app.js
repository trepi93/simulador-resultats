const TEAMS = [
  "Disport FC",
  "Segunda Parte Elecnor",
  "Fundacion Intercity",
  "Hercules Paralimpico",
  "SD Eibar",
  "CD Amdda",
  "CD Tenerife PC"
];

const OFFICIAL_RESULTS = {
  "J1|Disport FC|CD Tenerife PC": [5, 1],
  "J1|Hercules Paralimpico|Segunda Parte Elecnor": [2, 2],
  "J1|Fundacion Intercity|CD Amdda": [1, 3],
  "J2|Fundacion Intercity|Segunda Parte Elecnor": [2, 2],
  "J2|CD Tenerife PC|Hercules Paralimpico": [1, 4],
  "J2|CD Amdda|SD Eibar": [3, 6],
  "J3|CD Amdda|Disport FC": [1, 9],
  "J3|CD Tenerife PC|Fundacion Intercity": [0, 5],
  "J3|SD Eibar|Segunda Parte Elecnor": [1, 3]
};

const FIXTURES = [
  {
    round: "J1",
    matches: [
      { home: "Disport FC", away: "CD Tenerife PC" },
      { home: "Hercules Paralimpico", away: "Segunda Parte Elecnor" },
      { home: "Fundacion Intercity", away: "CD Amdda" },
      { bye: "SD Eibar" }
    ]
  },
  {
    round: "J2",
    matches: [
      { home: "Fundacion Intercity", away: "Segunda Parte Elecnor" },
      { home: "CD Tenerife PC", away: "Hercules Paralimpico" },
      { home: "CD Amdda", away: "SD Eibar" },
      { bye: "Disport FC" }
    ]
  },
  {
    round: "J3",
    matches: [
      { home: "CD Amdda", away: "Disport FC" },
      { home: "CD Tenerife PC", away: "Fundacion Intercity" },
      { home: "SD Eibar", away: "Segunda Parte Elecnor" },
      { bye: "Hercules Paralimpico" }
    ]
  },
  {
    round: "J4",
    matches: [
      { home: "CD Amdda", away: "CD Tenerife PC" },
      { home: "SD Eibar", away: "Hercules Paralimpico" },
      { home: "Fundacion Intercity", away: "Disport FC" },
      { bye: "Segunda Parte Elecnor" }
    ]
  },
  {
    round: "J5",
    matches: [
      { home: "SD Eibar", away: "Disport FC" },
      { home: "Hercules Paralimpico", away: "CD Amdda" },
      { home: "Segunda Parte Elecnor", away: "CD Tenerife PC" },
      { bye: "Fundacion Intercity" }
    ]
  },
  {
    round: "J6",
    matches: [
      { home: "CD Tenerife PC", away: "SD Eibar" },
      { home: "Hercules Paralimpico", away: "Fundacion Intercity" },
      { home: "Disport FC", away: "Segunda Parte Elecnor" },
      { bye: "CD Amdda" }
    ]
  },
  {
    round: "J7",
    matches: [
      { home: "SD Eibar", away: "Fundacion Intercity" },
      { home: "Hercules Paralimpico", away: "Disport FC" },
      { home: "Segunda Parte Elecnor", away: "CD Amdda" },
      { bye: "CD Tenerife PC" }
    ]
  }
];

const state = {
  results: new Map(),
  fairplay: new Map()
};
const NEUTRAL_GOAL_LAMBDA = 2.3;

for (const [k, v] of Object.entries(OFFICIAL_RESULTS)) {
  state.results.set(k, [...v]);
}
for (const team of TEAMS) {
  state.fairplay.set(team, 0);
}

const fixturesRoot = document.getElementById("fixtures-root");
const standingsBody = document.querySelector("#standings-table tbody");
const probBody = document.querySelector("#prob-table tbody");
const simCountInput = document.getElementById("sim-count");
const fairplayRoot = document.getElementById("fairplay-root");
const tiebreakRoot = document.getElementById("tiebreak-root");

function keyFor(round, home, away) {
  return `${round}|${home}|${away}`;
}

function cloneTableBase() {
  const out = {};
  for (const team of TEAMS) {
    out[team] = {
      team,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
      dg: 0,
      gfKey: 0,
      dgKey: 0,
      pts: 0
    };
  }
  return out;
}

function applyResult(table, home, away, hg, ag) {
  const h = table[home];
  const a = table[away];
  const cappedDiff = Math.max(-10, Math.min(10, hg - ag));

  h.pj += 1;
  a.pj += 1;
  h.gf += hg;
  h.gc += ag;
  a.gf += ag;
  a.gc += hg;
  h.dg += cappedDiff;
  a.dg -= cappedDiff;

  if (hg > ag) {
    h.pg += 1;
    a.pp += 1;
    h.pts += 3;
  } else if (hg < ag) {
    a.pg += 1;
    h.pp += 1;
    a.pts += 3;
  } else {
    h.pe += 1;
    a.pe += 1;
    h.pts += 1;
    a.pts += 1;
  }
}

function computeHeadToHeadMap(teamNames, resultMap) {
  const teamSet = new Set(teamNames);
  const mini = cloneTableBase();
  for (const round of FIXTURES) {
    for (const match of round.matches) {
      if (match.bye) continue;
      if (!teamSet.has(match.home) || !teamSet.has(match.away)) continue;
      const k = keyFor(round.round, match.home, match.away);
      const score = resultMap.get(k);
      if (!score) continue;
      applyResult(mini, match.home, match.away, score[0], score[1]);
    }
  }
  return mini;
}

function compareBase(a, b) {
  return (
    b.pts - a.pts ||
    b.dgKey - a.dgKey ||
    b.gfKey - a.gfKey
  );
}

function compareHeadToHead(a, b, h2hMap) {
  const ah = h2hMap[a.team];
  const bh = h2hMap[b.team];
  return (
    bh.pts - ah.pts ||
    bh.dg - ah.dg ||
    bh.gf - ah.gf
  );
}

function compareFairPlay(a, b) {
  const afp = state.fairplay.get(a.team) || 0;
  const bfp = state.fairplay.get(b.team) || 0;
  return afp - bfp;
}

function decideGroupCriterion(group, h2hMap) {
  const samePts = group.every((r) => r.pts === group[0].pts);
  if (!samePts) return "Puntos";

  const sameDgKey = group.every((r) => r.dgKey === group[0].dgKey);
  if (!sameDgKey) return "DG de criterio";

  const sameGfKey = group.every((r) => r.gfKey === group[0].gfKey);
  if (!sameGfKey) return "GF de criterio";

  const sameH2hPts = group.every((r) => h2hMap[r.team].pts === h2hMap[group[0].team].pts);
  if (!sameH2hPts) return "Enfrentamientos directos: puntos";

  const sameH2hDg = group.every((r) => h2hMap[r.team].dg === h2hMap[group[0].team].dg);
  if (!sameH2hDg) return "Enfrentamientos directos: DG";

  const sameH2hGf = group.every((r) => h2hMap[r.team].gf === h2hMap[group[0].team].gf);
  if (!sameH2hGf) return "Enfrentamientos directos: GF";

  const fp0 = state.fairplay.get(group[0].team) || 0;
  const sameFp = group.every((r) => (state.fairplay.get(r.team) || 0) === fp0);
  if (!sameFp) return "Fair Play";

  return "Orden alfabetico (empate total)";
}

function sortWithTieBreakers(rows, resultMap, includeDetails = false) {
  const ordered = [...rows].sort((a, b) => compareBase(a, b) || a.team.localeCompare(b.team));
  const tieGroups = [];

  let i = 0;
  while (i < ordered.length) {
    let j = i + 1;
    while (j < ordered.length && ordered[i].pts === ordered[j].pts) {
      j += 1;
    }

    if (j - i > 1) {
      const group = ordered.slice(i, j);
      const h2hMap = computeHeadToHeadMap(group.map((r) => r.team), resultMap);
      const decidedBy = decideGroupCriterion(group, h2hMap);
      group.sort((a, b) =>
        compareBase(a, b) ||
        compareHeadToHead(a, b, h2hMap) ||
        compareFairPlay(a, b) ||
        a.team.localeCompare(b.team)
      );
      ordered.splice(i, group.length, ...group);

      if (includeDetails) {
        tieGroups.push({
          teams: group.map((r) => ({
            team: r.team,
            pts: r.pts,
            dg: r.dg,
            gf: r.gf,
            dgKey: r.dgKey,
            gfKey: r.gfKey,
            h2hPts: h2hMap[r.team].pts,
            h2hDg: h2hMap[r.team].dg,
            h2hGf: h2hMap[r.team].gf,
            fp: state.fairplay.get(r.team) || 0
          })),
          order: group.map((r) => r.team),
          decidedBy
        });
      }
    }
    i = j;
  }

  return { rows: ordered, tieGroups };
}

function buildRemainingMatchesMap(resultMap) {
  const remaining = {};
  for (const t of TEAMS) remaining[t] = 0;

  for (const round of FIXTURES) {
    for (const match of round.matches) {
      if (match.bye) continue;
      const k = keyFor(round.round, match.home, match.away);
      if (!resultMap.has(k)) {
        remaining[match.home] += 1;
        remaining[match.away] += 1;
      }
    }
  }
  return remaining;
}

function buildPlayoffContenderSet(rows, resultMap) {
  const remaining = buildRemainingMatchesMap(resultMap);
  const maxPtsByTeam = {};
  for (const row of rows) {
    maxPtsByTeam[row.team] = row.pts + (remaining[row.team] || 0) * 3;
  }
  const contenders = new Set();

  for (const row of rows) {
    const maxPts = maxPtsByTeam[row.team];
    let teamsCertainlyAbove = 0;
    for (const other of rows) {
      if (other.team === row.team) continue;
      if (other.pts > maxPts) teamsCertainlyAbove += 1;
    }

    const mathematicallyAlive = teamsCertainlyAbove < 4;
    if (mathematicallyAlive) {
      contenders.add(row.team);
    }
  }
  return contenders;
}

function applyCriteriaGoalMetrics(rows, resultMap) {
  const byTeam = {};
  rows.forEach((r) => {
    r.dgKey = 0;
    r.gfKey = 0;
    byTeam[r.team] = r;
  });

  const contenders = buildPlayoffContenderSet(rows, resultMap);
  for (const round of FIXTURES) {
    for (const match of round.matches) {
      if (match.bye) continue;
      const k = keyFor(round.round, match.home, match.away);
      const score = resultMap.get(k);
      if (!score) continue;

      const hg = score[0];
      const ag = score[1];
      const cappedDiff = Math.max(-10, Math.min(10, hg - ag));

      if (contenders.has(match.away)) {
        byTeam[match.home].gfKey += hg;
        byTeam[match.home].dgKey += cappedDiff;
      }
      if (contenders.has(match.home)) {
        byTeam[match.away].gfKey += ag;
        byTeam[match.away].dgKey -= cappedDiff;
      }
    }
  }
}

function computeStandings(resultMap, includeDetails = false) {
  const table = cloneTableBase();
  for (const round of FIXTURES) {
    for (const match of round.matches) {
      if (match.bye) continue;
      const k = keyFor(round.round, match.home, match.away);
      const score = resultMap.get(k);
      if (!score) continue;
      applyResult(table, match.home, match.away, score[0], score[1]);
    }
  }
  const rows = Object.values(table);
  applyCriteriaGoalMetrics(rows, resultMap);
  return sortWithTieBreakers(rows, resultMap, includeDetails);
}

function renderStandings() {
  const { rows, tieGroups } = computeStandings(state.results, true);
  standingsBody.innerHTML = "";

  rows.forEach((row, idx) => {
    const tr = document.createElement("tr");
    const fp = state.fairplay.get(row.team) || 0;
    tr.innerHTML = `
      <td class="num">${idx + 1}</td>
      <td>${row.team}</td>
      <td class="num">${row.pj}</td>
      <td class="num">${row.pg}</td>
      <td class="num">${row.pe}</td>
      <td class="num">${row.pp}</td>
      <td class="num">${row.gf}</td>
      <td class="num">${row.gc}</td>
      <td class="num">${row.dg}</td>
      <td class="num">${fp}</td>
      <td class="num"><strong>${row.pts}</strong></td>
    `;
    standingsBody.appendChild(tr);
  });

  renderTieBreakDetails(tieGroups);
}

function parseScore(v) {
  if (v === "") return null;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function renderFairplayInputs() {
  fairplayRoot.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "fairplay-grid";

  const sortedTeams = [...TEAMS].sort((a, b) => a.localeCompare(b));
  for (const team of sortedTeams) {
    const item = document.createElement("div");
    item.className = "fairplay-item";

    const label = document.createElement("label");
    label.className = "fairplay-team";
    label.textContent = team;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.value = String(state.fairplay.get(team) || 0);
    input.setAttribute("aria-label", `Fair play ${team}`);
    input.addEventListener("input", () => {
      const n = Number.parseInt(input.value, 10);
      state.fairplay.set(team, Number.isFinite(n) && n >= 0 ? n : 0);
      renderStandings();
      renderProbabilities();
    });
    item.append(label, input);
    grid.appendChild(item);
  }
  fairplayRoot.appendChild(grid);
}

function renderTieBreakDetails(tieGroups) {
  tiebreakRoot.innerHTML = "";
  if (tieGroups.length === 0) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = "Ahora mismo no hay equipos empatados a puntos.";
    tiebreakRoot.appendChild(p);
    return;
  }

  tieGroups.forEach((group, idx) => {
    const card = document.createElement("article");
    card.className = "tiebreak-card";
    const title = document.createElement("h3");
    title.textContent = `Empate ${idx + 1}: ${group.teams.length} equipos`;
    card.appendChild(title);

    const order = document.createElement("p");
    order.className = "hint";
    order.textContent = `Orden aplicado: ${group.order.join(" > ")}`;
    card.appendChild(order);

    const decided = document.createElement("p");
    decided.className = "hint";
    decided.textContent = `Criterio que decide el desempate: ${group.decidedBy}`;
    card.appendChild(decided);

    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr>
          <th>Equipo</th>
          <th class="num">Pts</th>
          <th class="num">DG global</th>
          <th class="num">GF global</th>
          <th class="num">Pts directos</th>
          <th class="num">DG directo</th>
          <th class="num">GF directo</th>
          <th class="num">FP</th>
        </tr>
      </thead>
    `;

    const body = document.createElement("tbody");
    group.teams.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${t.team}</td>
        <td class="num">${t.pts}</td>
        <td class="num">${t.dgKey}</td>
        <td class="num">${t.gfKey}</td>
        <td class="num">${t.h2hPts}</td>
        <td class="num">${t.h2hDg}</td>
        <td class="num">${t.h2hGf}</td>
        <td class="num">${t.fp}</td>
      `;
      body.appendChild(tr);
    });

    table.appendChild(body);
    wrap.appendChild(table);
    card.appendChild(wrap);
    tiebreakRoot.appendChild(card);
  });
}

function renderFixtures() {
  fixturesRoot.innerHTML = "";

  for (const round of FIXTURES) {
    const card = document.createElement("article");
    card.className = "fixture-card";

    const title = document.createElement("h3");
    title.textContent = round.round;
    card.appendChild(title);

    for (const match of round.matches) {
      const row = document.createElement("div");
      row.className = "fixture-row";

      if (match.bye) {
        continue;
      }

      const k = keyFor(round.round, match.home, match.away);
      const val = state.results.get(k);
      const isOfficial = OFFICIAL_RESULTS[k] !== undefined;
      row.classList.add(isOfficial ? "official" : "pending");

      const home = document.createElement("div");
      home.className = "team-home";
      home.textContent = match.home;

      const box = document.createElement("div");
      box.className = "score-box";

      const inHome = document.createElement("input");
      inHome.type = "number";
      inHome.min = "0";
      inHome.step = "1";
      inHome.value = val ? String(val[0]) : "";
      inHome.disabled = isOfficial;

      const dash = document.createElement("span");
      dash.textContent = "-";

      const inAway = document.createElement("input");
      inAway.type = "number";
      inAway.min = "0";
      inAway.step = "1";
      inAway.value = val ? String(val[1]) : "";
      inAway.disabled = isOfficial;

      const away = document.createElement("div");
      away.className = "team-away";
      away.textContent = match.away;
      const quick = document.createElement("div");
      quick.className = "quick-picks";

      let one = null;
      let draw = null;
      let two = null;

      const syncQuickPickState = () => {
        if (!one || !draw || !two) return;
        one.classList.remove("active");
        draw.classList.remove("active");
        two.classList.remove("active");

        const hg = parseScore(inHome.value);
        const ag = parseScore(inAway.value);
        if (hg === null || ag === null) return;
        if (hg > ag) one.classList.add("active");
        else if (hg < ag) two.classList.add("active");
        else draw.classList.add("active");
      };

      const updateState = () => {
        const hg = parseScore(inHome.value);
        const ag = parseScore(inAway.value);
        if (hg === null || ag === null) {
          state.results.delete(k);
        } else {
          state.results.set(k, [hg, ag]);
        }
        syncQuickPickState();
        renderStandings();
        renderProbabilities();
      };

      if (!isOfficial) {
        inHome.addEventListener("input", updateState);
        inAway.addEventListener("input", updateState);

        one = document.createElement("button");
        one.type = "button";
        one.className = "quick-pick-btn";
        one.textContent = "1";
        one.addEventListener("click", () => {
          inHome.value = "1";
          inAway.value = "0";
          updateState();
        });

        draw = document.createElement("button");
        draw.type = "button";
        draw.className = "quick-pick-btn";
        draw.textContent = "X";
        draw.addEventListener("click", () => {
          inHome.value = "0";
          inAway.value = "0";
          updateState();
        });

        two = document.createElement("button");
        two.type = "button";
        two.className = "quick-pick-btn";
        two.textContent = "2";
        two.addEventListener("click", () => {
          inHome.value = "0";
          inAway.value = "1";
          updateState();
        });

        quick.append(one, draw, two);
        syncQuickPickState();
      }

      box.append(inHome, dash, inAway);
      row.append(home, box, away, quick);
      card.appendChild(row);
    }

    fixturesRoot.appendChild(card);
  }
}

function poissonSample(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function pendingMatches() {
  const list = [];
  for (const round of FIXTURES) {
    for (const m of round.matches) {
      if (m.bye) continue;
      const k = keyFor(round.round, m.home, m.away);
      if (!state.results.has(k)) {
        list.push({ round: round.round, ...m, key: k });
      }
    }
  }
  return list;
}

function runSimulation(iterations) {
  const current = new Map(state.results);
  const pending = pendingMatches();

  const counters = {};
  for (const t of TEAMS) {
    counters[t] = { top4: 0, top2: 0 };
  }

  for (let i = 0; i < iterations; i += 1) {
    const simulated = new Map(current);

    for (const m of pending) {
      const hg = poissonSample(NEUTRAL_GOAL_LAMBDA);
      const ag = poissonSample(NEUTRAL_GOAL_LAMBDA);
      simulated.set(m.key, [hg, ag]);
    }

    const ranked = computeStandings(simulated).rows;
    for (let pos = 0; pos < ranked.length; pos += 1) {
      const team = ranked[pos].team;
      if (pos < 4) counters[team].top4 += 1;
      if (pos < 2) counters[team].top2 += 1;
    }
  }

  return counters;
}

function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function renderProbabilities() {
  const iterations = Math.max(1000, Math.min(100000, Number.parseInt(simCountInput.value, 10) || 20000));
  const counters = runSimulation(iterations);
  const order = computeStandings(state.results).rows.map((r) => r.team);

  probBody.innerHTML = "";
  for (const team of order) {
    const c = counters[team];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${team}</td>
      <td class="num">${pct(c.top4 / iterations)}</td>
      <td class="num">${pct(c.top2 / iterations)}</td>
    `;
    probBody.appendChild(tr);
  }
}

document.getElementById("reset-official").addEventListener("click", () => {
  state.results.clear();
  for (const [k, v] of Object.entries(OFFICIAL_RESULTS)) {
    state.results.set(k, [...v]);
  }
  renderFixtures();
  renderStandings();
  renderProbabilities();
});

document.getElementById("clear-pending").addEventListener("click", () => {
  const keep = new Map();
  for (const [k, v] of Object.entries(OFFICIAL_RESULTS)) {
    keep.set(k, [...v]);
  }
  state.results = keep;
  renderFixtures();
  renderStandings();
  renderProbabilities();
});

document.getElementById("run-sim").addEventListener("click", () => {
  renderProbabilities();
});

renderFairplayInputs();
renderFixtures();
renderStandings();
renderProbabilities();
