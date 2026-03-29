import { useState, useCallback } from "react"

type Piece = {
  type: "K" | "Q" | "R" | "B" | "N" | "P"
  color: "w" | "b"
}

type Square = Piece | null
type Board = Square[][]
type Difficulty = "easy" | "medium" | "hard" | "impossible"

const PIECE_UNICODE: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
}

const PIECE_VALUES: Record<string, number> = { K: 20000, Q: 900, R: 500, B: 330, N: 320, P: 100 }

const PAWN_TABLE = [
  [0,0,0,0,0,0,0,0],
  [50,50,50,50,50,50,50,50],
  [10,10,20,30,30,20,10,10],
  [5,5,10,25,25,10,5,5],
  [0,0,0,20,20,0,0,0],
  [5,-5,-10,0,0,-10,-5,5],
  [5,10,10,-20,-20,10,10,5],
  [0,0,0,0,0,0,0,0],
]
const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,0,0,0,0,-20,-40],
  [-30,0,10,15,15,10,0,-30],
  [-30,5,15,20,20,15,5,-30],
  [-30,0,15,20,20,15,0,-30],
  [-30,5,10,15,15,10,5,-30],
  [-40,-20,0,5,5,0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
]

function createInitialBoard(): Board {
  const b: Board = Array(8).fill(null).map(() => Array(8).fill(null))
  const backRow: Piece["type"][] = ["R", "N", "B", "Q", "K", "B", "N", "R"]
  backRow.forEach((t, i) => {
    b[0][i] = { type: t, color: "b" }
    b[7][i] = { type: t, color: "w" }
  })
  for (let i = 0; i < 8; i++) {
    b[1][i] = { type: "P", color: "b" }
    b[6][i] = { type: "P", color: "w" }
  }
  return b
}

function cloneBoard(board: Board): Board {
  return board.map(row => row.map(sq => sq ? { ...sq } : null))
}

function inBounds(r: number, c: number) {
  return r >= 0 && r < 8 && c >= 0 && c < 8
}

function getMoves(board: Board, r: number, c: number): [number, number][] {
  const piece = board[r][c]
  if (!piece) return []
  const moves: [number, number][] = []
  const { type, color } = piece
  const enemy = color === "w" ? "b" : "w"

  const slide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc
    while (inBounds(nr, nc)) {
      if (!board[nr][nc]) { moves.push([nr, nc]); nr += dr; nc += dc }
      else { if (board[nr][nc]!.color === enemy) moves.push([nr, nc]); break }
    }
  }
  const jump = (dr: number, dc: number) => {
    const nr = r + dr, nc = c + dc
    if (inBounds(nr, nc) && board[nr][nc]?.color !== color) moves.push([nr, nc])
  }

  if (type === "P") {
    const dir = color === "w" ? -1 : 1
    const start = color === "w" ? 6 : 1
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      moves.push([r + dir, c])
      if (r === start && !board[r + 2 * dir][c]) moves.push([r + 2 * dir, c])
    }
    for (const dc of [-1, 1])
      if (inBounds(r + dir, c + dc) && board[r + dir][c + dc]?.color === enemy)
        moves.push([r + dir, c + dc])
  } else if (type === "N") {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) jump(dr, dc)
  } else if (type === "K") {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) jump(dr, dc)
  } else if (type === "R") {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc)
  } else if (type === "B") {
    for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc)
  } else if (type === "Q") {
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc)
  }
  return moves
}

function getAllMoves(board: Board, color: "w" | "b") {
  const all: { from: [number, number]; to: [number, number] }[] = []
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color)
        for (const to of getMoves(board, r, c))
          all.push({ from: [r, c], to })
  return all
}

function evaluateBoard(board: Board): number {
  let score = 0
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (!p) continue
      let val = PIECE_VALUES[p.type]
      if (p.type === "P") val += p.color === "b" ? PAWN_TABLE[r][c] : PAWN_TABLE[7 - r][c]
      if (p.type === "N") val += p.color === "b" ? KNIGHT_TABLE[r][c] : KNIGHT_TABLE[7 - r][c]
      score += p.color === "b" ? val : -val
    }
  return score
}

function applyMove(board: Board, from: [number, number], to: [number, number]): Board {
  const nb = cloneBoard(board)
  nb[to[0]][to[1]] = nb[from[0]][from[1]]
  nb[from[0]][from[1]] = null
  if (nb[to[0]][to[1]]?.type === "P" && to[0] === 7) nb[to[0]][to[1]] = { type: "Q", color: "b" }
  if (nb[to[0]][to[1]]?.type === "P" && to[0] === 0) nb[to[0]][to[1]] = { type: "Q", color: "w" }
  return nb
}

