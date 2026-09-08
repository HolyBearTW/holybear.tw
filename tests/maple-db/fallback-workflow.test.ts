import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';

const workflowUrl = new URL('../../.github/workflows/account-signals-fallback.yml', import.meta.url);

describe('account-signals fallback workflow policy', () => {
  it('parses and grants Actions write only to the isolated cleanup job', async () => {
    const workflow = parse(await readFile(workflowUrl, 'utf8'));
    expect(workflow.permissions).toEqual({});
    expect(workflow.jobs.fallback.permissions).toEqual({});
    expect(workflow.jobs.cleanup.permissions).toEqual({ actions: 'write' });
    expect(workflow.jobs.cleanup.needs).toBe('fallback');
    expect(workflow.jobs.cleanup.if).toBe('always()');
    expect(workflow.jobs.cleanup.steps).toHaveLength(1);
    expect(workflow.jobs.cleanup.steps[0]['continue-on-error']).toBe(true);
    expect(workflow.jobs.cleanup.steps[0].with['github-token']).toContain('github.token');
  });

  it('only deletes completed runs from this workflow after the newest ten', async () => {
    const workflow = parse(await readFile(workflowUrl, 'utf8'));
    const script = workflow.jobs.cleanup.steps[0].with.script as string;
    const runs = Array.from({ length: 14 }, (_, index) => ({
      id: 1_000 + index,
      run_number: index + 1,
      status: index === 2 ? 'in_progress' : 'completed',
      conclusion: index % 3 === 0 ? 'failure' : index % 3 === 1 ? 'cancelled' : 'success',
    }));
    runs.push({ id: 9_999, run_number: 99, status: 'completed', conclusion: 'success' });
    const listWorkflowRuns = vi.fn();
    const deleteWorkflowRun = vi.fn(async (_request: { run_id: number }) => ({}));
    const github = {
      paginate: vi.fn(async (method, parameters) => {
        expect(method).toBe(listWorkflowRuns);
        expect(parameters).toMatchObject({
          owner: 'HolyBear', repo: 'holybear.tw',
          workflow_id: 'account-signals-fallback.yml', status: 'completed', per_page: 100,
        });
        return runs;
      }),
      rest: { actions: { listWorkflowRuns, deleteWorkflowRun } },
    };
    const context = { runId: 9_999, repo: { owner: 'HolyBear', repo: 'holybear.tw' } };
    const execute = new Function(
      'github', 'context', 'console',
      `return (async () => { ${script} })();`,
    );
    await execute(github, context, { log: vi.fn() });
    const deletedIds = deleteWorkflowRun.mock.calls.map(([request]) => request.run_id);
    expect(deletedIds).toEqual([1_003, 1_001, 1_000]);
    expect(deletedIds).not.toContain(context.runId);
    const retainedConclusions = runs.filter((run) => run.status === 'completed' && run.id !== context.runId)
      .sort((left, right) => right.run_number - left.run_number)
      .slice(0, 10)
      .map((run) => run.conclusion);
    expect(retainedConclusions).toContain('failure');
    expect(retainedConclusions).toContain('cancelled');
  });

  it('does not expose workflow, run-id or token inputs', async () => {
    const source = await readFile(workflowUrl, 'utf8');
    const workflow = parse(source);
    expect(workflow.on.workflow_dispatch).toBeNull();
    expect(source).not.toMatch(/workflow_dispatch:\s*\n\s+inputs:/);
    expect(source).not.toContain('secrets.PAT');
    expect(source).not.toContain('workflow_id: ${{');
    expect(source).not.toContain('run_id: ${{');
  });
});
