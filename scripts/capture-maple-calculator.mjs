import { writeFile } from 'node:fs/promises'

const debugPort = Number(process.env.CHROME_DEBUG_PORT || 9333)
const baseUrl = process.env.MAPLE_DEV_URL || 'http://localhost:5173/maplestory/'
const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
const action = process.argv[2] || 'inspect'
const screenshotPath = process.argv[3]
const viewportWidth = Number(process.env.CAPTURE_WIDTH || 1440)
const viewportHeight = Number(process.env.CAPTURE_HEIGHT || 1100)

const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json())
const target = targets.find((item) => item.type === 'page')
if (!target?.webSocketDebuggerUrl) throw new Error(`找不到 Chrome ${debugPort} 的可偵錯頁面`)

const socket = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
let nextId = 1

const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = nextId++
  pending.set(id, { resolve, reject })
  socket.send(JSON.stringify({ id, method, params }))
})

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || '頁面指令執行失敗')
  return result.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', {
  width: viewportWidth,
  height: viewportHeight,
  deviceScaleFactor: 1,
  mobile: viewportWidth <= 500,
})
await send('Emulation.setTouchEmulationEnabled', {
  enabled: viewportWidth <= 500,
  maxTouchPoints: viewportWidth <= 500 ? 5 : 1,
})

if (!target.url.replace(/\/$/, '').startsWith(normalizedBaseUrl)) {
  await send('Page.navigate', { url: baseUrl })
  await wait(3500)
}

if (action === 'inspect') {
  const details = await evaluate(`JSON.stringify({
    url: location.href,
    title: document.title,
    inputs: [...document.querySelectorAll('input')].map((node) => ({ placeholder: node.placeholder, value: node.value, type: node.type })),
    buttons: [...document.querySelectorAll('button')].map((node) => node.innerText.trim()).filter(Boolean),
    layers: ['.maple-calculator-backdrop', '.VPNav', 'header.VPNav'].map((selector) => {
      const node = document.querySelector(selector);
      if (!node) return { selector, missing: true };
      const style = getComputedStyle(node);
      return { selector, position: style.position, zIndex: style.zIndex, transform: style.transform, parent: node.parentElement?.className };
    }),
    text: document.body.innerText.slice(0, 6000),
  }, null, 2)`)
  process.stdout.write(details)
}

if (action === 'reload') {
  await send('Page.reload', { ignoreCache: true })
  await wait(22000)
}

if (action === 'navigate') {
  await send('Page.navigate', { url: baseUrl })
  await wait(5000)
}

if (action === 'tour-reset') {
  const result = await evaluate(`(() => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('maple-feature-tour-v1:'))
      .forEach((key) => localStorage.removeItem(key));
    location.reload();
    return { ok: true };
  })()`)
  console.log(JSON.stringify(result))
  await wait(5000)
}