function minimax(board: Board, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0) return evaluateBoard(board)
  const color = maximizing ? "b" : "w"
  const moves = getAllMoves(board, color)
  if (moves.length === 0) return maximizing ? -99999 : 99999

  if (maximizing) {
    let best = -Infinity
    for (const m of moves) {
      const nb = applyMove(board, m.from, m.to)
      best = Math.max(best, minimax(nb, depth - 1, alpha, beta, false))
      alpha = Math.max(alpha, best)
      if (beta <= alpha) break
    }
    return best
  } else {
    let best = Infinity
    for (const m of moves) {
      const nb = applyMove(board, m.from, m.to)
      best = Math.min(best, minimax(nb, depth - 1, alpha, beta, true))
      beta = Math.min(beta, best)
      if (beta <= alpha) break
    }
    return best
  }
}

function getBestMove(board: Board, difficulty: Difficulty) {
  const moves = getAllMoves(board, "b")
  if (!moves.length) return null

  if (difficulty === "easy") {
    const random = moves[Math.floor(Math.random() * moves.length)]
    return random
  }

  if (difficulty === "medium") {
    const scored = moves.map(m => {
      const nb = applyMove(board, m.from, m.to)
      return { m, score: evaluateBoard(nb) }
    })
    scored.sort((a, b) => b.score - a.score)
    const topN = scored.slice(0, 5)
    if (Math.random() < 0.4) return topN[Math.floor(Math.random() * topN.length)].m
    return topN[0].m
  }

  const depth = difficulty === "hard" ? 2 : 4
  let bestScore = -Infinity
  let bestMove = moves[0]
  for (const m of moves) {
    const nb = applyMove(board, m.from, m.to)
    const score = minimax(nb, depth - 1, -Infinity, Infinity, false)
    if (score > bestScore) { bestScore = score; bestMove = m }
  }
  return bestMove
}

function isKingCapture(board: Board, color: "w" | "b"): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === "K" && board[r][c]?.color === color) return false
  return true
}

const DIFFICULTIES: { key: Difficulty; label: string; color: string }[] = [
  { key: "easy", label: "Легко", color: "bg-emerald-600 hover:bg-emerald-500" },
  { key: "medium", label: "Средне", color: "bg-blue-600 hover:bg-blue-500" },
  { key: "hard", label: "Сложно", color: "bg-orange-600 hover:bg-orange-500" },
  { key: "impossible", label: "Невозможно", color: "bg-red-700 hover:bg-red-600" },
]

