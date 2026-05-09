'use client';

import { useEffect, useMemo, useState } from 'react';
import type { InitiativeStatus } from '@/lib/okr-workflow';
import { formatStatus } from '@/lib/okr-workflow';
import type { QuarterPlan, QuarterPlanInitiative, QuarterPlanKeyResult, QuarterPlanObjective } from '@/lib/quarter-plan';
import { summarizeQuarterPlan } from '@/lib/quarter-plan';

const initiativeStatuses: InitiativeStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'];

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createObjective(): QuarterPlanObjective {
  return {
    id: newId('objective'),
    title: '',
    ownerName: '',
    keyResults: [],
  };
}

function createKeyResult(): QuarterPlanKeyResult {
  return {
    id: newId('kr'),
    title: '',
    metricUnit: '%',
    baseline: 0,
    target: 100,
    ownerName: '',
    initiatives: [],
  };
}

function createInitiative(): QuarterPlanInitiative {
  return {
    id: newId('initiative'),
    title: '',
    ownerName: '',
    status: 'NOT_STARTED',
    dueDate: '',
    notes: '',
  };
}

function inputClass(extra = '') {
  return `min-h-10 rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-slate-500 ${extra}`;
}

function labelClass() {
  return 'grid gap-1 text-sm font-medium text-slate-700';
}

