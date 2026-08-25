import { toFloat32 } from './float32'

// 萌獸終傷需逐條取 float32 再相加（遊戲內運算順序）
// 主萌獸每條 20%（超貴萌獸 25%），羈絆萌獸每條 2%（上限 4 條 / 8%）。
// 20% 與 25% 互斥：整組主萌獸要嘛全 20%、要嘛全 25%，不會混用。
// 由單一數值推測組成：優先嘗試全 20%，無解才用全 25%；各自最小化羈絆條數。
function solveFamComposition(total: number) {
  // 以 mainStep（20 或 25）為主萌獸單位，搭配 2% 羈絆（0..4 條）湊出 total
  const solve = (mainStep: number) => {
    for (let bond = 0; bond <= 4; bond++) {
      const rest = total - bond * 2
      if (rest < 0) break
      if (rest % mainStep === 0) return { main: rest / mainStep, step: mainStep, bond }
    }
    return null
  }
  return solve(20) || solve(25)
}

/** 單一萌獸終傷總值 → 推測的逐條來源；無標準組合時視為一條非標準來源。 */
export function guessFamSources(famFinalPct: number): number[] {
  const total = Math.round(famFinalPct)
  if (total <= 0) return []
  const combo = solveFamComposition(total)
  if (!combo) return [total]
  return [
    ...Array.from({ length: combo.main }, () => combo.step),
    ...Array.from({ length: combo.bond }, () => 2),
  ]
}

export function overseasFamMult(famFinalPct: number): number {
  const total = Math.round(famFinalPct)
  if (total <= 0) return 1

  const combo = solveFamComposition(total)

  // 無法整除拆解時（如 20/25 互斥下湊不出的數字），退回一般職業單條 float32 算法
  if (!combo) return toFloat32(1 + total / 100)

  // 遊戲內以 float32 累加器逐條相加：從 1 開始，每加一條就回到 float32 精度
  // （與「先在 float64 加總再加 1」不同，這才是實際遊戲的運算順序）
  let acc = 1
  const mainAdd = toFloat32(combo.step / 100)
  for (let i = 0; i < combo.main; i++) acc = toFloat32(acc + mainAdd)
  for (let i = 0; i < combo.bond; i++) acc = toFloat32(acc + toFloat32(0.02))
  return acc
}

/**
 * 逐條來源 → float32 累加倍率。使用者明確提供各來源 %，不必猜測組成，
 * 也能處理 overseasFamMult 無法整除拆解的非標準來源。
 * 降冪排序＝遊戲內主萌獸（大）先、羈絆（小）後的累加順序，float32 結果穩定。
 */
export function famMultFromSources(sources: number[]): number {
  let acc = 1
  for (const s of [...sources].sort((a, b) => b - a)) acc = toFloat32(acc + toFloat32(s / 100))
  return acc
}

/** 逗號字串來源 → 數字陣列（過濾空白與非數字）。 */
export function parseFamSources(raw: string | null | undefined): number[] {
  return String(raw ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x !== '')
    .map((x) => Number(x))
    .filter((x) => !Number.isNaN(x))
}

/**
 * 解析萌獸終傷倍率：
 * - 有逐條來源 → 直接用來源做 float32 累加（不猜測組成）。
 *   buff/裝備 delta 超出逐條加總的部分，併為額外一條，保留既有 buff/delta 行為。
 * - 無來源（null/空陣列）→ 沿用 overseasFamMult(resolvedPct)，與黃金值逐位一致。
 */
export function resolveFamMult(sources: number[] | null | undefined, resolvedPct: number): number {
  if (!sources || sources.length === 0) return overseasFamMult(resolvedPct)
  const list = [...sources]
  const extra = resolvedPct - list.reduce((a, b) => a + b, 0)
  if (Math.abs(extra) > 1e-9) list.push(extra)
  return famMultFromSources(list)
}
