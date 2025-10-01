import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PartialResult {
  agent: string;
  input: string;
  output: string;
}

interface RoundTrace {
  round: number;
  label: string;
  expressionBefore: string;
  subExpressions: string[];
  plan: string;
  partials: PartialResult[];
  expressionAfter: string;
  done: boolean;
}

const TRACE: RoundTrace[] = [
  {
    round: 0,
    label: 'Initial decomposition',
    expressionBefore: '((1 + 0 + 2 - 4) + (-9 + 6 * -5 + 8))',
    subExpressions: ['1 + 0', '2 - 4', '6 * -5'],
    plan: 'L: X1 + X2; R: -9 + X3 + 8; final: L + R',
    partials: [
      { agent: 'SubproblemAgent 0', input: '1 + 0', output: '1' },
      { agent: 'SubproblemAgent 1', input: '2 - 4', output: '-2' },
      { agent: 'SubproblemAgent 2', input: '6 * -5', output: '-30' }
    ],
    expressionAfter: '1 - 2 - 9 - 30 + 8',
    done: false
  },
  {
    round: 1,
    label: 'Intermediate refinement',
    expressionBefore: '1 - 2 - 9 - 30 + 8',
    subExpressions: ['2 + 9', '30 - 8'],
    plan: 'Replace 2 + 9 with X1 and 30 - 8 with X2; compute 1 - X1 - X2.',
    partials: [
      { agent: 'SubproblemAgent 0', input: '2 + 9', output: '11' },
      { agent: 'SubproblemAgent 1', input: '30 - 8', output: '22' }
    ],
    expressionAfter: '1 - 11 - 22',
    done: false
  },
  {
    round: 2,
    label: 'Termination check',
    expressionBefore: '1 - 11 - 22',
    subExpressions: ['1 - 11'],
    plan: 'Replace 1 - 11 with X1; compute X1 - 22.',
    partials: [
      { agent: 'SubproblemAgent 0', input: '1 - 11', output: '-10' }
    ],
    expressionAfter: '-10 - 22 → -32',
    done: true
  }
];

const TOTAL_ROUNDS = TRACE.length - 1;

const tokenSummary = {
  orchestrator: 124,
  subAgents: 45,
  baseline: 143
};

const DivideAndConquerVisualization = () => {
  const [roundIdx, setRoundIdx] = useState(0);
  const current = TRACE[roundIdx];

  return (
    <section className="max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-white shadow-sm px-4 py-6 md:px-8 md:py-7 space-y-6 text-[15px] md:text-base">
      <div className="space-y-2">
        <h2 className="text-2xl md:text-3xl font-semibold text-slate-900">Adaptive Divide-and-Conquer Visualization</h2>
        <p className="text-base text-slate-600 md:text-lg leading-relaxed">
          Coordination trace from Experiment 2. The decomposer proposes structured sub-problems, agents solve them, and the
          substitutor stitches results until the expression collapses to the final answer.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-5 md:px-6 md:py-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1 text-slate-800">
            <h3 className="text-lg md:text-xl font-semibold">Replay controls</h3>
            <p className="text-base text-slate-600 max-w-xl">
              Follow the anytime computation over three rounds. Each round shows the structured plan, agent outputs, and the
              updated symbolic expression.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setRoundIdx(0)}
              variant="outline"
              className="h-10 px-5 font-semibold border-slate-300 hover:bg-slate-100"
            >
              ↻ Reset
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
            <span>Round {roundIdx}</span>
            <span>0 → {TOTAL_ROUNDS}</span>
          </div>
          <Slider
            value={[roundIdx]}
            onValueChange={(value) => {
              const [next] = value;
              setRoundIdx(Math.min(Math.max(0, next ?? 0), TOTAL_ROUNDS));
            }}
            min={0}
            max={TOTAL_ROUNDS}
            step={1}
            className="w-full data-[orientation=horizontal]:h-10 [&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-track]]:bg-slate-300 [&_[data-slot=slider-range]]:bg-indigo-500 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-indigo-500 [&_[data-slot=slider-thumb]]:bg-white"
          />
          <div className="flex justify-between text-sm text-slate-500">
            <span>0</span>
            <span>{TOTAL_ROUNDS}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.7fr)_minmax(0,0.9fr)] items-start">
        <div className="space-y-6">
          <Card className="border border-slate-200 bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Expression status</CardTitle>
              <CardDescription className="text-sm text-slate-500">Progress snapshot for round {current.round}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-700">
              <div>
                <div className="uppercase text-xs tracking-wide text-slate-500 mb-1">Before</div>
                <p className="font-mono text-lg text-slate-900">{current.expressionBefore}</p>
              </div>
              <div>
                <div className="uppercase text-xs tracking-wide text-slate-500 mb-1">Plan</div>
                <p className="text-base leading-relaxed">{current.plan}</p>
              </div>
              <div>
                <div className="uppercase text-xs tracking-wide text-slate-500 mb-1">After</div>
                <p className={cn('font-mono text-lg', current.done ? 'text-emerald-600' : 'text-slate-900')}>
                  {current.expressionAfter}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Sub-problems</CardTitle>
              <CardDescription className="text-sm text-slate-500">Structured placeholders emitted by the decomposer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <ul className="space-y-2">
                {current.subExpressions.map((expr, idx) => (
                  <li
                    key={expr}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <span className="font-mono text-slate-700">{expr}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-500">Placeholder X{idx + 1}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Agent outputs</CardTitle>
              <CardDescription className="text-sm text-slate-500">Each limited agent solves a single-operator expression.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {current.partials.map((partial) => (
                <div key={partial.agent} className="rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-500">
                    <span>{partial.agent}</span>
                    <span className="font-mono text-sm text-slate-700">{partial.output}</span>
                  </div>
                  <p className="mt-1 font-mono text-base text-slate-800">{partial.input}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="border border-slate-200 bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Token usage</CardTitle>
              <CardDescription className="text-sm text-slate-500">
                Cost comparison for this trace (o3-mini tokens are ~7x pricier than 4o-mini tokens).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide text-slate-500">o3-mini orchestration</span>
                <span className="font-semibold">{tokenSummary.orchestrator}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm uppercase tracking-wide text-slate-500">4o-mini sub agents</span>
                <span className="font-semibold">{tokenSummary.subAgents}</span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-2">
                <span className="text-sm uppercase tracking-wide text-slate-500">Baseline (o3-mini)</span>
                <span className="font-semibold">{tokenSummary.baseline}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-700">Round notes</CardTitle>
              <CardDescription className="text-sm text-slate-500">Context pulled directly from the trace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-slate-600 leading-relaxed">
              <p>
                <span className="font-semibold text-slate-700">{current.label}.</span> Substitutor emits
                {current.done ? ' the final value and halts.' : ' a simplified expression ready for the next iteration.'}
              </p>
              {current.done && (
                <p className="font-mono text-lg text-emerald-600">Final answer: -32</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </section>
  );
};

export default DivideAndConquerVisualization;
