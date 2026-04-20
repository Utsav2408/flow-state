import React from 'react';
import { OperatorMapCanvas } from './OperatorMapCanvas';
import {
  MetricCard,
  AlertFeed,
  FanAppPreview,
  SpeedBtn,
  EventBtn,
  FlowStateLogo,
} from './OperatorDashboardWidgets';
import { ZONE_GROUPS, MAX_ALERTS, TRIGGER_EVENT_LABELS } from './operatorConstants';
import { formatSimTime, formatWallClock } from './operatorMetrics';

export function OperatorDashboardHeader({ simTimeSecs, matchLabel, matchColor }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        height: 56,
        background: '#0F172A',
        color: '#fff',
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        zIndex: 10,
      }}
    >
      <FlowStateLogo />
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#EF4444',
              boxShadow: '0 0 0 3px rgba(239,68,68,0.25)',
              animation: 'livePulse 1.4s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>LIVE</span>
        </div>

        <div
          style={{
            background: '#1E293B',
            borderRadius: 8,
            padding: '4px 12px',
            fontFamily: 'monospace',
            fontSize: 15,
            fontWeight: 700,
            color: '#38BDF8',
            letterSpacing: '0.06em',
          }}
        >
          {formatSimTime(simTimeSecs)}
        </div>

        <div
          style={{
            background: `${matchColor}22`,
            border: `1.5px solid ${matchColor}`,
            color: matchColor,
            borderRadius: 20,
            padding: '3px 12px',
            fontSize: 12,
            fontWeight: 700,
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
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '20px 16px 20px 20px',
        minWidth: 0,
        minHeight: 0,
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 16,
          marginTop: 12,
          minHeight: 500,
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            padding: '12px 16px 8px',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 500,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              Venue Heatmap
            </span>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { color: '#10B981', label: '<40%' },
                { color: '#F59E0B', label: '40-70%' },
                { color: '#EF4444', label: '>70%' },
              ].map((l) => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: l.color,
                      display: 'inline-block',
                    }}
                  />
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            <OperatorMapCanvas zones={zones} stands={stands} matchPhase={matchPhase} />
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            padding: '14px 16px',
            minHeight: 500,
            maxHeight: 500,
            height: '100%',
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              height: '100%',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                background: '#fff',
                paddingBottom: 10,
                marginBottom: 10,
                fontSize: 11,
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Live Alerts</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#94A3B8',
                  background: '#F1F5F9',
                  padding: '2px 8px',
                  borderRadius: 8,
                }}
              >
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
    <div
      style={{
        width: 240,
        background: '#fff',
        borderLeft: '1px solid #E2E8F0',
        padding: '20px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 30,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          {formatSimTime(simTimeSecs)}
        </div>
        <div style={{ marginTop: 8 }}>
          <span
            style={{
              background: `${matchColor}18`,
              border: `1.5px solid ${matchColor}`,
              color: matchColor,
              borderRadius: 20,
              padding: '3px 14px',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {matchLabel}
          </span>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span style={{ fontSize: 12 }}>📱</span> Fan App Preview
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

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          Simulation Speed
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <SpeedBtn label="1x" active={speed === 1} onClick={() => updateSimSpeed(1)} />
          <SpeedBtn label="5x" active={speed === 5} onClick={() => updateSimSpeed(5)} />
          <SpeedBtn label="20x" active={speed === 20} onClick={() => updateSimSpeed(20)} />
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          Trigger Event
        </div>
        {lastTriggerMeta ? (
          <div
            role="status"
            style={{
              marginBottom: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(59,130,246,0.08) 100%)',
              border: '1px solid rgba(16,185,129,0.35)',
              boxShadow: '0 2px 8px rgba(16,185,129,0.12)',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: '#047857',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Event started
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1.25 }}>
              {TRIGGER_EVENT_LABELS[lastTriggerMeta.event] || lastTriggerMeta.event}
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
              {formatWallClock(lastTriggerMeta.at)}
            </div>
          </div>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <EventBtn
            id="trigger-halftime"
            label="Halftime break"
            color="#F59E0B"
            selected={activeTriggerEvent === 'halftime'}
            pulse={pulsingTriggerEvent === 'halftime'}
            onClick={() => handleTriggerEvent('halftime')}
          />
          <EventBtn
            id="trigger-goal"
            label="Goal scored"
            color="#22C55E"
            selected={activeTriggerEvent === 'goal'}
            pulse={pulsingTriggerEvent === 'goal'}
            onClick={() => handleTriggerEvent('goal')}
          />
          <EventBtn
            id="trigger-rain"
            label="Rain delay"
            color="#3B82F6"
            selected={activeTriggerEvent === 'rain_delay'}
            pulse={pulsingTriggerEvent === 'rain_delay'}
            onClick={() => handleTriggerEvent('rain_delay')}
          />
          <EventBtn
            id="trigger-whistle"
            label="Final whistle"
            color="#EF4444"
            selected={activeTriggerEvent === 'post_match'}
            pulse={pulsingTriggerEvent === 'post_match'}
            onClick={() => handleTriggerEvent('post_match')}
          />
        </div>
        {activeTriggerEvent ? (
          <div
            style={{
              marginTop: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: 11, color: '#475569', lineHeight: 1.3 }}>
              Selected:{' '}
              <span style={{ fontWeight: 700, color: '#0F172A' }}>
                {TRIGGER_EVENT_LABELS[activeTriggerEvent]}
              </span>
            </span>
            <button
              type="button"
              onClick={onClearActiveTrigger}
              style={{
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: '#64748B',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '6px 10px',
                cursor: 'pointer',
              }}
            >
              Deselect
            </button>
          </div>
        ) : null}
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}
        >
          Zone Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {Object.entries(ZONE_GROUPS).map(([zGroup, aliases]) => {
            let total = 0;
            let count = 0;
            aliases.forEach((z) => {
              const d = zones.get(z);
              if (d?.density !== undefined) {
                total += d.density;
                count++;
              }
            });
            const density = count > 0 ? Math.round(total / count) : 0;
            const barColor = density > 80 ? '#EF4444' : density > 60 ? '#F59E0B' : '#22C55E';
            return (
              <div key={zGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: '#475569', width: 48, flexShrink: 0 }}>
                  {zGroup}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: '#E2E8F0',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${density}%`,
                      height: '100%',
                      background: barColor,
                      borderRadius: 4,
                      transition: 'width 0.6s ease, background 0.4s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, color: '#64748B', width: 28, textAlign: 'right' }}>
                  {density}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
