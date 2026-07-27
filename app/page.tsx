"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Difficulty = "Madali" | "Katamtaman" | "Mahirap" | "Dalubhasa";
type Level = {
  id: number;
  difficulty: Difficulty;
  theme: string;
  letters: string;
  words: string[];
  clue: string;
};

const LEVELS: Level[] = [
  { id: 1, difficulty: "Madali", theme: "Damdamin", letters: "PUSO", words: ["PUSO", "USO"], clue: "Pag-ibig at nakagawian" },
  { id: 2, difficulty: "Madali", theme: "Kalikasan", letters: "ARAW", words: ["ARAW", "AWA", "RAW"], clue: "Liwanag at malasakit" },
  { id: 3, difficulty: "Madali", theme: "Oras", letters: "GABI", words: ["GABI", "IBA"], clue: "Paglubog ng araw" },
  { id: 4, difficulty: "Katamtaman", theme: "Tahanan", letters: "BAHAY", words: ["BAHAY", "HABA"], clue: "Lugar na inuuwian" },
  { id: 5, difficulty: "Katamtaman", theme: "Paaralan", letters: "AKLAT", words: ["AKLAT", "ALAT", "TALA"], clue: "Kasama sa pag-aaral" },
  { id: 6, difficulty: "Katamtaman", theme: "Pamilya", letters: "PAMILYA", words: ["PAMILYA", "PILA", "MAYA", "LIMA"], clue: "Mga taong pinakamalapit sa atin" },
  { id: 7, difficulty: "Mahirap", theme: "Kalikasan", letters: "KALIKASAN", words: ["KALIKASAN", "LIKAS", "KASALI", "AKIN", "LAKI"], clue: "Yamang dapat pangalagaan" },
  { id: 8, difficulty: "Mahirap", theme: "Kalayaan", letters: "KALAYAAN", words: ["KALAYAAN", "LAYA", "KAYA", "ALAY", "AKALA"], clue: "Karapatang mamili at kumilos" },
  { id: 9, difficulty: "Mahirap", theme: "Pagmamahal", letters: "PAGMAMAHAL", words: ["PAGMAMAHAL", "MAHAL", "MAPA", "ALAM", "GALA"], clue: "Malalim na pag-aaruga" },
  { id: 10, difficulty: "Dalubhasa", theme: "Pananagutan", letters: "PANANAGUTAN", words: ["PANANAGUTAN", "TUNAY", "TANAN", "GUNITA", "PUNA"], clue: "Tungkuling dapat tuparin" },
  { id: 11, difficulty: "Dalubhasa", theme: "Kababaang-loob", letters: "MAPAGKUMBABA", words: ["MAPAGKUMBABA", "BABA", "BUKA", "MAPA", "KAMA"], clue: "Tahimik na lakas ng pagkatao" },
  { id: 12, difficulty: "Dalubhasa", theme: "Pakikipagkapwa", letters: "PAKIKIPAGKAPWA", words: ["PAKIKIPAGKAPWA", "KAPWA", "WIKA", "PAKI", "API"], clue: "Paggalang at malasakit sa iba" },
];

type Direction = "across" | "down";
type Placement = { word: string; row: number; col: number; direction: Direction };
type Cell = { row: number; col: number; letter: string; words: string[] };

