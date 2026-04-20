import React from 'react';
import { OperatorMapCanvas } from './OperatorMapCanvas';
import { MetricCard, AlertFeed, FlowStateLogo } from './OperatorDashboardWidgets';
import { MAX_ALERTS } from './operatorConstants';
import { formatSimTime } from './operatorMetrics';
import {
  FanAppPreviewSection,
  OperatorPanelDivider,
  SimulationSpeedSection,
  TriggerEventsSection,
  ZoneStatusSection,
} from './OperatorRightRailSections';
import { COMFORT_STATUS_COLORS } from '../../config/comfortConfig';

export function OperatorDashboardHeader({ simTimeSecs, matchLabel, matchColor }) {
  return (
    <header className="z-10 flex h-14 shrink-0 items-center justify-between bg-slate-900 px-7 text-white shadow-[0_2px_12px_rgba(0,0,0,0.18)]">
      <FlowStateLogo />
      <div className="flex items-center gap-[18px]">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full bg-red-500"
            style={{
              boxShadow: '0 0 0 3px rgba(239,68,68,0.25)',
              animation: 'livePulse 1.4s ease-in-out infinite',
            }}
          />
          <span className="text-xs font-semibold text-slate-300">LIVE</span>
        </div>
        <div className="rounded-lg bg-slate-800 px-3 py-1 font-mono text-[15px] font-bold tracking-[0.06em] text-sky-400">
          {formatSimTime(simTimeSecs)}
        </div>
        <div
          className="rounded-full px-3 py-[3px] text-xs font-bold"
          style={{
            background: `${matchColor}22`,
            border: `1.5px solid ${matchColor}`,
            color: matchColor,
          }}
        >
          {matchLabel}
        </div>
      </div>
    </header>
  );
}

