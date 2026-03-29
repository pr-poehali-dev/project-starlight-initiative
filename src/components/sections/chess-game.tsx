import { useState, useCallback, useEffect } from "react"

type Piece = {
  type: "K" | "Q" | "R" | "B" | "N" | "P"
  color: "w" | "b"
}

type Square = Piece | null
type Board = Square[][]

const PIECE_UNICODE: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
}

const PIECE_VALUES: Record<string, number> = { K: 900, Q: 9, R: 5, B: 3, N: 3, P: 1 }

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
    for (const dc of [-1, 1]) {
      if (inBounds(r + dir, c + dc) && board[r + dir][c + dc]?.color === enemy)
        moves.push([r + dir, c + dc])
    }
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

function evaluateBoard(board: Board): number {
  let score = 0
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c]
      if (p) score += (p.color === "b" ? 1 : -1) * PIECE_VALUES[p.type]
    }
  return score
}

function getBestMove(board: Board): { from: [number, number]; to: [number, number] } | null {
  let bestScore = -Infinity
  let bestMove: { from: [number, number]; to: [number, number] } | null = null

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.color !== "b") continue
      const moves = getMoves(board, r, c)
      for (const [nr, nc] of moves) {
        const nb = cloneBoard(board)
        nb[nr][nc] = nb[r][c]
        nb[r][c] = null
        if (nb[nr][nc]?.type === "P" && nr === 7) nb[nr][nc] = { type: "Q", color: "b" }
        const score = evaluateBoard(nb)
        if (score > bestScore) { bestScore = score; bestMove = { from: [r, c], to: [nr, nc] } }
      }
    }
  }
  return bestMove
}

function isKingCapture(board: Board, color: "w" | "b"): boolean {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === "K" && board[r][c]?.color === color) return false
  return true
}

export function ChessGame() {
  const [board, setBoard] = useState<Board>(createInitialBoard)
  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [validMoves, setValidMoves] = useState<[number, number][]>([])
  const [turn, setTurn] = useState<"w" | "b">("w")
  const [status, setStatus] = useState<string>("Ваш ход — вы играете белыми")
  const [gameOver, setGameOver] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: [number, number]; to: [number, number] } | null>(null)

  const makeAiMove = useCallback((currentBoard: Board) => {
    setTimeout(() => {
      const move = getBestMove(currentBoard)
      if (!move) { setStatus("Пат — ничья!"); setGameOver(true); return }
      const nb = cloneBoard(currentBoard)
      nb[move.to[0]][move.to[1]] = nb[move.from[0]][move.from[1]]
      nb[move.from[0]][move.from[1]] = null
      if (nb[move.to[0]][move.to[1]]?.type === "P" && move.to[0] === 7)
        nb[move.to[0]][move.to[1]] = { type: "Q", color: "b" }
      setLastMove(move)
      setBoard(nb)
      if (isKingCapture(nb, "w")) { setStatus("Мат! Робот победил 🤖"); setGameOver(true) }
      else setStatus("Ваш ход — вы играете белыми")
      setTurn("w")
    }, 400)
  }, [])

  const handleSquareClick = useCallback((r: number, c: number) => {
    if (gameOver || turn !== "w") return

    if (selected) {
      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
      if (isValid) {
        const nb = cloneBoard(board)
        nb[r][c] = nb[selected[0]][selected[1]]
        nb[selected[0]][selected[1]] = null
        if (nb[r][c]?.type === "P" && r === 0) nb[r][c] = { type: "Q", color: "w" }
        setLastMove({ from: selected, to: [r, c] })
        setBoard(nb)
        setSelected(null)
        setValidMoves([])
        if (isKingCapture(nb, "b")) { setStatus("Мат! Вы победили 🎉"); setGameOver(true); return }
        setStatus("Робот думает...")
        setTurn("b")
        makeAiMove(nb)
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
  }, [board, selected, validMoves, turn, gameOver, makeAiMove])

  const resetGame = () => {
    setBoard(createInitialBoard())
    setSelected(null)
    setValidMoves([])
    setTurn("w")
    setStatus("Ваш ход — вы играете белыми")
    setGameOver(false)
    setLastMove(null)
  }

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"]

  return (
    <section className="flex min-h-screen w-screen shrink-0 flex-col items-center justify-center px-6 py-24">
      <div className="flex flex-col items-center gap-6 w-full max-w-xl">
        <div className="text-center">
          <div className="mb-2 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-md">
            <p className="font-mono text-xs text-white/80">♟ Шахматы</p>
          </div>
          <h2 className="font-sans text-3xl font-light tracking-tight text-white md:text-4xl">
            Сыграй с роботом
          </h2>
        </div>

        <div className={`rounded-xl px-5 py-2.5 font-mono text-sm font-medium shadow-lg ${
          gameOver
            ? status.includes("победили") ? "bg-emerald-500 text-white" : "bg-red-500/90 text-white"
            : status.includes("думает") ? "bg-blue-600/90 text-white" : "bg-zinc-900 text-white border border-white/10"
        }`}>
          {status}
        </div>

        <div className="rounded-2xl bg-zinc-900 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.7)] border border-white/10">
          <div className="flex">
            <div className="flex flex-col justify-around pr-2 pb-[22px]">
              {ranks.map(r => (
                <span key={r} className="font-mono text-[11px] text-zinc-500 w-3 text-center leading-none">{r}</span>
              ))}
            </div>
            <div>
              <div className="rounded-xl overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                {board.map((row, r) => (
                  <div key={r} className="flex">
                    {row.map((sq, c) => {
                      const isLight = (r + c) % 2 === 0
                      const isSelected = selected?.[0] === r && selected?.[1] === c
                      const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
                      const isLastFrom = lastMove?.from[0] === r && lastMove?.from[1] === c
                      const isLastTo = lastMove?.to[0] === r && lastMove?.to[1] === c

                      let bgStyle: React.CSSProperties = {}
                      if (isSelected) bgStyle = { backgroundColor: "#f6f669" }
                      else if (isLastFrom || isLastTo) bgStyle = { backgroundColor: isLight ? "#cdd16f" : "#aaa23a" }
                      else bgStyle = { backgroundColor: isLight ? "#f0d9b5" : "#b58863" }

                      return (
                        <div
                          key={c}
                          onClick={() => handleSquareClick(r, c)}
                          style={bgStyle}
                          className="relative flex items-center justify-center w-[44px] h-[44px] sm:w-[54px] sm:h-[54px] md:w-[62px] md:h-[62px] cursor-pointer transition-none select-none hover:brightness-110"
                        >
                          {isValid && !sq && (
                            <div className="w-[30%] h-[30%] rounded-full bg-black/20" />
                          )}
                          {isValid && sq && (
                            <div className="absolute inset-0 rounded-full border-4 border-black/20 box-border" />
                          )}
                          {sq && (
                            <span
                              className="leading-none select-none text-[28px] sm:text-[34px] md:text-[40px]"
                              style={{
                                filter: sq.color === "w"
                                  ? "drop-shadow(0 1px 3px rgba(0,0,0,0.5))"
                                  : "drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
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
              <div className="flex pt-1">
                {files.map(f => (
                  <span key={f} className="font-mono text-[11px] text-zinc-500 w-[44px] sm:w-[54px] md:w-[62px] text-center">{f}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={resetGame}
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-5 py-2.5 font-sans text-sm font-medium text-white transition-all shadow-md"
          >
            Новая игра
          </button>
        </div>

        <div className="flex gap-6 font-mono text-xs text-zinc-500">
          <span>Вы — белые ♔</span>
          <span>Робот — чёрные ♚</span>
        </div>
      </div>
    </section>
  )
}