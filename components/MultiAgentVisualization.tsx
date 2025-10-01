import { useState, useEffect, useRef, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import * as d3 from 'd3';

type AgentType = 'base' | 'proposal' | 'orchestrator';

type ConnectionType = 'feedback' | 'instruction' | 'coordination';

interface AgentState {
  id: string;
  type: AgentType;
  x: number;
  y: number;
  score: number;
  instruction: string;
  active: boolean;
  note: string;
}

interface Connection {
  source: string;
  target: string;
  type: ConnectionType;
  strength: number;
  rationale: string;
}

interface RoundData {
  round: number;
  summary: string;
  agents: AgentState[];
  connections: Connection[];
  bestScore: number;
  avgScore: number;
  orchestratorFocus: string;
}

const WIDTH = 680;
const HEIGHT = 520;
const MARGIN = { top: 18, right: 18, bottom: 18, left: 18 };

const BASE_POSITION = { x: WIDTH / 2, y: HEIGHT / 2 + 40 };
const ORCHESTRATOR_POSITION = { x: WIDTH / 2, y: 120 };
const PROPOSAL_RADIUS = 155;
const PROPOSAL_IDS = ['proposal-0', 'proposal-1', 'proposal-2', 'proposal-3', 'proposal-4'];

const createProposalLayout = () => {
  return PROPOSAL_IDS.reduce<Record<string, { x: number; y: number }>>((acc, id, index) => {
    const angle = (index / PROPOSAL_IDS.length) * 2 * Math.PI - Math.PI / 2;
    acc[id] = {
      x: BASE_POSITION.x + PROPOSAL_RADIUS * Math.cos(angle),
      y: BASE_POSITION.y + PROPOSAL_RADIUS * Math.sin(angle)
    };
    return acc;
  }, {});
};

const PROPOSAL_LAYOUT = createProposalLayout();

type RoundBuilderInput = {
  round: number;
  summary: string;
  orchestratorFocus: string;
  proposals: Array<{
    id: string;
    score: number;
    instruction: string;
    note: string;
    active?: boolean;
  }>;
  connections: Connection[];
  baseScore: number;
};

const buildRound = (config: RoundBuilderInput): RoundData => {
  const { round, summary, orchestratorFocus, proposals, connections, baseScore } = config;

  const proposalAgents: AgentState[] = proposals.map((p) => ({
    id: p.id,
    type: 'proposal',
    x: PROPOSAL_LAYOUT[p.id].x,
    y: PROPOSAL_LAYOUT[p.id].y,
    score: p.score,
    instruction: p.instruction,
    active: p.active ?? true,
    note: p.note
  }));

  const activeScores = proposalAgents.filter((agent) => agent.active).map((agent) => agent.score);
  const avgScore = activeScores.length
    ? activeScores.reduce((total, value) => total + value, 0) / activeScores.length
    : 0;
  const bestScore = activeScores.length ? Math.max(...activeScores) : 0;

  return {
    round,
    summary,
    orchestratorFocus,
    agents: [
      {
        id: 'base',
        type: 'base',
        x: BASE_POSITION.x,
        y: BASE_POSITION.y,
        score: baseScore,
        instruction: round === 0 ? 'Default system prompt' : 'Best proposal applied',
        active: round > 0,
        note: round === 0 ? 'Baseline performance before orchestration begins.' : 'Updated with top-performing instruction.'
      },
      {
        id: 'orchestrator',
        type: 'orchestrator',
        x: ORCHESTRATOR_POSITION.x,
        y: ORCHESTRATOR_POSITION.y,
        score: 0,
        instruction: 'Coordinates proposals',
        active: true,
        note: orchestratorFocus
      },
      ...proposalAgents
    ],
    connections,
    bestScore,
    avgScore
  };
};

const SCRIPTED_ROUNDS: RoundData[] = [
  buildRound({
    round: 0,
    summary: 'System bootstraps and positions agents; proposals are staged but inactive.',
    orchestratorFocus: 'Establish evaluation cadence and neighbour budget (max degree = 2).',
    baseScore: 0.52,
    proposals: PROPOSAL_IDS.map((id) => ({
      id,
      score: 0,
      instruction: 'Preparing candidate prompts',
      note: 'Awaiting first coordination update.',
      active: false
    })),
    connections: []
  }),
  buildRound({
    round: 1,
    summary: 'First coordination pass activates trace1.txt-inspired feedback (visual aids, pitfalls, examples) while scoring begins.',
    orchestratorFocus: 'Promote exploration: pair high-variance proposal P2 with P0/P4 and propagate trace-derived coaching cues.',
    baseScore: 0.52,
    proposals: [
      {
        id: 'proposal-0',
        score: 0.56,
        instruction: 'Decompose word problems into arithmetic subgoals and prompt for quick sketches/diagrams.',
        note: 'Incorporates trace1.txt feedback to simplify language and foreground visual aids.'
      },
      {
        id: 'proposal-1',
        score: 0.54,
        instruction: 'Chain-of-thought reasoning with a verification checklist and explicit “common pitfalls” call-outs.',
        note: 'Adopts the trace prompt to catalogue pitfalls learners should watch for.'
      },
      {
        id: 'proposal-2',
        score: 0.58,
        instruction: 'Emphasize variable tracking, final answer boxing, and embed short worked examples per step.',
        note: 'Top performer; surfaces formula-application examples as suggested in trace1.txt.'
      },
      {
        id: 'proposal-3',
        score: 0.51,
        instruction: 'Bullet-style reasoning with numeric deltas plus reminders to revisit and revise the plan.',
        note: 'Applies trace guidance to add “revise plan if needed” nudges for stuck states.'
      },
      {
        id: 'proposal-4',
        score: 0.57,
        instruction: 'Draft → critique workflow that ends with timed self-check prompts.',
        note: 'Blends error-spotting loop with trace1.txt’s time-management reminder.'
      }
    ],
    connections: [
      { source: 'orchestrator', target: 'proposal-0', type: 'coordination', strength: 0.82, rationale: 'Activate exploration track.' },
      { source: 'orchestrator', target: 'proposal-1', type: 'coordination', strength: 0.78, rationale: 'Seed verification checklist.' },
      { source: 'orchestrator', target: 'proposal-2', type: 'coordination', strength: 0.9, rationale: 'Share high-signal heuristics.' },
      { source: 'orchestrator', target: 'proposal-3', type: 'coordination', strength: 0.75, rationale: 'Lift underperforming branch.' },
      { source: 'orchestrator', target: 'proposal-4', type: 'coordination', strength: 0.84, rationale: 'Balance exploration/exploitation.' },
      { source: 'proposal-2', target: 'proposal-0', type: 'instruction', strength: 0.62, rationale: 'Share unit-check template.' },
      { source: 'proposal-2', target: 'proposal-4', type: 'instruction', strength: 0.58, rationale: 'Highlight answer verification steps.' },
      { source: 'proposal-4', target: 'proposal-1', type: 'instruction', strength: 0.54, rationale: 'Provide self-critique rubric.' },
      { source: 'proposal-2', target: 'base', type: 'feedback', strength: 0.44, rationale: 'Push highest utility instruction.' },
      { source: 'proposal-4', target: 'base', type: 'feedback', strength: 0.42, rationale: 'Complementary verification focus.' }
    ]
  }),
  buildRound({
    round: 2,
    summary: 'Coordination graph tightens; trace1.txt themes (examples, tooling, time budgeting) are woven into complementary roles.',
    orchestratorFocus: 'Lock in top performers while rescuing P3 through targeted pairing and reinforced trace feedback loops.',
    baseScore: 0.58,
    proposals: [
      {
        id: 'proposal-0',
        score: 0.6,
        instruction: 'Split problems into “plan → compute → justify” sections with mandatory diagram checkpoints.',
        note: 'Carries forward the trace1.txt emphasis on visual aids while tightening structure.'
      },
      {
        id: 'proposal-1',
        score: 0.59,
        instruction: 'Structured checklist with explicit sanity checks and annotated pitfall exemplars.',
        note: 'Upgrades the pitfalls idea with concrete scenarios from the trace feedback.'
      },
      {
        id: 'proposal-2',
        score: 0.63,
        instruction: 'Maintain a symbol table, highlight variable reuse, and pair each rule with worked examples.',
        note: 'Extends the trace recommendation to show how formulas are applied in practice.'
      },
      {
        id: 'proposal-3',
        score: 0.56,
        instruction: 'Annotate each arithmetic step with rationale tags and tool/technology suggestions.',
        note: 'Adds the trace prompt to recommend supportive tools when plans stall.'
      },
      {
        id: 'proposal-4',
        score: 0.64,
        instruction: 'Two-pass reasoning: draft, critique, and schedule time-budget reminders before final answer.',
        note: 'Blends critique rubric with the trace-driven time-management coaching.'
      }
    ],
    connections: [
      { source: 'orchestrator', target: 'proposal-0', type: 'coordination', strength: 0.86, rationale: 'Stabilise plan template.' },
      { source: 'orchestrator', target: 'proposal-1', type: 'coordination', strength: 0.83, rationale: 'Refine verification coverage.' },
      { source: 'orchestrator', target: 'proposal-2', type: 'coordination', strength: 0.92, rationale: 'Maintain high-utility heuristics.' },
      { source: 'orchestrator', target: 'proposal-3', type: 'coordination', strength: 0.82, rationale: 'Pair with stronger neighbour.' },
      { source: 'orchestrator', target: 'proposal-4', type: 'coordination', strength: 0.9, rationale: 'Double-down on critique pass.' },
      { source: 'proposal-0', target: 'proposal-3', type: 'instruction', strength: 0.56, rationale: 'Share structured plan scaffold.' },
      { source: 'proposal-4', target: 'proposal-1', type: 'instruction', strength: 0.6, rationale: 'Supply critique checklist.' },
      { source: 'proposal-2', target: 'proposal-4', type: 'instruction', strength: 0.63, rationale: 'Synchronise variable tracking.' },
      { source: 'proposal-4', target: 'base', type: 'feedback', strength: 0.5, rationale: 'Promote critique-enhanced instruction.' },
      { source: 'proposal-0', target: 'base', type: 'feedback', strength: 0.47, rationale: 'Provide structured planning prompt.' }
    ]
  }),
  buildRound({
    round: 3,
    summary: 'Graph reconfigures to support exploitation; lower performers receive focused mentorship.',
    orchestratorFocus: 'Use limited-degree budget to sustain diversity while converging on stable prompts.',
    baseScore: 0.64,
    proposals: [
      {
        id: 'proposal-0',
        score: 0.66,
        instruction: 'Plan → compute → justify with explicit numerical sanity check.',
        note: 'Now enforcing double-check before final answer.'
      },
      {
        id: 'proposal-1',
        score: 0.63,
        instruction: 'Checklist plus fail-fast guardrails for inconsistent units.',
        note: 'Coordination with P4 improved coverage.'
      },
      {
        id: 'proposal-2',
        score: 0.65,
        instruction: 'Symbol table with conflict resolution heuristics.',
        note: 'Focus shifts to keeping search broad.'
      },
      {
        id: 'proposal-3',
        score: 0.6,
        instruction: 'Rationale tags plus counter-example prompts.',
        note: 'Recovering via mentorship from P1.'
      },
      {
        id: 'proposal-4',
        score: 0.68,
        instruction: 'Critique-first prompt emphasising common error catalogue.',
        note: 'Leading instructions; drives base update.'
      }
    ],
    connections: [
      { source: 'orchestrator', target: 'proposal-0', type: 'coordination', strength: 0.88, rationale: 'Keep structured planner in the loop.' },
      { source: 'orchestrator', target: 'proposal-1', type: 'coordination', strength: 0.86, rationale: 'Mentor P3 using checklist assets.' },
      { source: 'orchestrator', target: 'proposal-2', type: 'coordination', strength: 0.9, rationale: 'Maintain exploration branch.' },
      { source: 'orchestrator', target: 'proposal-3', type: 'coordination', strength: 0.84, rationale: 'Targeted rescue with P1 support.' },
      { source: 'orchestrator', target: 'proposal-4', type: 'coordination', strength: 0.93, rationale: 'Exploit critique playbook.' },
      { source: 'proposal-1', target: 'proposal-3', type: 'instruction', strength: 0.58, rationale: 'Share fail-fast checks.' },
      { source: 'proposal-4', target: 'proposal-1', type: 'instruction', strength: 0.62, rationale: 'Fuse critique catalogue.' },
      { source: 'proposal-2', target: 'proposal-0', type: 'instruction', strength: 0.55, rationale: 'Keep structure adaptable.' },
      { source: 'proposal-4', target: 'base', type: 'feedback', strength: 0.57, rationale: 'Adopt critique-first instruction.' },
      { source: 'proposal-0', target: 'base', type: 'feedback', strength: 0.53, rationale: 'Provide stability via structured plan.' }
    ]
  }),
  buildRound({
    round: 4,
    summary: 'With strong candidates found, orchestrator narrows edges to enforce degree constraints.',
    orchestratorFocus: 'Hold onto two dominant prompts while rotating mentorship to maintain anytime readiness.',
    baseScore: 0.68,
    proposals: [
      {
        id: 'proposal-0',
        score: 0.69,
        instruction: 'Structured planner with success/failure exemplars.',
        note: 'Mentoring P3 on exemplars.'
      },
      {
        id: 'proposal-1',
        score: 0.66,
        instruction: 'Checklist plus auto-sanity macros.',
        note: 'Rotating off mentorship to focus on validation.'
      },
      {
        id: 'proposal-2',
        score: 0.7,
        instruction: 'Hybrid symbol tracking with inline validation prompts.',
        note: 'Maintaining diversity branch.'
      },
      {
        id: 'proposal-3',
        score: 0.64,
        instruction: 'Counter-example prompts with targeted hints.',
        note: 'Recovered; now supports error analysis.'
      },
      {
        id: 'proposal-4',
        score: 0.72,
        instruction: 'Critique-first prompt with escalation heuristics.',
        note: 'Still leading; ensures drop-in readiness.'
      }
    ],
    connections: [
      { source: 'orchestrator', target: 'proposal-0', type: 'coordination', strength: 0.87, rationale: 'Maintain mentor role.' },
      { source: 'orchestrator', target: 'proposal-2', type: 'coordination', strength: 0.91, rationale: 'Keep exploration alive.' },
      { source: 'orchestrator', target: 'proposal-3', type: 'coordination', strength: 0.85, rationale: 'Support error analysis channel.' },
      { source: 'orchestrator', target: 'proposal-4', type: 'coordination', strength: 0.94, rationale: 'Exploit leading candidate.' },
      { source: 'orchestrator', target: 'proposal-1', type: 'coordination', strength: 0.84, rationale: 'Retain verification guardrails.' },
      { source: 'proposal-0', target: 'proposal-3', type: 'instruction', strength: 0.57, rationale: 'Share exemplar-based hints.' },
      { source: 'proposal-2', target: 'proposal-4', type: 'instruction', strength: 0.6, rationale: 'Exchange validation prompts.' },
      { source: 'proposal-4', target: 'proposal-1', type: 'instruction', strength: 0.59, rationale: 'Keep critique rubric fresh.' },
      { source: 'proposal-4', target: 'base', type: 'feedback', strength: 0.63, rationale: 'Adopt critique-first candidate.' },
      { source: 'proposal-2', target: 'base', type: 'feedback', strength: 0.6, rationale: 'Hybrid tracker as backup.' }
    ]
  }),
  buildRound({
    round: 5,
    summary: 'Final sweep consolidates two prompts while ensuring anytime fallback remains viable.',
    orchestratorFocus: 'Publish leading prompt, keep structured backup warmed for interruption safety.',
    baseScore: 0.72,
    proposals: [
      {
        id: 'proposal-0',
        score: 0.73,
        instruction: 'Planner prompt with embedded test cases for self-check.',
        note: 'Ready as high-coverage fallback.'
      },
      {
        id: 'proposal-1',
        score: 0.7,
        instruction: 'Checklist prompt with automated variance notes.',
        note: 'Stays sharp via critique feedback.'
      },
      {
        id: 'proposal-2',
        score: 0.75,
        instruction: 'Symbol-tracking prompt with early-stopping heuristics.',
        note: 'Maintains exploration track in case of regressions.'
      },
      {
        id: 'proposal-3',
        score: 0.68,
        instruction: 'Counter-example generator with targeted hints.',
        note: 'Provides guardrail insights for failures.'
      },
      {
        id: 'proposal-4',
        score: 0.78,
        instruction: 'Critique-first prompt with escalation + verification loop.',
        note: 'Selected as final production candidate.'
      }
    ],
    connections: [
      { source: 'orchestrator', target: 'proposal-0', type: 'coordination', strength: 0.86, rationale: 'Keep fallback prompt aligned.' },
      { source: 'orchestrator', target: 'proposal-2', type: 'coordination', strength: 0.9, rationale: 'Retain exploration branch readiness.' },
      { source: 'orchestrator', target: 'proposal-4', type: 'coordination', strength: 0.95, rationale: 'Publish-ready coordination.' },
      { source: 'orchestrator', target: 'proposal-1', type: 'coordination', strength: 0.85, rationale: 'Maintain verification guardrails.' },
      { source: 'orchestrator', target: 'proposal-3', type: 'coordination', strength: 0.83, rationale: 'Surface counter-example insights.' },
      { source: 'proposal-4', target: 'proposal-1', type: 'instruction', strength: 0.61, rationale: 'Share escalation rubric.' },
      { source: 'proposal-2', target: 'proposal-0', type: 'instruction', strength: 0.58, rationale: 'Align fallback with symbol tracking.' },
      { source: 'proposal-1', target: 'proposal-3', type: 'instruction', strength: 0.55, rationale: 'Propagate guardrail macros.' },
      { source: 'proposal-4', target: 'base', type: 'feedback', strength: 0.7, rationale: 'Deploy critique-first prompt.' },
      { source: 'proposal-2', target: 'base', type: 'feedback', strength: 0.65, rationale: 'Maintain alternative with strong coverage.' }
    ]
  })
];

const MAX_ROUND_INDEX = SCRIPTED_ROUNDS.length - 1;

const getScoreSparklinePath = (scores: number[], width: number, height: number) => {
  if (scores.length === 0) return '';
  const xScale = d3.scaleLinear().domain([0, scores.length - 1]).range([0, width]);
  const yScale = d3.scaleLinear().domain([d3.min(scores) ?? 0, d3.max(scores) ?? 1]).range([height, 0]);
  const lineGenerator = d3
    .line<number>()
    .x((_, i) => xScale(i))
    .y((d) => yScale(d))
    .curve(d3.curveMonotoneX);
  return lineGenerator(scores) ?? '';
};

const MultiAgentVisualization = () => {
  const [currentRound, setCurrentRound] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graphGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  const sparklinePath = useMemo(
    () => getScoreSparklinePath(SCRIPTED_ROUNDS.map((round) => round.bestScore), 140, 60),
    []
  );

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);

    if (!graphGroupRef.current) {
      svg.attr('viewBox', `0 0 ${WIDTH} ${HEIGHT}`);
      svg.selectAll('*').remove();

      const defs = svg.append('defs');

      const gradients: Array<{ id: string; colors: [string, string] }> = [
        { id: 'coordination-gradient', colors: ['#3b82f6', '#60a5fa'] },
        { id: 'instruction-gradient', colors: ['#10b981', '#34d399'] },
        { id: 'feedback-gradient', colors: ['#f59e0b', '#fbbf24'] }
      ];

      gradients.forEach((grad) => {
        const gradient = defs.append('linearGradient').attr('id', grad.id).attr('gradientUnits', 'userSpaceOnUse');
        gradient.append('stop').attr('offset', '0%').attr('stop-color', grad.colors[0]).attr('stop-opacity', 0.85);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', grad.colors[1]).attr('stop-opacity', 0.45);
      });

      const glow = defs.append('filter').attr('id', 'glow');
      glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const merge = glow.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');

      const agentGradients: Array<{ id: string; colors: [string, string] }> = [
        { id: 'base-gradient', colors: ['#f87171', '#ef4444'] },
        { id: 'orchestrator-gradient', colors: ['#a78bfa', '#8b5cf6'] }
      ];

      agentGradients.forEach((grad) => {
        const gradient = defs.append('radialGradient').attr('id', grad.id);
        gradient.append('stop').attr('offset', '0%').attr('stop-color', grad.colors[0]);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', grad.colors[1]);
      });

      const graphGroup = svg
        .append('g')
        .attr('transform', `translate(${MARGIN.left}, ${MARGIN.top})`)
        .attr('class', 'graph-root');

      graphGroup.append('g').attr('class', 'connections');
      graphGroup.append('g').attr('class', 'agents');

      graphGroupRef.current = graphGroup;

      const legend = svg.append('g').attr('transform', 'translate(30, 30)');
      legend
        .append('rect')
        .attr('x', -10)
        .attr('y', -10)
        .attr('width', 220)
        .attr('height', 95)
        .attr('fill', 'rgba(255, 255, 255, 0.95)')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('rx', 8);

      const legendData = [
        { color: '#ef4444', label: 'Base LLM', sublabel: 'gpt-3.5 / haiku-3' },
        { color: '#8b5cf6', label: 'Orchestrator Ω', sublabel: 'gpt-4o' },
        { color: '#a855f7', label: 'Proposal Agent', sublabel: 'gpt-4o-mini (5x)' }
      ];

      const legendItems = legend
        .selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (_, i) => `translate(0, ${i * 28})`);

      legendItems
        .append('circle')
        .attr('r', 7)
        .attr('fill', (d) => d.color)
        .attr('stroke', 'white')
        .attr('stroke-width', 2);

      legendItems
        .append('text')
        .attr('x', 18)
        .attr('dy', '-0.1em')
        .attr('font-size', '15px')
        .attr('font-weight', '600')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('fill', '#1f2937')
        .text((d) => d.label);

      legendItems
        .append('text')
        .attr('x', 18)
        .attr('dy', '1.1em')
        .attr('font-size', '13px')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('fill', '#6b7280')
        .text((d) => d.sublabel);

      const connectionLegend = svg.append('g').attr('transform', 'translate(280, 30)');
      connectionLegend
        .append('rect')
        .attr('x', -10)
        .attr('y', -10)
        .attr('width', 200)
        .attr('height', 95)
        .attr('fill', 'rgba(255, 255, 255, 0.95)')
        .attr('stroke', '#e5e7eb')
        .attr('stroke-width', 1)
        .attr('rx', 8);

      const connectionLegendData = [
        { color: 'url(#coordination-gradient)', label: 'Coordination (Ω → Pi)', dash: '8,4' },
        { color: 'url(#instruction-gradient)', label: 'Instruction Exchange', dash: 'none' },
        { color: 'url(#feedback-gradient)', label: 'Feedback to Base', dash: 'none' }
      ];

      const connectionItems = connectionLegend
        .selectAll('.connection-legend-item')
        .data(connectionLegendData)
        .enter()
        .append('g')
        .attr('class', 'connection-legend-item')
        .attr('transform', (_, i) => `translate(0, ${i * 28})`);

      connectionItems
        .append('line')
        .attr('x1', 0)
        .attr('x2', 30)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', (d) => d.color)
        .attr('stroke-width', 4)
        .attr('stroke-linecap', 'round')
        .attr('stroke-dasharray', (d) => d.dash);

      connectionItems
        .append('text')
        .attr('x', 40)
        .attr('dy', '0.35em')
        .attr('font-size', '15px')
        .attr('font-weight', '500')
        .attr('font-family', 'Inter, system-ui, sans-serif')
        .attr('fill', '#1f2937')
        .text((d) => d.label);
    }
  }, []);

  useEffect(() => {
    if (!autoPlay || currentRound >= MAX_ROUND_INDEX) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentRound((prev) => {
        if (prev >= MAX_ROUND_INDEX) {
          setAutoPlay(false);
          return prev;
        }
        return prev + 1;
      });
    }, 1800);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoPlay, currentRound]);

  useEffect(() => {
    const graphGroup = graphGroupRef.current;
    if (!graphGroup) return;

    const data = SCRIPTED_ROUNDS[currentRound];
    if (!data) return;

    const connectionsGroup = graphGroup.select<SVGGElement>('.connections');
    const agentsGroup = graphGroup.select<SVGGElement>('.agents');

    const connectionSelection = connectionsGroup
      .selectAll<SVGLineElement, Connection>('.connection')
      .data(data.connections, (d: any) => `${d.source}-${d.target}-${d.type}`);

    connectionSelection.exit().transition().duration(300).attr('opacity', 0).remove();

    const connectionEnter = connectionSelection
      .enter()
      .append('line')
      .attr('class', 'connection')
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0);

    const connectionMerge = connectionEnter.merge(connectionSelection as any);

    connectionMerge
      .transition()
      .duration(600)
      .attr('x1', (d) => data.agents.find((agent) => agent.id === d.source)?.x ?? 0)
      .attr('y1', (d) => data.agents.find((agent) => agent.id === d.source)?.y ?? 0)
      .attr('x2', (d) => data.agents.find((agent) => agent.id === d.target)?.x ?? 0)
      .attr('y2', (d) => data.agents.find((agent) => agent.id === d.target)?.y ?? 0)
      .attr('stroke-width', (d) => Math.max(2, d.strength * 5))
      .attr('stroke', (d) => {
        switch (d.type) {
          case 'coordination':
            return 'url(#coordination-gradient)';
          case 'instruction':
            return 'url(#instruction-gradient)';
          case 'feedback':
            return 'url(#feedback-gradient)';
          default:
            return '#9ca3af';
        }
      })
      .attr('stroke-dasharray', (d) => (d.type === 'coordination' ? '8,4' : 'none'))
      .attr('opacity', (d) => 0.65 + d.strength * 0.35);

    connectionMerge.each(function (d) {
      const selection = d3.select<SVGLineElement, Connection>(this);
      let title = selection.select<SVGTitleElement>('title');
      if (title.empty()) {
        title = selection.append('title');
      }
      title.text(`${d.type.toUpperCase()} • ${d.rationale}`);
    });

    const agentSelection = agentsGroup
      .selectAll<SVGGElement, AgentState>('.agent')
      .data(data.agents, (d: any) => d.id);

    agentSelection.exit().transition().duration(300).attr('opacity', 0).remove();

    const agentEnter = agentSelection
      .enter()
      .append('g')
      .attr('class', 'agent')
      .attr('opacity', 0)
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

    agentEnter
      .append('circle')
      .attr('r', 20)
      .attr('stroke-width', 2);

    agentEnter.append('text').attr('class', 'agent-label');
    agentEnter.append('text').attr('class', 'agent-score');
    agentEnter.append('title');

    const agentMerge = agentEnter.merge(agentSelection as any);

    agentMerge
      .transition()
      .duration(600)
      .attr('opacity', (d) => (d.active ? 1 : 0.65))
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`);

    agentMerge
      .select<SVGCircleElement>('circle')
      .transition()
      .duration(600)
      .attr('r', (d) => (d.type === 'base' ? 34 : d.type === 'orchestrator' ? 28 : 24))
      .attr('fill', (d) => {
        if (!d.active) return '#e5e7eb';
        if (d.type === 'base') return 'url(#base-gradient)';
        if (d.type === 'orchestrator') return 'url(#orchestrator-gradient)';
        return d3.interpolatePlasma(d.score * 0.8 + 0.2);
      })
      .attr('stroke', (d) => {
        if (!d.active) return '#d1d5db';
        if (d.type === 'base') return '#dc2626';
        if (d.type === 'orchestrator') return '#7c3aed';
        return d.score > 0.62 ? '#ffffff' : '#1f2937';
      })
      .attr('stroke-width', (d) => (d.active ? 3 : 2))
      .attr('filter', (d) => (d.active ? 'url(#glow)' : 'none'));

    agentMerge
      .select<SVGTextElement>('text.agent-label')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-family', 'Inter, system-ui, sans-serif')
      .attr('font-weight', 600)
      .attr('font-size', (d) => (d.type === 'orchestrator' ? '18px' : '14px'))
      .attr('fill', (d) => {
        if (!d.active) return '#9ca3af';
        if (d.type === 'orchestrator' || d.type === 'base') return '#ffffff';
        return d.score > 0.62 ? '#ffffff' : '#1f2937';
      })
      .text((d) => {
        if (d.type === 'base') return 'Base';
        if (d.type === 'orchestrator') return 'Ω';
        return `P${d.id.split('-')[1]}`;
      });

    agentMerge
      .select<SVGTextElement>('text.agent-score')
      .attr('text-anchor', 'middle')
      .attr('dy', '2.8em')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('font-size', '12px')
      .attr('fill', '#1f2937')
      .attr('opacity', (d) => (d.type === 'proposal' && d.active ? 1 : 0))
      .text((d) => (d.type === 'proposal' ? d.score.toFixed(3) : ''));

    agentMerge.select<SVGTitleElement>('title').text((d) => `${d.type.toUpperCase()} • ${d.note}`);
  }, [currentRound]);

  const currentData = SCRIPTED_ROUNDS[currentRound];
  const avgScores = SCRIPTED_ROUNDS.map((round) => round.avgScore);
  const baseAgentScore =
    currentData?.agents.find((agent) => agent.id === 'base')?.score ?? 0;

  return (
    <section className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-6 md:px-8 md:py-7 space-y-6 text-[15px] md:text-base">
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">Multi-Agent Instruction Tuning Visualization</h2>
        <p className="text-base text-slate-600 md:text-lg leading-relaxed">
          Deterministic replay of the coordination trace from Experiment 1. Watch how Ω holds the neighbour budget at two,
          shepherds top-performing prompts, and preserves the anytime property.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-5 md:px-6 md:py-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 text-slate-800">
            <h3 className="text-lg md:text-xl font-semibold">Replay controls</h3>
            <p className="text-base text-slate-600 max-w-xl">
              Five proposal agents (gpt-4o-mini) coordinate under Ω with max degree two. Use the scrubber to align the figure with
              the narrative or auto-play the trace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setAutoPlay((prev) => !prev)}
              variant={autoPlay ? 'destructive' : 'default'}
              className={`h-10 px-5 font-semibold ${
                autoPlay
                  ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
              }`}
            >
              {autoPlay ? '⏹ Stop' : '▶ Auto Play'}
            </Button>
            <Button
              onClick={() => {
                setAutoPlay(false);
                setCurrentRound(0);
              }}
              variant="outline"
              className="h-10 px-5 font-semibold border-slate-300 hover:bg-slate-100"
            >
              ↻ Reset
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            <span>Round {currentRound}</span>
            <span>0 → {MAX_ROUND_INDEX}</span>
          </div>
          <Slider
            value={[currentRound]}
            onValueChange={(value) => {
              const [next] = value;
              setAutoPlay(false);
              setCurrentRound(Math.min(Math.max(0, next ?? 0), MAX_ROUND_INDEX));
            }}
            min={0}
            max={MAX_ROUND_INDEX}
            step={1}
            className="w-full data-[orientation=horizontal]:h-10 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-slate-300 [&_[data-slot=slider-range]]:bg-blue-500 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-blue-500 [&_[data-slot=slider-thumb]]:bg-white"
          />
          <div className="flex justify-between text-sm text-slate-500">
            <span>0</span>
            <span>{MAX_ROUND_INDEX}</span>
          </div>
        </div>
      </div>

      {currentData && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,0.95fr)] items-start">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Round</div>
                <div className="mt-2 text-4xl font-bold text-slate-900">{currentData.round}</div>
                <p className="mt-1 text-base text-slate-600">Current step of the coordination trace.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Best proposal</div>
                <div className="mt-2 text-4xl font-bold text-green-600">{currentData.bestScore.toFixed(3)}</div>
                <p className="mt-1 text-base text-slate-600">Highest utility instruction in this round.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Average</div>
                <div className="mt-2 text-4xl font-bold text-purple-600">{currentData.avgScore.toFixed(3)}</div>
                <p className="mt-1 text-base text-slate-600">Mean score across active proposals.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Base LLM</div>
                <div className="mt-2 text-4xl font-bold text-slate-900">{baseAgentScore.toFixed(3)}</div>
                <p className="mt-1 text-base text-slate-600">Performance if deployment stops after this round.</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2 xl:col-span-4 space-y-2">
                <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Round highlights</div>
                <p className="text-base text-slate-700 leading-relaxed">{currentData.summary}</p>
                <p className="text-base text-amber-700 leading-relaxed">
                  <span className="font-semibold text-amber-600">Ω focus:</span> {currentData.orchestratorFocus}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 md:px-5 md:py-5">
              <svg ref={svgRef} width={WIDTH} height={HEIGHT} className="w-full h-auto" />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-2">
              <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Anytime checklist</div>
              {currentRound === 0 ? (
                <p className="text-base text-slate-600">
                  Agents are positioned; Ω sets coordination constraints before activating proposals.
                </p>
              ) : (
                <ul className="space-y-1 text-base text-slate-600 leading-relaxed list-disc list-inside">
                  <li>Ω enforces max degree ≤ 2 and routes messages based on utility gains.</li>
                  <li>Proposal agents exchange structured hints and critique rubrics.</li>
                  <li>Evaluator scores each instruction on fresh minibatches; best prompt updates the base LLM.</li>
                  <li>Anytime readiness preserved: base can deploy the top prompt immediately if interrupted.</li>
                </ul>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Anytime performance</div>
              <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                Best proposal score (solid) and average active score (dashed) across rounds.
              </p>
              <div className="mt-3">
                <svg viewBox="0 0 160 70" className="w-full h-24">
                  <g transform="translate(10,5)">
                    <path d={sparklinePath} fill="none" stroke="#16a34a" strokeWidth={2.5} />
                    <path
                      d={getScoreSparklinePath(avgScores, 140, 60)}
                      fill="none"
                      stroke="#7c3aed"
                      strokeWidth={1.8}
                      strokeDasharray="4 3"
                      opacity={0.8}
                    />
                  </g>
                </svg>
                <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-4 rounded-full bg-green-500" />
                    Best
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-purple-500" />
                    Average
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 space-y-3 max-h-[420px] overflow-y-auto">
              <div className="text-sm uppercase tracking-wide font-semibold text-slate-500">Proposal notes</div>
              {currentData.agents
                .filter((agent) => agent.type === 'proposal')
                .map((agent) => (
                  <div key={agent.id} className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm space-y-1">
                    <div className="flex items-center justify-between text-sm uppercase tracking-wide text-slate-500">
                      <span>P{agent.id.split('-')[1]}</span>
                      <span>{agent.score.toFixed(3)}</span>
                    </div>
                    <p className="text-base font-medium text-slate-700 leading-snug">{agent.instruction}</p>
                    <p className="text-sm text-slate-500 leading-relaxed">{agent.note}</p>
                  </div>
                ))}
            </div>
          </aside>
        </div>
      )}
    </section>
  );
};

export default MultiAgentVisualization;