export function OperatorDashboardLeftColumn({
  fanCount,
  capPct,
  avgWait,
  waitDelta,
  waitDeltaLabel,
  activeRoutes,
  departedPct,
  matchPhase,
  comfortScore,
  comfortDelta,
  comfortDeltaLabel,
  zones,
  stands,
  allAlerts,
}) {
  const zoneDensityPairs =
    zones instanceof Map
      ? Array.from(zones.entries())
          .filter(([, info]) => typeof info?.density === 'number')
          .sort((a, b) => b[1].density - a[1].density)
          .slice(0, 3)
      : [];
  const topWaitStands =
    stands instanceof Map
      ? Array.from(stands.entries())
          .filter(([, info]) => typeof info?.waitTime === 'number')
          .sort((a, b) => b[1].waitTime - a[1].waitTime)
          .slice(0, 2)
      : [];

  return (
    <div className="flex min-h-0 min-w-0 flex-col gap-4 overflow-x-hidden overflow-y-auto px-5 pb-5 pt-5">
      <div className="grid grid-cols-4 gap-3">
        <MetricCard
          label="Attendance"
          value={fanCount.toLocaleString()}
          sub={`${capPct}% capacity`}
          subColor="#3B82F6"
        />
        <MetricCard
          label="Avg Wait"
          value={`${avgWait.toFixed(1)}m`}
          sub={waitDeltaLabel}
          subColor={waitDelta < 0 ? '#22C55E' : '#EF4444'}
        />
        <MetricCard
          label={matchPhase === 'post_match' ? 'Departed' : 'Active Routes'}
          value={matchPhase === 'post_match' ? `${departedPct}%` : activeRoutes.toLocaleString()}
          sub={matchPhase === 'post_match' ? 'Venue cleared' : 'Live routing'}
          subColor={matchPhase === 'post_match' ? '#3B82F6' : '#8B5CF6'}
        />
        <MetricCard
          label="Comfort Avg"
          value={comfortScore}
          sub={comfortDeltaLabel}
          subColor={comfortDelta >= 0 ? '#22C55E' : '#EF4444'}
        />
      </div>

      <div className="mt-3 grid min-h-[500px] min-w-0 flex-1 grid-cols-[3fr_2fr] gap-4">
        <div className="flex min-h-[500px] min-w-0 flex-col overflow-hidden rounded-2xl bg-white px-4 pb-2 pt-3 shadow-[0_1px_6px_rgba(0,0,0,0.07)]">
          <div className="mb-2 flex w-full shrink-0 items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.07em] text-slate-500">Venue Heatmap</span>
            <div className="flex gap-3">
              {[
                { color: COMFORT_STATUS_COLORS.low, label: 'Low <40%' },
                { color: COMFORT_STATUS_COLORS.moderate, label: 'Moderate 40-70%' },
                { color: COMFORT_STATUS_COLORS.high, label: 'High >70%' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{
                      background: l.color,
                    }}
                  />
                  <span className="text-[11px] text-slate-700">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <OperatorMapCanvas zones={zones} stands={stands} matchPhase={matchPhase} />
          </div>
          <section className="sr-only" aria-label="Operator map textual summary">
            <p>
              Top congestion zones:{' '}
              {zoneDensityPairs.length
                ? zoneDensityPairs.map(([zoneName, info]) => `${zoneName} at ${info.density}%`).join(', ')
                : 'No live density data available.'}
            </p>
            <p>
              Highest stand waits:{' '}
              {topWaitStands.length
                ? topWaitStands.map(([standName, info]) => `${standName} at ${info.waitTime} minutes`).join(', ')
                : 'No live stand wait data available.'}
            </p>
          </section>
        </div>

        <div className="flex h-full min-h-[500px] min-w-0 max-h-[500px] flex-col overflow-hidden rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_6px_rgba(0,0,0,0.07)]">
          <div className="h-full min-h-0 flex-1 overflow-y-auto">
            <div className="sticky top-0 z-[1] mb-2.5 flex items-center justify-between bg-white pb-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500">
              <span>Live Alerts</span>
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                {allAlerts.length} / {MAX_ALERTS}
              </span>
            </div>
            <AlertFeed alerts={allAlerts} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function OperatorDashboardRightColumn({
  simTimeSecs,
  matchLabel,
  matchColor,
  comfortScore,
  nearestWait,
  crowdLevel,
  fanActiveRoutes,
  aiActionTitle,
  speed,
  updateSimSpeed,
  activeTriggerEvent,
  pulsingTriggerEvent,
  lastTriggerMeta,
  onClearActiveTrigger,
  handleTriggerEvent,
  zones,
  matchPhase,
}) {
  return (
    <div className="flex w-[240px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-slate-200 bg-white px-3.5 py-5">
      <div className="text-center">
        <div className="font-mono text-[30px] font-extrabold leading-none tracking-[0.04em] text-slate-900">
          {formatSimTime(simTimeSecs)}
        </div>
        <div className="mt-2">
          <span
            className="rounded-full px-3.5 py-[3px] text-xs font-bold"
            style={{
              background: `${matchColor}18`,
              border: `1.5px solid ${matchColor}`,
              color: matchColor,
            }}
          >
            {matchLabel}
          </span>
        </div>
      </div>

      <OperatorPanelDivider />

      <FanAppPreviewSection
        comfortScore={comfortScore}
        nearestWait={nearestWait}
        crowdLevel={crowdLevel}
        fanActiveRoutes={fanActiveRoutes}
        aiActionTitle={aiActionTitle}
        matchPhase={matchPhase}
      />

      <OperatorPanelDivider />

      <SimulationSpeedSection speed={speed} updateSimSpeed={updateSimSpeed} />

      <OperatorPanelDivider />

      <TriggerEventsSection
        activeTriggerEvent={activeTriggerEvent}
        pulsingTriggerEvent={pulsingTriggerEvent}
        lastTriggerMeta={lastTriggerMeta}
        onClearActiveTrigger={onClearActiveTrigger}
        handleTriggerEvent={handleTriggerEvent}
      />

      <OperatorPanelDivider />

      <ZoneStatusSection zones={zones} />
    </div>
  );
}