if (action.startsWith('page-click:')) {
  const label = action.slice('page-click:'.length)
  const result = await evaluate(`(() => {
    const target = [...document.querySelectorAll('button, [role="button"]')]
      .find((node) => node.innerText.trim() === ${JSON.stringify(label)});
    if (!target) return { ok: false, reason: 'target-not-found' };
    target.click();
    return { ok: true, text: target.innerText.trim() };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action === 'theme:light' || action === 'theme:dark') {
  const dark = action.endsWith('dark')
  const result = await evaluate(`(() => {
    document.documentElement.classList.toggle('dark', ${dark});
    document.documentElement.style.colorScheme = ${JSON.stringify(dark ? 'dark' : 'light')};
    localStorage.setItem('vitepress-theme-appearance', ${JSON.stringify(dark ? 'dark' : 'light')});
    return { ok: true, dark: document.documentElement.classList.contains('dark') };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action === 'query') {
  const characterName = process.env.MAPLE_CHARACTER || '霍剛小熊'
  const result = await evaluate(`(() => {
    const input = [...document.querySelectorAll('input')].find((node) => /角色|名稱|暱稱/.test(node.placeholder || ''));
    if (!input) return { ok: false, reason: 'input-not-found' };
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(characterName)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const button = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')]
      .find((node) => /開始查詢|查詢/.test(node.innerText || node.value || ''));
    if (button) button.click();
    else if (input.closest('form')) input.closest('form').requestSubmit();
    else input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    return { ok: true, button: button?.innerText?.trim() || 'form-submit' };
  })()`)
  console.log(JSON.stringify(result))
  await wait(10000)
  console.log(await evaluate(`document.body.innerText.slice(0, 3000)`))
}

if (action === 'open') {
  const result = await evaluate(`(() => {
    const button = document.querySelector('.maple-calculator-open-button')
      || [...document.querySelectorAll('button')].find((node) => /戰力計算機|計算機/.test(node.innerText));
    if (!button) return { ok: false, reason: 'calculator-button-not-found' };
    button.click();
    return { ok: true, button: button.innerText.trim() };
  })()`)
  console.log(JSON.stringify(result))
  await wait(2500)
}

if (action.startsWith('tab:')) {
  const label = action.slice(4)
  const result = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.innerText.trim() === ${JSON.stringify(label)});
    if (!button) return { ok: false, reason: 'tab-not-found', labels: [...document.querySelectorAll('button')].map((node) => node.innerText.trim()).filter(Boolean) };
    button.click();
    return { ok: true };
  })()`)
  console.log(JSON.stringify(result))
  await wait(1800)
}

if (action.startsWith('page-hover:')) {
  const label = action.slice('page-hover:'.length)
  const target = await evaluate(`(() => {
    const target = [...document.querySelectorAll('button, [role="button"]')]
      .find((node) => node.innerText.trim() === ${JSON.stringify(label)});
    if (!target) return { ok: false, reason: 'hover-target-not-found' };
    const rect = target.getBoundingClientRect();
    return { ok: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`)
  if (target.ok) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y })
  console.log(JSON.stringify(target))
  await wait(900)
}

if (action.startsWith('page-scroll:')) {
  const label = action.slice('page-scroll:'.length)
  const result = await evaluate(`(() => {
    const target = [...document.querySelectorAll('h1, h2, h3, h4'), ...document.querySelectorAll('section, div')]
      .find((node) => node.childElementCount <= 3 && node.textContent?.trim().includes(${JSON.stringify(label)}));
    if (!target) return { ok: false, reason: 'target-not-found' };
    target.scrollIntoView({ block: 'start', inline: 'nearest' });
    window.scrollBy(0, -90);
    return { ok: true, tag: target.tagName, text: target.textContent.trim().slice(0, 160) };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('page-scroll-force:')) {
  const label = action.slice('page-scroll-force:'.length)
  const result = await evaluate(`(() => {
    const target = [...document.querySelectorAll('h1, h2, h3, h4')]
      .find((node) => node.textContent?.trim().includes(${JSON.stringify(label)}));
    if (!target) return { ok: false, reason: 'target-not-found' };
    const top = target.getBoundingClientRect().top + window.scrollY - 90;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, top);
    return { ok: true, top, scrollY: window.scrollY, rectTop: target.getBoundingClientRect().top };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('page-aria:')) {
  const label = action.slice('page-aria:'.length)
  const result = await evaluate(`(() => {
    const targets = [...document.querySelectorAll('[aria-label]')].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4 && node.getAttribute('aria-label')?.includes(${JSON.stringify(label)});
    });
    const target = targets.find((node) => node.tagName === 'BUTTON') || targets[0];
    if (!target) return { ok: false, reason: 'target-not-found', labels: [...document.querySelectorAll('[aria-label]')].map((node) => node.getAttribute('aria-label')).filter(Boolean).slice(0, 160) };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.click();
    return { ok: true, tag: target.tagName, label: target.getAttribute('aria-label'), pressed: target.getAttribute('aria-pressed') };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('radar-hover:')) {
  const index = Math.max(0, Number(action.slice('radar-hover:'.length)) || 0)
  const result = await evaluate(`(() => {
    const target = document.querySelector('[data-radar-index="${index}"]');
    if (!target) return { ok: false, reason: 'radar-point-not-found' };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return { ok: true, index: ${index} };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('growth-hover:')) {
  const index = Math.max(0, Number(action.slice('growth-hover:'.length)) || 0)
  const target = await evaluate(`(() => {
    const points = [...document.querySelectorAll('.maple-growth-chart .recharts-line-dots circle')];
    const point = points[${index}];
    if (!point) return { ok: false, reason: 'growth-point-not-found', count: points.length };
    point.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = point.getBoundingClientRect();
    return { ok: true, count: points.length, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`)
  if (target.ok) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y })
  console.log(JSON.stringify(target))
  await wait(900)
}

if (action.startsWith('union-zone-hover:')) {
  const zoneId = action.slice('union-zone-hover:'.length)
  const result = await evaluate(`(() => {
    const target = document.querySelector('[data-zone-id="${zoneId.replaceAll('"', '\\"')}"]');
    if (!target) return { ok: false, reason: 'union-zone-not-found' };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return new Promise((resolve) => requestAnimationFrame(() => {
      const activeCells = [...document.querySelectorAll('.maple-union-board-cell.is-zone-highlighted')];
      const activeLabel = document.querySelector('.maple-union-zone-label.is-active');
      resolve({ ok: true, zoneId: ${JSON.stringify(zoneId)}, activeCells: activeCells.length, label: activeLabel?.textContent?.trim(), tooltip: target.title });
    }));
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('union-member-hover:')) {
  const zoneId = action.slice('union-member-hover:'.length)
  const result = await evaluate(`(() => {
    const targets = [...document.querySelectorAll('[data-zone-id="${zoneId.replaceAll('"', '\\"')}"]')];
    const target = targets.find((node) => node.querySelector('img'));
    if (!target) return { ok: false, reason: 'union-member-not-found', cells: targets.length };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    return { ok: true, zoneId: ${JSON.stringify(zoneId)}, tooltip: target.title };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('shadow-click:') || action.startsWith('shadow-summary:')) {
  const label = action.slice(action.indexOf(':') + 1)
  const selector = action.startsWith('shadow-summary:') ? 'summary' : 'button, summary, [role="button"]'
  const result = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const nodes = [...host.shadowRoot.querySelectorAll(${JSON.stringify(selector)})];
    const visible = (node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4;
    };
    const target = nodes.find((node) => visible(node) && node.innerText.trim() === ${JSON.stringify(label)})
      || nodes.find((node) => visible(node) && node.innerText.includes(${JSON.stringify(label)}));
    if (!target) return {
      ok: false,
      reason: 'target-not-found',
      labels: nodes.map((node) => node.innerText.trim()).filter(Boolean).slice(0, 120),
    };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.click();
    return { ok: true, tag: target.tagName, text: target.innerText.trim() };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('shadow-aria:')) {
  const label = action.slice('shadow-aria:'.length)
  const result = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const nodes = [...host.shadowRoot.querySelectorAll('[aria-label]')];
    const visible = (node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4;
    };
    const exact = nodes.filter((node) => visible(node) && node.getAttribute('aria-label') === ${JSON.stringify(label)});
    const partial = nodes.filter((node) => visible(node) && node.getAttribute('aria-label')?.includes(${JSON.stringify(label)}));
    const target = exact.find((node) => node.tagName === 'BUTTON') || exact[0]
      || partial.find((node) => node.tagName === 'BUTTON') || partial[0];
    if (!target) return {
      ok: false,
      reason: 'target-not-found',
      labels: [...host.shadowRoot.querySelectorAll('[aria-label]')]
        .map((node) => node.getAttribute('aria-label')).filter(Boolean).slice(0, 120),
    };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.click();
    return { ok: true, tag: target.tagName, label: target.getAttribute('aria-label') };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action === 'buff-inspect') {
  const result = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    return {
      ok: true,
      buffs: [...host.shadowRoot.querySelectorAll('[data-buff-id]')].map((node) => ({
        id: node.getAttribute('data-buff-id'),
        type: node.getAttribute('data-buff-type'),
        value: node.querySelector('input')?.value,
        checked: node.querySelector('input')?.checked,
        alt: node.querySelector('img')?.alt,
        src: node.querySelector('img')?.src,
      })),
    };
  })()`)
  console.log(JSON.stringify(result, null, 2))
  await wait(500)
}

if (action === 'soul-tooltip-layout' || action === 'soul-tooltip-tap-layout') {
  const result = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    host?.shadowRoot?.querySelectorAll(':popover-open').forEach((node) => node.hidePopover());
    const target = [...(host?.shadowRoot?.querySelectorAll('[data-buff-id="skill:靈魂鬥志"]') || [])]
      .find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 4 && rect.height > 4;
      });
    if (!target) return { ok: false, reason: 'target-not-found' };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    const icon = target.querySelector('.buff-icon-wrap');
    const before = {
      target: target.getBoundingClientRect().toJSON(),
      icon: icon?.getBoundingClientRect().toJSON(),
    };
    if (${JSON.stringify(action)} === 'soul-tooltip-tap-layout') icon?.click();
    else icon?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const ancestors = [];
    for (let node = target; node && ancestors.length < 10; node = node.parentElement) {
      const style = getComputedStyle(node);
      ancestors.push({
        className: node.className,
        overflow: style.overflow,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        rect: node.getBoundingClientRect().toJSON(),
      });
    }
    return new Promise((resolve) => requestAnimationFrame(() => {
      const tooltip = target.querySelector('.buff-name-tooltip');
      resolve({
        ok: true,
        before,
        target: target.getBoundingClientRect().toJSON(),
        icon: icon?.getBoundingClientRect().toJSON(),
        tooltip: tooltip?.getBoundingClientRect().toJSON(),
        tooltipClass: tooltip?.className,
        tooltipOpen: tooltip?.matches(':popover-open'),
        coarsePointer: matchMedia('(hover: none), (pointer: coarse)').matches,
        ancestors,
      });
    }));
  })()`)
  console.log(JSON.stringify(result, null, 2))
  await wait(900)
}

if (action === 'soul-rule-check') {
  const result = await evaluate(`(async () => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const root = host.shadowRoot;
    const visible = (node) => {
      const rect = node?.getBoundingClientRect();
      return !!rect && rect.width > 4 && rect.height > 4;
    };
    const row = [...root.querySelectorAll('.tower-ring-cycle-row')].find(visible);
    if (!row) return { ok: false, reason: 'cycle-row-not-found' };
    const boxes = [...row.querySelectorAll('input[type="checkbox"]')];
    if (boxes.length < 2) return { ok: false, reason: 'cycle-checkboxes-not-found' };
    const [mugong, soul] = boxes;
    const initial = [mugong.checked, soul.checked];
    if (!soul.checked) soul.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const afterSoul = [mugong.checked, soul.checked];
    if (!mugong.checked) mugong.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const afterMugong = [mugong.checked, soul.checked];
    if (mugong.checked !== initial[0]) mugong.click();
    if (soul.checked !== initial[1]) soul.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return { ok: true, initial, afterSoul, afterMugong, restored: [mugong.checked, soul.checked] };
  })()`)
  console.log(JSON.stringify(result, null, 2))
  await wait(500)
}

if (action === 'soul-weapon-calculation-check') {
  const result = await evaluate(`(async () => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const root = host.shadowRoot;
    const checkbox = root.querySelector('input[aria-label="啟用新版靈魂武器"]');
    const level = root.querySelector('input[aria-label="靈魂武器等級"]');
    const power = root.querySelector('input[aria-label="靈魂武器共鳴攻擊"]');
    if (!checkbox || !level || !power) return { ok: false, reason: 'soul-fields-not-found' };
    const summaryText = () => [...root.querySelectorAll('*')]
      .find((node) => node.children.length === 0 && node.textContent.trim() === '目前官方戰力')
      ?.parentElement?.textContent.trim();
    const initial = { checked: checkbox.checked, level: level.value, power: power.value, summary: summaryText() };
    const changeValue = (input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    };
    if (!checkbox.checked) checkbox.click();
    changeValue(level, 70);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const changed = { checked: checkbox.checked, level: level.value, power: power.value, summary: summaryText() };
    changeValue(level, initial.level || 0);
    if (checkbox.checked !== initial.checked) checkbox.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return { ok: true, initial, changed, restored: { checked: checkbox.checked, level: level.value, power: power.value, summary: summaryText() } };
  })()`)
  console.log(JSON.stringify(result, null, 2))
  await wait(500)
}

if (action.startsWith('shadow-hover-aria:')) {
  const label = action.slice('shadow-hover-aria:'.length)
  const target = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const target = [...host.shadowRoot.querySelectorAll('[aria-label]')].find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4
        && node.getAttribute('aria-label') === ${JSON.stringify(label)};
    });
    if (!target) return { ok: false, reason: 'target-not-found' };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    const rect = target.getBoundingClientRect();
    return { ok: true, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`)
  if (target.ok) await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: target.x, y: target.y })
  console.log(JSON.stringify(target))
  await wait(900)
}

if (action.startsWith('shadow-press-aria:')) {
  const label = action.slice('shadow-press-aria:'.length)
  const result = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const nodes = [...host.shadowRoot.querySelectorAll('[aria-label]')];
    const visible = (node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4;
    };
    const exact = nodes.filter((node) => visible(node) && node.getAttribute('aria-label') === ${JSON.stringify(label)});
    const partial = nodes.filter((node) => visible(node) && node.getAttribute('aria-label')?.includes(${JSON.stringify(label)}));
    const target = exact.find((node) => node.tagName === 'BUTTON') || exact[0]
      || partial.find((node) => node.tagName === 'BUTTON') || partial[0];
    if (!target) return { ok: false, reason: 'target-not-found' };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true, button: 0 }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, button: 0 }));
    return { ok: true, tag: target.tagName, label: target.getAttribute('aria-label') };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('shadow-aria-index:')) {
  const rest = action.slice('shadow-aria-index:'.length)
  const separator = rest.indexOf(':')
  const index = Math.max(0, Number(rest.slice(0, separator)) || 0)
  const label = rest.slice(separator + 1)
  const result = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const matches = [...host.shadowRoot.querySelectorAll('[aria-label]')].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 4 && rect.height > 4
        && node.getAttribute('aria-label')?.includes(${JSON.stringify(label)});
    });
    const buttons = matches.filter((node) => node.tagName === 'BUTTON');
    const target = (buttons.length ? buttons : matches)[${index}];
    if (!target) return { ok: false, reason: 'target-not-found', count: matches.length };
    target.scrollIntoView({ block: 'center', inline: 'nearest' });
    target.click();
    return { ok: true, index: ${index}, count: buttons.length || matches.length, tag: target.tagName };
  })()`)
  console.log(JSON.stringify(result))
  await wait(900)
}

if (action.startsWith('shadow-scroll:')) {
  const label = action.slice('shadow-scroll:'.length)
  const result = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return { ok: false, reason: 'shadow-root-not-found' };
    const target = [...host.shadowRoot.querySelectorAll('*')]
      .find((node) => node.childElementCount <= 2 && node.textContent?.trim() === ${JSON.stringify(label)})
      || [...host.shadowRoot.querySelectorAll('*')]
        .find((node) => node.childElementCount <= 2 && node.textContent?.includes(${JSON.stringify(label)}));
    if (!target) return { ok: false, reason: 'target-not-found' };
    target.scrollIntoView({ block: 'start', inline: 'nearest' });
    return { ok: true, tag: target.tagName, className: target.className, text: target.textContent.trim().slice(0, 160) };
  })()`)
  console.log(JSON.stringify(result))
  await wait(700)
}