export function PlanQuarterClient({
  initialPlan,
  storageKey,
  demoMode,
}: {
  initialPlan: QuarterPlan;
  storageKey: string;
  demoMode: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasLoadedSavedPlan, setHasLoadedSavedPlan] = useState(false);
  const summary = useMemo(() => summarizeQuarterPlan(plan), [plan]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      try {
        setPlan(JSON.parse(saved) as QuarterPlan);
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }
    setHasLoadedSavedPlan(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hasLoadedSavedPlan) return;
    window.localStorage.setItem(storageKey, JSON.stringify(plan));
    setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [hasLoadedSavedPlan, plan, storageKey]);

  function updateObjective(objectiveId: string, patch: Partial<QuarterPlanObjective>) {
    setPlan((current) => ({
      ...current,
      objectives: current.objectives.map((objective) => objective.id === objectiveId ? { ...objective, ...patch } : objective),
    }));
  }

  function updateKeyResult(objectiveId: string, keyResultId: string, patch: Partial<QuarterPlanKeyResult>) {
    setPlan((current) => ({
      ...current,
      objectives: current.objectives.map((objective) => objective.id === objectiveId
        ? {
            ...objective,
            keyResults: objective.keyResults.map((keyResult) => keyResult.id === keyResultId ? { ...keyResult, ...patch } : keyResult),
          }
        : objective),
    }));
  }

  function updateInitiative(objectiveId: string, keyResultId: string, initiativeId: string, patch: Partial<QuarterPlanInitiative>) {
    setPlan((current) => ({
      ...current,
      objectives: current.objectives.map((objective) => objective.id === objectiveId
        ? {
            ...objective,
            keyResults: objective.keyResults.map((keyResult) => keyResult.id === keyResultId
              ? {
                  ...keyResult,
                  initiatives: keyResult.initiatives.map((initiative) => initiative.id === initiativeId ? { ...initiative, ...patch } : initiative),
                }
              : keyResult),
          }
        : objective),
    }));
  }

  function addObjective() {
    setPlan((current) => ({ ...current, objectives: [...current.objectives, createObjective()] }));
  }

  function addKeyResult(objectiveId: string) {
    setPlan((current) => ({
      ...current,
      objectives: current.objectives.map((objective) => objective.id === objectiveId
        ? { ...objective, keyResults: [...objective.keyResults, createKeyResult()] }
        : objective),
    }));
  }

  function addInitiative(objectiveId: string, keyResultId: string) {
    setPlan((current) => ({
      ...current,
      objectives: current.objectives.map((objective) => objective.id === objectiveId
        ? {
            ...objective,
            keyResults: objective.keyResults.map((keyResult) => keyResult.id === keyResultId
              ? { ...keyResult, initiatives: [...keyResult.initiatives, createInitiative()] }
              : keyResult),
          }
        : objective),
    }));
  }

  function removeObjective(objectiveId: string) {
    setPlan((current) => ({ ...current, objectives: current.objectives.filter((objective) => objective.id !== objectiveId) }));
  }

  function removeKeyResult(objectiveId: string, keyResultId: string) {
    setPlan((current) => ({
      ...current,
      objectives: current.objectives.map((objective) => objective.id === objectiveId
        ? { ...objective, keyResults: objective.keyResults.filter((keyResult) => keyResult.id !== keyResultId) }
        : objective),
    }));
  }

  function removeInitiative(objectiveId: string, keyResultId: string, initiativeId: string) {
    setPlan((current) => ({
      ...current,
      objectives: current.objectives.map((objective) => objective.id === objectiveId
        ? {
            ...objective,
            keyResults: objective.keyResults.map((keyResult) => keyResult.id === keyResultId
              ? { ...keyResult, initiatives: keyResult.initiatives.filter((initiative) => initiative.id !== initiativeId) }
              : keyResult),
          }
        : objective),
    }));
  }

  function resetPlan() {
    setPlan(initialPlan);
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{plan.workspaceName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Plan Quarter</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Enter the OKR structure for {plan.cycleName}: objectives, measurable key results, and the initiatives the team will run to move those results.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {demoMode && <span className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-200">Saved in this browser</span>}
            {savedAt && <span className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">Saved {savedAt}</span>}
            <a href="/dashboard" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700">Review dashboard</a>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Plan summary">
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Objectives</p>
            <p className="mt-1 text-2xl font-semibold">{summary.objectiveCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Key results</p>
            <p className="mt-1 text-2xl font-semibold">{summary.keyResultCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Initiatives</p>
            <p className="mt-1 text-2xl font-semibold">{summary.initiativeCount}</p>
          </div>
          <div className="rounded border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-500">Blocked initiatives</p>
            <p className="mt-1 text-2xl font-semibold">{summary.blockedInitiativeCount}</p>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-5" aria-label="Quarter plan editor">
            {plan.objectives.map((objective, objectiveIndex) => (
              <article key={objective.id} className="rounded border border-slate-200 bg-white">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <label className={labelClass()}>
                        Objective {objectiveIndex + 1}
                        <input
                          className={inputClass()}
                          placeholder="What are we aiming for?"
                          value={objective.title}
                          onChange={(event) => updateObjective(objective.id, { title: event.target.value })}
                        />
                      </label>
                      <label className={labelClass()}>
                        Owner
                        <input
                          className={inputClass()}
                          placeholder="Owner"
                          value={objective.ownerName}
                          onChange={(event) => updateObjective(objective.id, { ownerName: event.target.value })}
                        />
                      </label>
                    </div>
                    <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-600" onClick={() => removeObjective(objective.id)}>Remove</button>
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  {objective.keyResults.map((keyResult, keyResultIndex) => (
                    <section key={keyResult.id} className="rounded border border-slate-200">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="grid flex-1 gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px_120px_180px]">
                            <label className={`${labelClass()} md:col-span-5`}>
                              Key result {keyResultIndex + 1}
                              <input
                                className={inputClass()}
                                placeholder="How do we know we are making progress?"
                                value={keyResult.title}
                                onChange={(event) => updateKeyResult(objective.id, keyResult.id, { title: event.target.value })}
                              />
                            </label>
                            <label className={labelClass()}>
                              Baseline
                              <input
                                className={inputClass()}
                                type="number"
                                value={keyResult.baseline}
                                onChange={(event) => updateKeyResult(objective.id, keyResult.id, { baseline: Number(event.target.value) })}
                              />
                            </label>
                            <label className={labelClass()}>
                              Target
                              <input
                                className={inputClass()}
                                type="number"
                                value={keyResult.target}
                                onChange={(event) => updateKeyResult(objective.id, keyResult.id, { target: Number(event.target.value) })}
                              />
                            </label>
                            <label className={labelClass()}>
                              Unit
                              <input
                                className={inputClass()}
                                value={keyResult.metricUnit}
                                onChange={(event) => updateKeyResult(objective.id, keyResult.id, { metricUnit: event.target.value })}
                              />
                            </label>
                            <label className={labelClass()}>
                              Owner
                              <input
                                className={inputClass()}
                                value={keyResult.ownerName}
                                onChange={(event) => updateKeyResult(objective.id, keyResult.id, { ownerName: event.target.value })}
                              />
                            </label>
                          </div>
                          <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-600" onClick={() => removeKeyResult(objective.id, keyResult.id)}>Remove KR</button>
                        </div>
                      </div>

                      <div className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold">Initiatives</h3>
                          <button type="button" className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white" onClick={() => addInitiative(objective.id, keyResult.id)}>Add initiative</button>
                        </div>
                        {keyResult.initiatives.length === 0 && (
                          <p className="rounded border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">No initiatives yet. Add the work the team will do to move this KR.</p>
                        )}
                        {keyResult.initiatives.map((initiative) => (
                          <div key={initiative.id} className="grid gap-3 rounded border border-slate-200 p-3 md:grid-cols-[minmax(0,1fr)_160px_150px_160px_auto]">
                            <label className={labelClass()}>
                              Initiative
                              <input
                                className={inputClass()}
                                placeholder="What will we do?"
                                value={initiative.title}
                                onChange={(event) => updateInitiative(objective.id, keyResult.id, initiative.id, { title: event.target.value })}
                              />
                            </label>
                            <label className={labelClass()}>
                              Owner
                              <input
                                className={inputClass()}
                                value={initiative.ownerName}
                                onChange={(event) => updateInitiative(objective.id, keyResult.id, initiative.id, { ownerName: event.target.value })}
                              />
                            </label>
                            <label className={labelClass()}>
                              Status
                              <select
                                className={inputClass()}
                                value={initiative.status}
                                onChange={(event) => updateInitiative(objective.id, keyResult.id, initiative.id, { status: event.target.value as InitiativeStatus })}
                              >
                                {initiativeStatuses.map((status) => (
                                  <option key={status} value={status}>{formatStatus(status)}</option>
                                ))}
                              </select>
                            </label>
                            <label className={labelClass()}>
                              Due
                              <input
                                className={inputClass()}
                                type="date"
                                value={initiative.dueDate}
                                onChange={(event) => updateInitiative(objective.id, keyResult.id, initiative.id, { dueDate: event.target.value })}
                              />
                            </label>
                            <button type="button" className="self-end rounded border border-slate-300 px-3 py-2 text-sm text-slate-600" onClick={() => removeInitiative(objective.id, keyResult.id, initiative.id)}>Remove</button>
                            <label className={`${labelClass()} md:col-span-5`}>
                              Notes
                              <input
                                className={inputClass()}
                                placeholder="Context, risks, dependencies"
                                value={initiative.notes}
                                onChange={(event) => updateInitiative(objective.id, keyResult.id, initiative.id, { notes: event.target.value })}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                  <button type="button" className="rounded bg-slate-950 px-3 py-2 text-sm font-medium text-white" onClick={() => addKeyResult(objective.id)}>Add key result</button>
                </div>
              </article>
            ))}

            <button type="button" className="min-h-11 rounded bg-slate-950 px-4 py-2 text-sm font-medium text-white" onClick={addObjective}>Add objective</button>
          </section>

          <aside className="h-fit rounded border border-slate-200 bg-white p-4 lg:sticky lg:top-6">
            <h2 className="text-base font-semibold">Planning checklist</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><span className="font-medium text-slate-950">1. Objectives:</span> clear outcomes for the quarter.</p>
              <p><span className="font-medium text-slate-950">2. Key Results:</span> measurable proof of progress.</p>
              <p><span className="font-medium text-slate-950">3. Initiatives:</span> work the team will do to move the KRs.</p>
              <p><span className="font-medium text-slate-950">Next:</span> weekly check-ins will update KR movement and initiative status.</p>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button type="button" className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700" onClick={resetPlan}>Reset demo plan</button>
              <a href="/dashboard" className="rounded bg-slate-950 px-3 py-2 text-center text-sm font-medium text-white">Review dashboard</a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