function makeGrid(words: string[]) {
  const placements: Placement[] = [
    { word: words[0], row: 12, col: 12, direction: "across" },
  ];
  const occupied = new Map<string, { letter: string; words: Set<string> }>();
  const key = (row: number, col: number) => `${row}:${col}`;

  const addPlacement = (placement: Placement) => {
    placement.word.split("").forEach((letter, index) => {
      const row = placement.row + (placement.direction === "down" ? index : 0);
      const col = placement.col + (placement.direction === "across" ? index : 0);
      const cellKey = key(row, col);
      const existing = occupied.get(cellKey);
      if (existing) existing.words.add(placement.word);
      else occupied.set(cellKey, { letter, words: new Set([placement.word]) });
    });
    placements.push(placement);
  };

  // The first answer establishes the board. Every later answer must cross an
  // existing answer in the opposite direction, preventing two answers from
  // appearing as one continuous line.
  placements.splice(0);
  addPlacement({ word: words[0], row: 12, col: 12, direction: "across" });

  words.slice(1).forEach((word, wordIndex) => {
    const direction: Direction = wordIndex % 2 === 0 ? "down" : "across";
    let chosen: Placement | null = null;

    for (const existing of [...placements].reverse()) {
      if (existing.direction === direction) continue;
      for (let newIndex = 0; newIndex < word.length && !chosen; newIndex++) {
        for (let oldIndex = 0; oldIndex < existing.word.length; oldIndex++) {
          if (word[newIndex] !== existing.word[oldIndex]) continue;
          const crossRow = existing.row + (existing.direction === "down" ? oldIndex : 0);
          const crossCol = existing.col + (existing.direction === "across" ? oldIndex : 0);
          const row = crossRow - (direction === "down" ? newIndex : 0);
          const col = crossCol - (direction === "across" ? newIndex : 0);
          const beforeRow = row - (direction === "down" ? 1 : 0);
          const beforeCol = col - (direction === "across" ? 1 : 0);
          const afterRow = row + (direction === "down" ? word.length : 0);
          const afterCol = col + (direction === "across" ? word.length : 0);
          let valid = !occupied.has(key(beforeRow, beforeCol)) && !occupied.has(key(afterRow, afterCol));

          word.split("").forEach((letter, index) => {
            const cellRow = row + (direction === "down" ? index : 0);
            const cellCol = col + (direction === "across" ? index : 0);
            const current = occupied.get(key(cellRow, cellCol));
            if (current && current.letter !== letter) valid = false;
            if (!current) {
              const sideA = direction === "down" ? key(cellRow, cellCol - 1) : key(cellRow - 1, cellCol);
              const sideB = direction === "down" ? key(cellRow, cellCol + 1) : key(cellRow + 1, cellCol);
              if (occupied.has(sideA) || occupied.has(sideB)) valid = false;
            }
          });

          if (valid) {
            chosen = { word, row, col, direction };
            break;
          }
        }
      }
      if (chosen) break;
    }

    // A disconnected fallback is intentionally separated by a blank row.
    addPlacement(chosen ?? {
      word,
      row: 16 + wordIndex * 2,
      col: 12,
      direction: "across",
    });
  });

  const cells: Cell[] = [...occupied.entries()].map(([position, value]) => {
    const [row, col] = position.split(":").map(Number);
    return { row, col, letter: value.letter, words: [...value.words] };
  });
  const minRow = Math.min(...cells.map((c) => c.row));
  const minCol = Math.min(...cells.map((c) => c.col));
  const maxRow = Math.max(...cells.map((c) => c.row));
  const maxCol = Math.max(...cells.map((c) => c.col));
  return {
    cells: cells.map((c) => ({ ...c, row: c.row - minRow, col: c.col - minCol })),
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
  };
}

