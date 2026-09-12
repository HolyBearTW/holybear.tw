import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const manifestUrl = new URL('../public/themes/upon-the-sky/map-200090010.json', import.meta.url)
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))

function findObject(layerNumber, l2) {
  const layer = manifest.objects.layers.find((entry) => entry.layer === layerNumber)
  return layer?.objects.find((entry) => entry.l2 === String(l2))
}

test('keeps the audited WZ origins for the Ossyria ship parts', () => {
  assert.deepEqual(findObject(1, 2)?.origin, { x: 366, y: 172 })
  assert.deepEqual(findObject(1, 0)?.origin, { x: 69, y: 122 })

  const exhaust = findObject(3, 13)
  assert.deepEqual(exhaust?.frames?.[0]?.origin, { x: 91, y: 77 })
  assert.deepEqual(exhaust?.frames?.[1]?.origin, { x: 86, y: 77 })
})

test('does not alter the WZ placement metadata while correcting origins', () => {
  assert.deepEqual(
    {
      layer: 1,
      x: findObject(1, 2)?.x,
      y: findObject(1, 2)?.y,
      z: findObject(1, 2)?.z,
      zM: findObject(1, 2)?.zM,
    },
    { layer: 1, x: -52, y: 97, z: 3, zM: 0 },
  )

  assert.deepEqual(
    {
      layer: 3,
      x: findObject(3, 13)?.x,
      y: findObject(3, 13)?.y,
      z: findObject(3, 13)?.z,
      zM: findObject(3, 13)?.zM,
    },
    { layer: 3, x: -156, y: 273, z: 5, zM: 1 },
  )
})
