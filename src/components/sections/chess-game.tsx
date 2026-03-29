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
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">
        <div className="text-center">
          <div className="mb-2 inline-block rounded-full border border-foreground/20 bg-foreground/10 px-4 py-1.5 backdrop-blur-md">
            <p className="font-mono text-xs text-foreground/80">♟ Шахматы</p>
          </div>
          <h2 className="font-sans text-3xl font-light tracking-tight text-foreground md:text-4xl">
            Сыграй с роботом
          </h2>
        </div>

        <div className="rounded-xl border border-foreground/20 bg-foreground/10 px-4 py-2 backdrop-blur-md">
          <p className="font-mono text-sm text-foreground/90">{status}</p>
        </div>

        <div className="relative">
          <div className="flex">
            <div className="flex flex-col justify-around pr-2">
              {ranks.map(r => (
                <span key={r} className="font-mono text-xs text-foreground/40 w-3 text-center">{r}</span>
              ))}
            </div>
            <div className="border border-foreground/20 rounded-lg overflow-hidden shadow-2xl">
              {board.map((row, r) => (
                <div key={r} className="flex">
                  {row.map((sq, c) => {
                    const isLight = (r + c) % 2 === 0
                    const isSelected = selected?.[0] === r && selected?.[1] === c
                    const isValid = validMoves.some(([vr, vc]) => vr === r && vc === c)
                    const isLastFrom = lastMove?.from[0] === r && lastMove?.from[1] === c
                    const isLastTo = lastMove?.to[0] === r && lastMove?.to[1] === c

                    let bg = isLight ? "bg-amber-100" : "bg-amber-800"
                    if (isSelected) bg = "bg-yellow-400"
                    else if (isLastFrom || isLastTo) bg = isLight ? "bg-yellow-200" : "bg-yellow-600"

                    return (
                      <div
                        key={c}
                        onClick={() => handleSquareClick(r, c)}
                        className={`relative flex items-center justify-center w-[42px] h-[42px] sm:w-[52px] sm:h-[52px] md:w-[60px] md:h-[60px] ${bg} cursor-pointer transition-colors duration-100 select-none`}
                      >
                        {isValid && (
                          <div className={`absolute inset-0 flex items-center justify-center ${sq ? "ring-4 ring-inset ring-red-500/70" : ""}`}>
                            {!sq && <div className="w-3 h-3 rounded-full bg-black/25" />}
                          </div>
                        )}
                        {sq && (
                          <span className={`text-2xl sm:text-3xl md:text-4xl leading-none select-none ${sq.color === "w" ? "drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : "drop-shadow-[0_1px_2px_rgba(255,255,255,0.3)]"}`}>
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
          <div className="flex justify-around pl-5 pt-1">
            {files.map(f => (
              <span key={f} className="font-mono text-xs text-foreground/40 w-[42px] sm:w-[52px] md:w-[60px] text-center">{f}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={resetGame}
            className="rounded-lg border border-foreground/20 bg-foreground/10 px-5 py-2.5 font-sans text-sm font-medium text-foreground/90 backdrop-blur-md transition-all hover:bg-foreground/20 hover:text-foreground"
          >
            Новая игра
          </button>
        </div>

        <div className="flex gap-6 font-mono text-xs text-foreground/50">
          <span>Вы — белые ♔</span>
          <span>Робот — чёрные ♚</span>
        </div>
      </div>
    </section>
  )
}