export function ChessGame() {
  const [board, setBoard] = useState<Board>(createInitialBoard)
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [validMoves, setValidMoves] = useState<[number, number][]>([])
  const [turn, setTurn] = useState<"w" | "b">("w")
  const [status, setStatus] = useState<string>("Ваш ход — вы играете белыми")
  const [gameOver, setGameOver] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>("medium")

  const makeAiMove = useCallback((currentBoard: Board, diff: Difficulty) => {
    const delay = diff === "impossible" ? 800 : 400
    setTimeout(() => {
      const move = getBestMove(currentBoard, diff)
      if (!move) { setStatus("Пат — ничья!"); setGameOver(true); return }
      const nb = applyMove(currentBoard, move.from, move.to)
      setLastMove(move)
      setBoard(nb)
      if (isKingCapture(nb, "w")) { setStatus("Мат! Робот победил 🤖"); setGameOver(true) }
      else setStatus("Ваш ход — вы играете белыми")
      setTurn("w")
    }, delay)
  }, [])

  const handleSquareClick = useCallback((r: number, c: number) => {
    if (gameOver || turn !== "w") return

    if (selected) {
      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
      if (isValid) {
        const nb = applyMove(board, selected, [r, c])
        setLastMove({ from: selected, to: [r, c] })
        setBoard(nb)
        setSelected(null)
        setValidMoves([])
        if (isKingCapture(nb, "b")) { setStatus("Мат! Вы победили 🎉"); setGameOver(true); return }
        const thinkMsg = difficulty === "impossible" ? "Робот просчитывает все варианты... 🧠" : "Робот думает..."
        setStatus(thinkMsg)
        setTurn("b")
        makeAiMove(nb, difficulty)
        return
      }
    }

    if (board[r][c]?.color === "w") {
      setSelected([r, c])
      setValidMoves(getMoves(board, r, c))
    } else {
      setSelected(null)
      setValidMoves([])
    }
  }, [board, selected, validMoves, turn, gameOver, makeAiMove, difficulty])

  const resetGame = (newDiff?: Difficulty) => {
    const d = newDiff ?? difficulty
    setBoard(createInitialBoard())
    setSelected(null)
    setValidMoves([])
    setTurn("w")
    setStatus("Ваш ход — вы играете белыми")
    setGameOver(false)
    setLastMove(null)
    if (newDiff) setDifficulty(newDiff)
  }

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"]
  const currentDiff = DIFFICULTIES.find(d => d.key === difficulty)!

  return (
    <section className="flex min-h-screen w-screen shrink-0 flex-col items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-5 w-full max-w-xl">
        <div className="text-center">
          <div className="mb-2 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <p className="font-mono text-xs text-white/80">♟ Шахматы</p>
          </div>
          <h2 className="font-sans text-3xl font-light tracking-tight text-white md:text-4xl">
            Сыграй с роботом
          </h2>
        </div>

        {/* Уровни сложности */}
        <div className="flex gap-2 flex-wrap justify-center">
          {DIFFICULTIES.map(d => (
            <button
              key={d.key}
              onClick={() => resetGame(d.key)}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium text-white transition-all shadow-md ${
                difficulty === d.key
                  ? d.color + " ring-2 ring-white/30 ring-offset-1 ring-offset-transparent scale-105"
                  : "bg-zinc-800 hover:bg-zinc-700 border border-white/10"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Статус */}
        <div className={`rounded-xl px-5 py-2.5 font-mono text-sm font-medium shadow-lg transition-all ${
          gameOver
            ? status.includes("победили") ? "bg-emerald-500 text-white" : "bg-red-600 text-white"
            : status.includes("думает") || status.includes("просчитывает")
              ? "bg-blue-600 text-white"
              : "bg-zinc-900 text-white border border-white/10"
        }`}>
          {status}
        </div>

        {/* Доска */}
        <div className="rounded-2xl bg-zinc-900 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/10">
          <div className="rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            {board.map((row, r) => (
              <div key={r} className="flex">
                {row.map((sq, c) => {
                  const isLight = (r + c) % 2 === 0
                  const isSelected = selected?.[0] === r && selected?.[1] === c
                  const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
                  const isLastFrom = lastMove?.from[0] === r && lastMove?.from[1] === c
                  const isLastTo = lastMove?.to[0] === r && lastMove?.to[1] === c

                  const labelColor = isLight ? "rgba(80,80,80,0.7)" : "rgba(200,200,200,0.7)"

                  let bgStyle: React.CSSProperties = {}
                  if (isSelected) bgStyle = { backgroundColor: "#f6f669" }
                  else if (isLastFrom || isLastTo) bgStyle = { backgroundColor: isLight ? "#e8e84a" : "#555500" }
                  else bgStyle = { backgroundColor: isLight ? "#ffffff" : "#1a1a1a" }

                  return (
                    <div
                      key={c}
                      onClick={() => handleSquareClick(r, c)}
                      style={bgStyle}
                      className="relative flex items-center justify-center w-[44px] h-[44px] sm:w-[54px] sm:h-[54px] md:w-[62px] md:h-[62px] cursor-pointer select-none hover:brightness-110"
                    >
                      {/* Цифра — только левый столбец */}
                      {c === 0 && (
                        <span className="absolute top-[2px] left-[3px] font-mono text-[9px] sm:text-[10px] font-bold leading-none" style={{ color: labelColor }}>
                          {ranks[r]}
                        </span>
                      )}
                      {/* Буква — только нижняя строка */}
                      {r === 7 && (
                        <span className="absolute bottom-[2px] right-[3px] font-mono text-[9px] sm:text-[10px] font-bold leading-none" style={{ color: labelColor }}>
                          {files[c]}
                        </span>
                      )}

                      {isValid && !sq && (
                        <div className="w-[30%] h-[30%] rounded-full bg-black/20" />
                      )}
                      {isValid && sq && (
                        <div className="absolute inset-0 border-4 border-black/25" />
                      )}
                      {sq && (
                        <span
                          className="leading-none select-none text-[28px] sm:text-[34px] md:text-[40px]"
                          style={{
                            color: sq.color === "w" ? "#ffffff" : "#000000",
                            filter: sq.color === "w"
                              ? "drop-shadow(0 1px 3px rgba(0,0,0,0.7)) drop-shadow(0 0 1px rgba(0,0,0,0.5))"
                              : "drop-shadow(0 1px 2px rgba(255,255,255,0.2))"
                          }}
                        >
                          {PIECE_UNICODE[`${sq.color}${sq.type}`]}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => resetGame()}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-5 py-2.5 font-sans text-sm font-medium text-white transition-all shadow-md"
          >
            Новая игра
          </button>
        </div>

        <div className="flex gap-6 font-mono text-xs text-zinc-500">
          <span>Вы — белые ♔</span>
          <span className={`${difficulty === "impossible" ? "text-red-400" : ""}`}>
            Робот [{currentDiff.label}] ♚
          </span>
        </div>
      </div>
    </section>
  )
}