function shuffled(value: string) {
  const chars = value.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

export default function Home() {
  const [screen, setScreen] = useState<"home" | "levels" | "game">("home");
  const [levelIndex, setLevelIndex] = useState(0);
  const [letters, setLetters] = useState(() => LEVELS[0].letters.split(""));
  const [selected, setSelected] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [coins, setCoins] = useState(120);
  const [message, setMessage] = useState("Pagdugtungin ang mga titik");
  const [isDragging, setIsDragging] = useState(false);
  const [completed, setCompleted] = useState<number[]>([]);
  const wheelRef = useRef<HTMLDivElement>(null);
  const level = LEVELS[levelIndex];
  const grid = useMemo(() => makeGrid(level.words), [level]);
  const currentWord = selected.map((i) => letters[i]).join("");

  useEffect(() => {
    const saved = localStorage.getItem("salita-v1");
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      setCoins(data.coins ?? 120);
      setCompleted(data.completed ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("salita-v1", JSON.stringify({ coins, completed }));
  }, [coins, completed]);

  const openLevel = (index: number) => {
    setLevelIndex(index);
    setLetters(shuffled(LEVELS[index].letters));
    setFound([]);
    setSelected([]);
    setMessage("Pagdugtungin ang mga titik");
    setScreen("game");
  };

  const submitWord = useCallback((word: string) => {
    if (!word) return;
    if (level.words.includes(word) && !found.includes(word)) {
      const nextFound = [...found, word];
      setFound(nextFound);
      setCoins((value) => value + word.length);
      setMessage(`Mahusay! +${word.length} barya`);
      if (nextFound.length === level.words.length) {
        setCompleted((items) => [...new Set([...items, level.id])]);
        setTimeout(() => setMessage("Kumpleto ang antas! 🎉"), 250);
      }
    } else if (found.includes(word)) {
      setMessage("Nahanap mo na ang salitang iyan");
    } else {
      setMessage("Subukan muli");
    }
  }, [found, level]);

  const finishSelection = () => {
    if (!isDragging) return;
    setIsDragging(false);
    submitWord(currentWord);
    setSelected([]);
  };

  const selectFromPoint = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y) as HTMLElement | null;
    const node = element?.closest<HTMLElement>("[data-letter-index]");
    if (!node) return;
    const index = Number(node.dataset.letterIndex);
    setSelected((items) => items.includes(index) ? items : [...items, index]);
  };

  const hint = () => {
    if (coins < 10) {
      setMessage("Kulang ang iyong barya");
      return;
    }
    const missing = level.words.find((word) => !found.includes(word));
    if (!missing) return;
    setCoins((value) => value - 10);
    setMessage(`Pahiwatig: nagsisimula sa “${missing[0]}” at may ${missing.length} titik`);
  };

  const difficultyColor: Record<Difficulty, string> = {
    Madali: "easy",
    Katamtaman: "medium",
    Mahirap: "hard",
    Dalubhasa: "expert",
  };

  return (
    <main className="app-shell">
      <div className="sun-glow" />

      {screen === "home" && (
        <section className="home-screen">
          <div className="brand-lockup">
            <span className="sun-mark">✦</span>
            <h1>SALITA</h1>
            <p>Pagdugtungin. Tuklasin. Matuto.</p>
          </div>
          <div className="home-card">
            <span className="eyebrow">Larong Salitang Tagalog</span>
            <h2>Handa ka na bang buuin ang bawat salita?</h2>
            <p>Magsimula sa madadaling salita at umakyat hanggang sa antas ng Dalubhasa.</p>
            <button className="primary-button" onClick={() => setScreen("levels")}>MAGLARO <span>▶</span></button>
            <div className="feature-row">
              <span>12 antas</span><i />
              <span>4 kahirapan</span><i />
              <span>Tagalog</span>
            </div>
          </div>
        </section>
      )}

      {screen === "levels" && (
        <section className="levels-screen">
          <header className="topbar">
            <button className="icon-button" onClick={() => setScreen("home")} aria-label="Bumalik">←</button>
            <div><span className="mini-brand">SALITA</span><h2>Piliin ang Antas</h2></div>
            <div className="coin-pill">🪙 {coins}</div>
          </header>
          <div className="journey">
            {(["Madali", "Katamtaman", "Mahirap", "Dalubhasa"] as Difficulty[]).map((difficulty) => (
              <div className="difficulty-group" key={difficulty}>
                <div className={`difficulty-heading ${difficultyColor[difficulty]}`}>
                  <span>{difficulty === "Madali" ? "🌱" : difficulty === "Katamtaman" ? "🌿" : difficulty === "Mahirap" ? "⛰️" : "☀️"}</span>
                  <div><h3>{difficulty}</h3><p>{difficulty === "Madali" ? "Maiikling pang-araw-araw na salita" : difficulty === "Katamtaman" ? "Mas maraming titik at tawiran" : difficulty === "Mahirap" ? "Mahahabang salitang susubok sa iyo" : "Pinakamalalim na salitang Filipino"}</p></div>
                </div>
                <div className="level-grid">
                  {LEVELS.map((item, index) => item.difficulty === difficulty && (
                    <button className={`level-card ${completed.includes(item.id) ? "done" : ""}`} key={item.id} onClick={() => openLevel(index)}>
                      <span className="level-number">{completed.includes(item.id) ? "✓" : item.id}</span>
                      <span><b>{item.theme}</b><small>{item.words.length} salita</small></span>
                      <em>›</em>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {screen === "game" && (
        <section className="game-screen" onPointerUp={finishSelection} onPointerCancel={finishSelection}>
          <header className="game-topbar">
            <button className="icon-button" onClick={() => setScreen("levels")} aria-label="Mga antas">←</button>
            <div className="level-title"><small>{level.difficulty}</small><strong>ANTAS {level.id}</strong></div>
            <div className="coin-pill">🪙 {coins}</div>
          </header>

          <div className="game-content">
            <div className="clue-pill">{level.theme} · {level.clue}</div>
            <div className="crossword-wrap">
              <div className="crossword" style={{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)`, gridTemplateRows: `repeat(${grid.rows}, 1fr)` }}>
                {grid.cells.map((cell) => {
                  const revealed = cell.words.some((word) => found.includes(word));
                  return <span key={`${cell.row}-${cell.col}`} className={`tile ${revealed ? "revealed" : ""}`} style={{ gridRow: cell.row + 1, gridColumn: cell.col + 1 }}>{revealed ? cell.letter : ""}</span>;
                })}
              </div>
            </div>

            <div className={`word-preview ${currentWord ? "active" : ""}`}>{currentWord || message}</div>

            <div className="play-controls">
              <button className="round-action shuffle" onClick={() => { setLetters(shuffled(level.letters)); setMessage("Nahalo na ang mga titik"); }}><span>⤨</span>HALUIN</button>
              <div
                className="letter-wheel"
                ref={wheelRef}
                onPointerDown={(event) => { setIsDragging(true); setSelected([]); selectFromPoint(event.clientX, event.clientY); }}
                onPointerMove={(event) => { if (isDragging) selectFromPoint(event.clientX, event.clientY); }}
              >
                <svg className="swipe-lines" viewBox="0 0 100 100" aria-hidden="true">
                  {selected.slice(1).map((value, index) => {
                    const a = selected[index], b = value;
                    const angleA = (a / letters.length) * Math.PI * 2 - Math.PI / 2;
                    const angleB = (b / letters.length) * Math.PI * 2 - Math.PI / 2;
                    return <line key={`${a}-${b}`} x1={50 + Math.cos(angleA) * 34} y1={50 + Math.sin(angleA) * 34} x2={50 + Math.cos(angleB) * 34} y2={50 + Math.sin(angleB) * 34} />;
                  })}
                </svg>
                {letters.map((letter, index) => {
                  const angle = (index / letters.length) * Math.PI * 2 - Math.PI / 2;
                  return (
                    <button
                      key={`${letter}-${index}`}
                      data-letter-index={index}
                      className={`letter-node ${selected.includes(index) ? "selected" : ""}`}
                      style={{ left: `${50 + Math.cos(angle) * 34}%`, top: `${50 + Math.sin(angle) * 34}%` }}
                      onClick={() => {
                        const next = selected.includes(index) ? selected : [...selected, index];
                        setSelected(next);
                        if (next.length === level.letters.length) {
                          submitWord(next.map((i) => letters[i]).join(""));
                          setSelected([]);
                        }
                      }}
                    >{letter}</button>
                  );
                })}
              </div>
              <button className="round-action hint" onClick={hint}><span>💡</span>PAHIWATIG<small>10 🪙</small></button>
            </div>

            <div className="progress-row">
              <span>Nahanap: <b>{found.length}/{level.words.length}</b></span>
              <div><i style={{ width: `${(found.length / level.words.length) * 100}%` }} /></div>
            </div>

            {found.length === level.words.length && (
              <div className="completion-card">
                <span>★</span><h3>Mahusay!</h3><p>Natapos mo ang Antas {level.id}.</p>
                <button className="primary-button" onClick={() => levelIndex < LEVELS.length - 1 ? openLevel(levelIndex + 1) : setScreen("levels")}>
                  {levelIndex < LEVELS.length - 1 ? "SUSUNOD NA ANTAS" : "TINGNAN ANG MGA ANTAS"}
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