if (action.startsWith('modal-scroll:')) {
  const ratio = Math.max(0, Math.min(1, Number(action.slice('modal-scroll:'.length)) || 0))
  const result = await evaluate(`(() => {
    const scroller = document.querySelector('.maple-calculator-scroll');
    if (!scroller) return { ok: false, reason: 'modal-scroller-not-found' };
    scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * ${ratio};
    return { ok: true, top: scroller.scrollTop, height: scroller.scrollHeight, client: scroller.clientHeight };
  })()`)
  console.log(JSON.stringify(result))
  await wait(700)
}

if (action.startsWith('backdrop-scroll:')) {
  const ratio = Math.max(0, Math.min(1, Number(action.slice('backdrop-scroll:'.length)) || 0))
  const result = await evaluate(`(() => {
    const scroller = document.querySelector('.maple-calculator-backdrop');
    if (!scroller) return { ok: false, reason: 'modal-backdrop-not-found' };
    scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * ${ratio};
    return { ok: true, top: scroller.scrollTop, height: scroller.scrollHeight, client: scroller.clientHeight };
  })()`)
  console.log(JSON.stringify(result))
  await wait(700)
}

if (action === 'shadow-inspect') {
  const details = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    if (!host?.shadowRoot) return JSON.stringify({ ok: false, reason: 'shadow-root-not-found' });
    const root = host.shadowRoot;
    return JSON.stringify({
      ok: true,
      buttons: [...root.querySelectorAll('button')].map((node) => ({
        text: node.innerText.trim(),
        aria: node.getAttribute('aria-label'),
        pressed: node.getAttribute('aria-pressed'),
        disabled: node.disabled,
      })).filter((item) => item.text || item.aria),
      summaries: [...root.querySelectorAll('summary')].map((node) => node.innerText.trim()),
      dialogs: [...root.querySelectorAll('[role="dialog"]')].map((node) => ({
        label: node.getAttribute('aria-label') || node.getAttribute('aria-labelledby'),
        text: node.innerText.slice(0, 500),
      })),
      text: root.querySelector('.maplecombat-shell')?.innerText.slice(0, 10000) || '',
    }, null, 2);
  })()`)
  process.stdout.write(details)
}

if (action === 'mobile-layout') {
  const details = await evaluate(`(() => {
    const host = [...document.querySelectorAll('*')]
      .find((node) => node.shadowRoot?.querySelector('.maplecombat-shell'));
    const root = host?.shadowRoot;
    const describe = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        className: node.className,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        gridColumn: style.gridColumn,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        writingMode: style.writingMode,
        wordBreak: style.wordBreak,
        whiteSpace: style.whiteSpace,
      };
    };
    return JSON.stringify({
      viewport: { width: innerWidth, height: innerHeight },
      backdrop: describe(document.querySelector('.maple-calculator-backdrop')),
      panel: describe(document.querySelector('.maple-calculator-panel')),
      head: describe(document.querySelector('.maple-calculator-sticky-head')),
      scroll: describe(document.querySelector('.maple-calculator-scroll')),
      host: describe(host),
      bonusRow: describe(root?.querySelector('.stat-table--bonus .st-row')),
      groupTitle: describe(root?.querySelector('.stat-table--bonus .st-row-group-title')),
      weaponGroup: describe(root?.querySelector('.stat-table--bonus .weapon-set-group')),
      bonusCells: [...(root?.querySelectorAll('.stat-table--bonus .st-row:first-child .st-cell') || [])].map(describe),
    }, null, 2);
  })()`)
  process.stdout.write(details)
}

if (action === 'dashboard-data') {
  const details = await evaluate(`(() => {
    const host = document.getElementById('maplestory-root');
    if (!host) return JSON.stringify({ ok: false, reason: 'maplestory-root-not-found' });
    const containerKey = Object.keys(host).find((key) => key.startsWith('__reactContainer$'));
    const fiberRoot = containerKey ? host[containerKey] : null;
    const visited = new WeakSet();
    let found = null;
    const inspectValue = (value, depth = 0) => {
      if (found || !value || typeof value !== 'object' || depth > 7 || visited.has(value)) return;
      visited.add(value);
      if (value.basic?.character_name && value.stat?.final_stat && value.equipment) {
        found = value;
        return;
      }
      for (const key of Object.keys(value).slice(0, 160)) {
        if (key === '_owner' || key === 'return' || key === 'child' || key === 'sibling') continue;
        try { inspectValue(value[key], depth + 1); } catch {}
        if (found) return;
      }
    };
    const walkFiber = (fiber) => {
      if (!fiber || found) return;
      inspectValue(fiber.memoizedProps);
      inspectValue(fiber.memoizedState);
      walkFiber(fiber.child);
      walkFiber(fiber.sibling);
    };
    walkFiber(fiberRoot?.current || fiberRoot);
    if (!found) return JSON.stringify({ ok: false, reason: 'dashboard-data-not-found' });
    const presetNo = Number(found.equipment?.preset_no || 0);
    const equipment = found.equipment?.['item_equipment_preset_' + presetNo] || found.equipment?.item_equipment || [];
    const hyperNo = Number(found.hyperStat?.use_preset_no || 1);
    return JSON.stringify({
      ok: true,
      ocid: found.ocid,
      basic: found.basic,
      finalStat: found.stat?.final_stat,
      equipment,
      ability: found.ability?.ability_info,
      hyperStat: found.hyperStat?.['hyper_stat_preset_' + hyperNo] || found.hyperStat?.hyper_stat_preset_1,
      linkSkill: found.linkSkill,
      unionRaider: found.unionRaider,
      unionArtifact: found.unionArtifact,
      unionChampion: found.unionChampion,
      petEquipment: found.petEquipment,
      symbolEquipment: found.symbolEquipment,
      setEffect: found.setEffect,
      hexaMatrixStat: found.hexaMatrixStat,
      familiar: (() => {
        const slots = found.familiar?.familiar_link_slot || [];
        const activeIds = new Set(slots.filter((slot) => String(slot.active_flag).toLowerCase() === 'true').map((slot) => String(slot.slot_id || '')));
        const cards = found.familiar?.familiar_list || found.familiar?.familiar_info || [];
        return {
          slots,
          active: cards.filter((card) => String(card.summoned_flag).toLowerCase() === 'true' || activeIds.has(String(card.slot_id || ''))),
        };
      })(),
      skills: [0, 1, 2, 3, 4, 5, 6].flatMap((index) => found['skill' + index]?.character_skill || []),
    }, null, 2);
  })()`)
  process.stdout.write(details)
}

if (action === 'equipment-api') {
  const characterName = process.env.MAPLE_CHARACTER || '怪獸小熊'
  const details = await evaluate(`(async () => {
    const apiKey = localStorage.getItem('nexon_api_key');
    if (!apiKey) return JSON.stringify({ ok: false, reason: 'nexon-api-key-not-found' });
    const headers = { 'x-nxopen-api-key': apiKey, accept: 'application/json' };
    const idResponse = await fetch('https://open.api.nexon.com/maplestorytw/v1/id?character_name=' + encodeURIComponent(${JSON.stringify(characterName)}), { headers });
    if (!idResponse.ok) return JSON.stringify({ ok: false, reason: 'id-fetch-failed', status: idResponse.status });
    const { ocid } = await idResponse.json();
    const equipmentResponse = await fetch('https://open.api.nexon.com/maplestorytw/v1/character/item-equipment?ocid=' + encodeURIComponent(ocid), { headers });
    const data = await equipmentResponse.json();
    const summarizeItem = (item) => ({
      slot: item?.item_equipment_slot,
      part: item?.item_equipment_part,
      name: item?.item_name,
      icon: item?.item_icon,
      specialRingLevel: item?.special_ring_level,
    });
    const summary = Object.fromEntries(Object.entries(data).map(([key, value]) => {
      if (!Array.isArray(value)) return [key, value];
      return [key, {
        count: value.length,
        rings: value.filter((item) => /ring|戒指/i.test(String(item?.item_equipment_slot || '') + String(item?.item_equipment_part || '') + String(item?.item_name || '')) || Number(item?.special_ring_level || 0) > 0).map(summarizeItem),
        weapons: value.filter((item) => item?.item_equipment_part === '武器' || item?.item_equipment_slot === '武器').map((item) => ({
          ...summarizeItem(item),
          soul_name: item?.soul_name,
          soul_option: item?.soul_option,
          soul_weapon_grade: item?.soul_weapon_grade,
          soul_weapon_level: item?.soul_weapon_level,
          soul_weapon_power_increase: item?.soul_weapon_power_increase,
          soul_weapon_option: item?.soul_weapon_option,
          soulKeys: Object.keys(item || {}).filter((name) => /soul/i.test(name)),
        })),
      }];
    }));
    return JSON.stringify({ ok: equipmentResponse.ok, status: equipmentResponse.status, summary }, null, 2);
  })()`)
  process.stdout.write(details)
}

if (action === 'dashboard-summary') {
  const details = await evaluate(`(() => {
    const host = document.getElementById('maplestory-root');
    const containerKey = host && Object.keys(host).find((key) => key.startsWith('__reactContainer$'));
    const fiberRoot = containerKey ? host[containerKey] : null;
    const visited = new WeakSet();
    let found = null;
    const inspectValue = (value, depth = 0) => {
      if (found || !value || typeof value !== 'object' || depth > 7 || visited.has(value)) return;
      visited.add(value);
      if (value.basic?.character_name && value.stat?.final_stat && value.equipment) { found = value; return; }
      for (const key of Object.keys(value).slice(0, 160)) {
        if (['_owner', 'return', 'child', 'sibling'].includes(key)) continue;
        try { inspectValue(value[key], depth + 1); } catch {}
        if (found) return;
      }
    };
    const walkFiber = (fiber) => {
      if (!fiber || found) return;
      inspectValue(fiber.memoizedProps);
      inspectValue(fiber.memoizedState);
      walkFiber(fiber.child);
      walkFiber(fiber.sibling);
    };
    walkFiber(fiberRoot?.current || fiberRoot);
    if (!found) return JSON.stringify({ ok: false, reason: 'dashboard-data-not-found' });
    const presetNo = Number(found.equipment?.preset_no || 0);
    const equipment = found.equipment?.['item_equipment_preset_' + presetNo] || found.equipment?.item_equipment || [];
    const optionKeys = ['str', 'dex', 'int', 'luk', 'max_hp', 'attack_power', 'magic_power', 'boss_damage', 'ignore_monster_armor', 'all_stat', 'damage'];
    const sumOptions = (section) => Object.fromEntries(optionKeys.map((key) => [key, equipment.reduce((sum, item) => sum + Number(item?.[section]?.[key] || 0), 0)]));
    const potentialLines = equipment.flatMap((item) => [
      item.potential_option_1, item.potential_option_2, item.potential_option_3,
      item.additional_potential_option_1, item.additional_potential_option_2, item.additional_potential_option_3,
    ].filter(Boolean).map((line) => item.item_name + ': ' + line));
    const hyperNo = Number(found.hyperStat?.use_preset_no || 1);
    const allSkills = [0, 1, 2, 3, 4, 5, 6].flatMap((index) => found['skill' + index]?.character_skill || []);
    const passiveSkills = allSkills.filter((skill) => /被動|永久|祝福|攻擊力增加|魔法攻擊力增加|屬性增加/.test((skill.skill_effect || '') + ' ' + (skill.skill_description || '')));
    const compactSkill = (skill) => ({ name: skill.skill_name, level: skill.skill_level, effect: skill.skill_effect });
    return JSON.stringify({
      ok: true,
      character: found.basic.character_name,
      job: found.basic.character_class,
      finalStat: found.stat?.final_stat,
      equipment: {
        itemCount: equipment.length,
        total: sumOptions('item_total_option'),
        base: sumOptions('item_base_option'),
        add: sumOptions('item_add_option'),
        etc: sumOptions('item_etc_option'),
        starforce: sumOptions('item_starforce_option'),
        exceptional: sumOptions('item_exceptional_option'),
        potentials: potentialLines,
        weapon: equipment.find((item) => item.item_equipment_slot === '武器' || item.item_equipment_part === '武器'),
        specialRings: equipment.filter((item) => Number(item.special_ring_level || 0) > 0).map((item) => ({ name: item.item_name, level: item.special_ring_level })),
      },
      ability: found.ability?.ability_info,
      hyperStat: found.hyperStat?.['hyper_stat_preset_' + hyperNo] || found.hyperStat?.hyper_stat_preset_1,
      links: (found.linkSkill?.character_link_skill || []).map(compactSkill).concat(found.linkSkill?.character_owned_link_skill ? [compactSkill(found.linkSkill.character_owned_link_skill)] : []),
      unionRaider: {
        raider: found.unionRaider?.union_raider_stat,
        occupied: found.unionRaider?.union_occupied_stat,
      },
      unionArtifact: found.unionArtifact?.union_artifact_effect,
      unionChampion: found.unionChampion?.champion_badge_total_info,
      pets: [1, 2, 3].map((index) => ({
        name: found.petEquipment?.['pet_' + index + '_name'],
        equipment: found.petEquipment?.['pet_' + index + '_equipment'],
        potential: found.petEquipment?.['pet_' + index + '_potential'],
      })),
      symbols: found.symbolEquipment?.symbol,
      setEffects: (found.setEffect?.set_effect || []).flatMap((set) => (set.set_effect_info || []).map((info) => ({ name: set.set_name, count: info.set_count, option: info.set_option }))),
      hexaStats: [
        ...(found.hexaMatrixStat?.character_hexa_stat_core || []),
        ...(found.hexaMatrixStat?.character_hexa_stat_core_2 || []),
        ...(found.hexaMatrixStat?.character_hexa_stat_core_3 || []),
      ],
      familiar: found.familiar,
      passiveSkills: passiveSkills.map(compactSkill),
    }, null, 2);
  })()`)
  process.stdout.write(details)
}

if (screenshotPath) {
  const { data } = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false,
  })
  await writeFile(screenshotPath, Buffer.from(data, 'base64'))
  console.log(`\nScreenshot: ${screenshotPath}`)
}

socket.close()
