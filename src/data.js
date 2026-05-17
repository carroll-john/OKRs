export const DEMO_CREDENTIALS = {
  email: "demo.manager@example.com",
  password: "demo-password",
};

export const PLAN_MODEL_VERSION = 3;

export const CONFIDENCE_OPTIONS = ["LOW", "MEDIUM", "HIGH"];
export const KR_STATUS_OPTIONS = ["ON_TRACK", "AT_RISK", "OFF_TRACK"];
export const INITIATIVE_STATUS_OPTIONS = ["NOT_STARTED", "IN_PROGRESS", "BLOCKED", "DONE"];

export const DEMO_PLAN = {
  modelVersion: PLAN_MODEL_VERSION,
  activeWorkspaceId: "workspace-product-eng",
  activeCycleId: "cycle-q2-2026",
  user: {
    id: "user-demo-manager",
    name: "Demo Manager",
    email: DEMO_CREDENTIALS.email,
  },
  workspaces: [
    {
      id: "workspace-product-eng",
      name: "Product & Eng Team",
    },
  ],
  memberships: [
    {
      id: "membership-demo-manager",
      userId: "user-demo-manager",
      workspaceId: "workspace-product-eng",
      name: "Demo Manager",
      role: "Manager",
    },
    {
      id: "membership-product-lead",
      userId: "user-product-lead",
      workspaceId: "workspace-product-eng",
      name: "Priya Shah",
      role: "Product lead",
    },
    {
      id: "membership-engineering-lead",
      userId: "user-engineering-lead",
      workspaceId: "workspace-product-eng",
      name: "Marcus Lee",
      role: "Engineering lead",
    },
    {
      id: "membership-data-lead",
      userId: "user-data-lead",
      workspaceId: "workspace-product-eng",
      name: "Taylor Nguyen",
      role: "Data lead",
    },
  ],
  cycles: [
    {
      id: "cycle-q2-2026",
      workspaceId: "workspace-product-eng",
      name: "Q2 2026",
      startsOn: "2026-04-01",
      endsOn: "2026-06-30",
    },
  ],
  objectives: [
    {
      id: "objective-improve-activation",
      cycleId: "cycle-q2-2026",
      title: "Improve activation",
      ownerMembershipId: "membership-demo-manager",
    },
  ],
  keyResults: [
    {
      id: "kr-increase-activation-rate",
      objectiveId: "objective-improve-activation",
      ownerMembershipId: "membership-product-lead",
      title: "Increase activation rate",
      metricUnit: "%",
      baseline: 28,
      target: 40,
    },
    {
      id: "kr-reduce-setup-friction",
      objectiveId: "objective-improve-activation",
      ownerMembershipId: "membership-engineering-lead",
      title: "Reduce setup friction",
      metricUnit: "steps",
      baseline: 5,
      target: 2,
    },
  ],
  initiatives: [
    {
      id: "initiative-revised-onboarding",
      keyResultId: "kr-increase-activation-rate",
      ownerMembershipId: "membership-product-lead",
      title: "Ship revised onboarding variant",
      status: "IN_PROGRESS",
      dueDate: "2026-05-22",
      notes: "Test a shorter onboarding path with the next beta cohort.",
    },
    {
      id: "initiative-experiment-delay",
      keyResultId: "kr-increase-activation-rate",
      ownerMembershipId: "membership-data-lead",
      title: "Resolve experiment analysis delay",
      status: "BLOCKED",
      dueDate: "2026-05-15",
      notes: "Analytics event QA is blocking the experiment readout.",
    },
    {
      id: "initiative-activation-learnings",
      keyResultId: "kr-increase-activation-rate",
      ownerMembershipId: "membership-demo-manager",
      title: "Publish activation learnings",
      status: "NOT_STARTED",
      dueDate: "2026-06-07",
      notes: "Summarise activation findings for the product and engineering leads.",
    },
    {
      id: "initiative-setup-dropoff-audit",
      keyResultId: "kr-reduce-setup-friction",
      ownerMembershipId: "membership-data-lead",
      title: "Audit account setup drop-off points",
      status: "DONE",
      dueDate: "2026-04-30",
      notes: "Completed funnel review for account setup and first project creation.",
    },
    {
      id: "initiative-empty-state",
      keyResultId: "kr-reduce-setup-friction",
      ownerMembershipId: "membership-engineering-lead",
      title: "Simplify first project empty state",
      status: "IN_PROGRESS",
      dueDate: "2026-05-29",
      notes: "Reduce first-project setup choices and expose the next best action.",
    },
  ],
  weeklyUpdates: [
    {
      id: "weekly-activation-2026-05-11",
      keyResultId: "kr-increase-activation-rate",
      userId: "user-demo-manager",
      weekStart: "2026-05-11",
      value: 31,
      confidence: "MEDIUM",
      status: "AT_RISK",
      blockers: "Experiment analysis delayed",
      nextStep: "Ship revised onboarding variant",
    },
  ],
};

export function cloneDemoPlan() {
  return structuredClone(DEMO_PLAN);
}
