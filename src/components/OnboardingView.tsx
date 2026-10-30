/**
 * OnboardingView — Contenedor del flujo de 3 pasos
 * Se muestra solo la primera vez (fixedExpensesUSD <= 0 && history vacío)
 */

import { useState } from 'react';
import { Card, Button, SegmentedControl } from '../design';
import { tokens } from '../design';
import type { Settings } from '../types';
import { DEFAULT_SETTINGS } from '../lib/store';

const PRESETS = [
  { label: 'Básico', usd: 200 },
  { label: 'Estándar', usd: 350 },
  { label: 'Amplio', usd: 500 },
  { label: 'Otro', usd: 0 },
];

interface Props {
  onComplete: (s: Settings) => void;
}

export function OnboardingView({ onComplete }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [customAmount, setCustomAmount] = useState('');

  const next = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else onComplete(draft);
  };

  const back = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const isStep1Valid = draft.fixedExpensesUSD > 0;
  const fixedLabel = draft.fixedExpensesUSD > 0 ? `$${draft.fixedExpensesUSD}` : '—';

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 16px' }}>
      <Card padded style={{ marginTop: tokens.space[5] }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tokens.space[4] }}>
          <span style={{ fontSize: tokens.fontSize.micro, color: tokens.color.muted }}>
            Paso {step} de 3 — Configuración inicial
          </span>
          <ProgressIndicator step={step} />
        </div>

        {step === 1 && (
          <div>
            <h2 style={{ fontSize: tokens.fontSize.title, marginBottom: tokens.space[2], color: tokens.color.ink }}>
              ¿Cuánto gastas fijos al mes?
            </h2>
            <p style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[4] }}>
              Comida, pasajes, servicios, internet, teléfono. Es la base para que el reparto sea real.
            </p>
            <SegmentedControl
              options={PRESETS.map((p) => ({ value: String(p.usd), label: p.label }))}
              value={String(draft.fixedExpensesUSD)}
              onValueChange={(v) => {
                if (v === '0') {
                  setDraft({ ...draft, fixedExpensesUSD: 0 });
                } else {
                  setDraft({ ...draft, fixedExpensesUSD: Number(v) });
                }
                setCustomAmount('');
              }}
            />
            {draft.fixedExpensesUSD === 0 && (
              <input
                type="text"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                onBlur={() => {
                  const n = Number(customAmount.replace(/[^\d]/g, ''));
                  if (n > 0) setDraft({ ...draft, fixedExpensesUSD: n });
                }}
                placeholder="Ej: 450"
                style={{
                  width: '100%',
                  padding: '10px 11px',
                  fontSize: tokens.fontSize.body,
                  border: `1px solid ${tokens.color.border}`,
                  borderRadius: tokens.radius.control,
                  background: tokens.color.raised,
                  fontFamily: tokens.fontFamily.sans,
                  outline: 'none',
                  marginTop: tokens.space[3],
                }}
              />
            )}
            <div style={{ marginTop: tokens.space[4], color: tokens.color.faint, fontSize: tokens.fontSize.micro }}>
              Puedes ajustarlo después en Ajustes.
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: tokens.fontSize.title, marginBottom: tokens.space[2], color: tokens.color.ink }}>
              ¿Cuál es tu prioridad?
            </h2>
            <p style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[4] }}>
              Esto define cómo se reparte el sobrante entre colchón, metas y caja libre.
            </p>
            <SegmentedControl
              options={[
                { value: 'liquidez', label: 'Liquidez' },
                { value: 'equilibrado', label: 'Equilibrio' },
                { value: 'dolarizar', label: 'Dolarizar' },
              ]}
              value={draft.risk}
              onValueChange={(v) => setDraft({ ...draft, risk: v as Settings['risk'] })}
            />
            <div style={{ marginTop: tokens.space[4], padding: tokens.space[3], background: tokens.color.raised, borderRadius: tokens.radius.control }}>
              {draft.risk === 'liquidez' && (
                <span style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                  Más plata disponible ahora, menos en cripto.
                </span>
              )}
              {draft.risk === 'equilibrado' && (
                <span style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                  Reparto parejo entre colchón, metas y libre.
                </span>
              )}
              {draft.risk === 'dolarizar' && (
                <span style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>
                  Saca de bolívares lo antes posible.
                </span>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: tokens.fontSize.title, marginBottom: tokens.space[2], color: tokens.color.ink }}>
              Listo para empezar
            </h2>
            <p style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted, marginBottom: tokens.space[4] }}>
              Tu configuración quedará guardada. Ahora registra tu primer ingreso y verás el reparto.
            </p>
            <div style={{ marginTop: tokens.space[4], padding: tokens.space[3], background: tokens.color.surface, border: `1px solid ${tokens.color.border}`, borderRadius: tokens.radius.control }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tokens.space[2] }}>
                <span style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>Gastos fijos</span>
                <span style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{fixedLabel}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: tokens.space[2] }}>
                <span style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>Perfil</span>
                <span style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{draft.risk}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: tokens.fontSize.small, color: tokens.color.muted }}>Colchón meta</span>
                <span style={{ fontSize: tokens.fontSize.small, fontWeight: tokens.fontWeight.medium, color: tokens.color.ink }}>{draft.reserveMonths} meses</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: tokens.space[5], display: 'flex', gap: tokens.space[3], justifyContent: 'flex-end' }}>
          {step > 1 && (
            <Button variant="ghost" onClick={back}>
              Volver
            </Button>
          )}
          <Button
            variant="primary"
            disabled={step === 1 && !isStep1Valid}
            onClick={next}
          >
            {step === 3 ? 'Comenzar' : 'Siguiente'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ProgressIndicator({ step }: { step: number }) {
  const labels = ['Gastos', 'Prioridad', 'Listo'];
  return (
    <div style={{ display: 'flex', gap: tokens.space[2], alignItems: 'center' }}>
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          style={{
            width: tokens.space[3],
            height: tokens.space[3],
            borderRadius: tokens.radius.pill,
            background: n <= step ? tokens.color.primary : tokens.color.control,
            color: n <= step ? tokens.color.ground : tokens.color.control,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: tokens.fontSize.micro,
            fontWeight: tokens.fontWeight.medium,
          }}
        >
          {n}
        </div>
      ))}
      <span style={{ fontSize: tokens.fontSize.micro, color: tokens.color.muted }}>{labels[step - 1]}</span>
    </div>
  );
}