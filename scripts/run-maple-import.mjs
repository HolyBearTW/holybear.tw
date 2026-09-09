const args = process.argv.slice(2);
const source = String(args[0] || '').toLowerCase();

if (source === 'nexon_guild') {
  const { runGuildImport } = await import('./run-guild-import.mjs');
  await runGuildImport(args.slice(1));
  process.exit(0);
}

if (source === 'manual') {
  const { runManualSeedImport } = await import('./run-manual-seed-import.mjs');
  const { clearRuntimeState } = await import('./manual-import-runtime.mjs');
  try {
    await runManualSeedImport(args.slice(1));
  } finally {
    if (process.env.HOLYBEAR_MANUAL_IMPORT_BACKGROUND === '1') clearRuntimeState(process.pid);
  }
  process.exit(0);
}

throw new Error('Usage: yarn import:maple <nexon_guild|manual> [options]');
