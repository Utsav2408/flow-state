import React from 'react';
import { EventBtn, FanAppPreview, SpeedBtn } from './OperatorDashboardWidgets';
import { TRIGGER_EVENT_LABELS, ZONE_GROUPS } from './operatorConstants';
import { formatWallClock } from './operatorMetrics';
import { COMFORT_STATUS_COLORS } from '../../config/comfortConfig';

export function OperatorPanelDivider() {
  return <hr className="m-0 border-0 border-t border-slate-200" />;
}

export function FanAppPreviewSection({
  comfortScore,
  nearestWait,
  crowdLevel,
  fanActiveRoutes,
  aiActionTitle,
  matchPhase,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
        <span className="text-xs">📱</span>
        <span>Fan App Preview</span>
      </div>
      <FanAppPreview
        comfortScore={comfortScore}
        nearestWait={nearestWait}
        crowdLevel={crowdLevel}
        activeRouteCount={fanActiveRoutes}
        aiActionTitle={aiActionTitle}
        matchPhase={matchPhase}
      />
    </div>
  );
}

export function SimulationSpeedSection({ speed, updateSimSpeed }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Simulation Speed</div>
      <div className="flex gap-1.5">
        <SpeedBtn label="1x" active={speed === 1} onClick={() => updateSimSpeed(1)} />
        <SpeedBtn label="5x" active={speed === 5} onClick={() => updateSimSpeed(5)} />
        <SpeedBtn label="20x" active={speed === 20} onClick={() => updateSimSpeed(20)} />
      </div>
    </div>
  );
}

const EVENT_DEFINITIONS = [
  { id: 'trigger-halftime', key: 'halftime', label: 'Halftime break', color: '#F59E0B' },
  { id: 'trigger-goal', key: 'goal', label: 'Goal scored', color: '#22C55E' },
  { id: 'trigger-rain', key: 'rain_delay', label: 'Rain delay', color: '#3B82F6' },
  { id: 'trigger-whistle', key: 'post_match', label: 'Final whistle', color: '#EF4444' },
];

export function TriggerEventsSection({
  activeTriggerEvent,
  pulsingTriggerEvent,
  lastTriggerMeta,
  onClearActiveTrigger,
  handleTriggerEvent,
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Trigger Event</div>
      {lastTriggerMeta ? (
        <div
          role="status"
          className="mb-2.5 rounded-xl border border-emerald-500/35 bg-[linear-gradient(135deg,rgba(16,185,129,0.12)_0%,rgba(59,130,246,0.08)_100%)] px-3 py-2.5 shadow-[0_2px_8px_rgba(16,185,129,0.12)]"
        >
          <div className="mb-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">Event started</div>
          <div className="text-[13px] font-bold leading-tight text-slate-900">
            {TRIGGER_EVENT_LABELS[lastTriggerMeta.event] || lastTriggerMeta.event}
          </div>
          <div className="mt-1 text-[11px] text-slate-600 [font-variant-numeric:tabular-nums]">
            {formatWallClock(lastTriggerMeta.at)}
          </div>
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        {EVENT_DEFINITIONS.map((eventConfig) => (
          <EventBtn
            key={eventConfig.key}
            id={eventConfig.id}
            label={eventConfig.label}
            color={eventConfig.color}
            selected={activeTriggerEvent === eventConfig.key}
            pulse={pulsingTriggerEvent === eventConfig.key}
            onClick={() => handleTriggerEvent(eventConfig.key)}
          />
        ))}
      </div>
      {activeTriggerEvent ? (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] leading-snug text-slate-600">
            Selected: <span className="font-bold text-slate-900">{TRIGGER_EVENT_LABELS[activeTriggerEvent]}</span>
          </span>
          <button
            type="button"
            onClick={onClearActiveTrigger}
            className="shrink-0 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1.5 text-[11px] font-bold text-slate-500"
          >
            Deselect
          </button>
        </div>
      ) : null}
    </div>
  );
}

function getZoneDensity(zones, aliases) {
  let total = 0;
  let count = 0;
  aliases.forEach((zoneName) => {
    const zoneData = zones.get(zoneName);
    if (zoneData?.density !== undefined) {
      total += zoneData.density;
      count += 1;
    }
  });
  return count > 0 ? Math.round(total / count) : 0;
}

function getDensityColor(density) {
  if (density > 80) return COMFORT_STATUS_COLORS.high;
  if (density > 60) return COMFORT_STATUS_COLORS.moderate;
  return COMFORT_STATUS_COLORS.low;
}

export function ZoneStatusSection({ zones }) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">Zone Status</div>
      <div className="flex flex-col gap-1.5">
        {Object.entries(ZONE_GROUPS).map(([zoneGroup, aliases]) => {
          const density = getZoneDensity(zones, aliases);
          const barColor = getDensityColor(density);
          return (
            <div key={zoneGroup} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[11px] text-slate-600">{zoneGroup}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-slate-200">
                <div
                  style={{
                    width: `${density}%`,
                    height: '100%',
                    background: barColor,
                    transition: 'width 0.6s ease, background 0.4s ease',
                  }}
                />
              </div>
              <span className="w-7 text-right text-[11px] text-slate-500">{density}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
