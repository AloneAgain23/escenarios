'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Mountain,
  CheckCircle2,
  MapPinned,
  CalendarDays,
  Briefcase,
  AlertCircle,
  Loader2,
} from 'lucide-react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'https://YOUR-RENDER-API.onrender.com';

function scenarioStyle(type: string) {
  if (type === 'optimista') {
    return {
      badge: 'bg-emerald-100 text-emerald-700',
      ring: 'ring-emerald-200',
      label: 'Optimista',
    };
  }
  if (type === 'adverso') {
    return {
      badge: 'bg-rose-100 text-rose-700',
      ring: 'ring-rose-200',
      label: 'Adverso',
    };
  }
  return {
    badge: 'bg-slate-100 text-slate-700',
    ring: 'ring-slate-200',
    label: 'Tendencial',
  };
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="rounded-2xl bg-slate-100 p-2">{icon}</div>
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ListWithReason({
  items,
  emptyText,
}: {
  items?: Array<{ name: string; reason?: string; source_type?: string }>;
  emptyText: string;
}) {
  if (!items?.length) {
    return <p className="text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div
          key={`${item.name}-${idx}`}
          className="rounded-2xl border border-slate-100 bg-slate-50 p-3"
        >
          <div className="font-medium text-slate-800">{item.name}</div>
          {item.source_type && (
            <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
              Fuente: {item.source_type}
            </div>
          )}
          {item.reason && (
            <div className="mt-2 text-sm text-slate-600">{item.reason}</div>
          )}
        </div>
      ))}
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: any }) {
  const style = scenarioStyle(scenario.type);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ring-1 ${style.ring}`}
    >
      <div className="mb-4">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}>
          {style.label}
        </span>
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">
          {scenario.name}
        </h3>
      </div>

      <p className="mb-5 text-sm leading-6 text-slate-700">{scenario.narrative}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">
            Impulsores principales
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            {scenario.main_drivers?.map((driver: string, i: number) => (
              <li key={i}>• {driver}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">
            Riesgos y oportunidades asociados
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            {scenario.associated_risks_opportunities?.map((item: string, i: number) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">
            Implicancias estratégicas
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            {scenario.strategic_implications?.map((item: string, i: number) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">
            Señales o indicadores sugeridos
          </div>
          <ul className="space-y-2 text-sm text-slate-600">
            {scenario.monitoring_signals?.map((item: string, i: number) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

export default function CeplanDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('session_id') || '';
    setSessionId(id);

    if (!id) {
      setError('No se encontró session_id en la URL.');
      setLoading(false);
      return;
    }

    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/dashboard-session/${id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!res.ok) {
          throw new Error(`No se pudo recuperar la sesión ${id}`);
        }

        const payload = await res.json();
        setData(payload.result || null);
      } catch (err: any) {
        setError(err?.message || 'Ocurrió un error al cargar el dashboard.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const stats = useMemo(() => {
    return {
      tendencias: data?.selected_inputs?.trends?.length || 0,
      riesgos: data?.selected_inputs?.risks?.length || 0,
      oportunidades: data?.selected_inputs?.opportunities?.length || 0,
      megatendencias: data?.selected_inputs?.megatrends?.length || 0,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando escenario prospectivo...
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="max-w-lg rounded-3xl border border-rose-200 bg-white p-8 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-rose-700">
            <AlertCircle className="h-5 w-5" />
            Error al cargar el dashboard
          </div>
          <p className="text-sm leading-6 text-slate-700">
            {error || 'No hay datos disponibles para esta sesión.'}
          </p>
          <p className="mt-3 text-xs text-slate-500">
            session_id: {sessionId || 'no disponible'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="p-7 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
                <Sparkles className="h-4 w-4" />
                Demo de escenarios narrativos CEPLAN
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Generador de escenarios prospectivos
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Dashboard generado desde ChatGPT mediante una Action conectada a tu API y una sesión renderizada por URL.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Tendencias</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.tendencias}</div>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Riesgos</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.riesgos}</div>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Oportunidades</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.oportunidades}</div>
                </div>
                <div className="rounded-3xl bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Megatendencias</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-900">{stats.megatendencias}</div>
                </div>
              </div>
            </div>

            <div className="border-l border-slate-200 bg-slate-50 p-7 md:p-8">
              <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
                <CheckCircle2 className="h-4 w-4" />
                Parámetros del ejercicio
              </div>

              <div className="grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Tema</div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {data?.inputs?.tema}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <Briefcase className="h-4 w-4" />
                    Sector o ámbito
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {data?.inputs?.sector_ambito}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <MapPinned className="h-4 w-4" />
                    Territorio
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {data?.inputs?.territorio}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    Horizonte temporal
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {data?.inputs?.horizonte_temporal}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">
                    Pregunta central
                  </div>
                  <div className="mt-2 text-sm leading-6 text-slate-800">
                    {data?.inputs?.pregunta_central}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-4">
          <SectionCard
            title="Tendencias seleccionadas"
            icon={<TrendingUp className="h-5 w-5 text-slate-700" />}
          >
            <ListWithReason
              items={data?.selected_inputs?.trends || []}
              emptyText="No se identificaron tendencias suficientes."
            />
          </SectionCard>

          <SectionCard
            title="Riesgos seleccionados"
            icon={<ShieldAlert className="h-5 w-5 text-slate-700" />}
          >
            <ListWithReason
              items={data?.selected_inputs?.risks || []}
              emptyText="No se identificaron riesgos suficientes."
            />
          </SectionCard>

          <SectionCard
            title="Oportunidades seleccionadas"
            icon={<Sparkles className="h-5 w-5 text-slate-700" />}
          >
            <ListWithReason
              items={data?.selected_inputs?.opportunities || []}
              emptyText="No se identificaron oportunidades suficientes."
            />
          </SectionCard>

          <SectionCard
            title="Megatendencias vinculadas"
            icon={<Mountain className="h-5 w-5 text-slate-700" />}
          >
            <ListWithReason
              items={data?.selected_inputs?.megatrends || []}
              emptyText="No se identificaron megatendencias claramente pertinentes."
            />
          </SectionCard>
        </div>

        <SectionCard
          title="Lectura prospectiva"
          icon={<Sparkles className="h-5 w-5 text-slate-700" />}
        >
          <p className="text-sm leading-7 text-slate-700">
            {data?.prospective_reading?.summary}
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-800">
                Tensiones principales
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {data?.prospective_reading?.main_tensions?.map((item: string, i: number) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-800">
                Dinámica decisiva
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {data?.prospective_reading?.decisive_dynamic}
              </p>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          {data?.scenarios?.map((scenario: any) => (
            <ScenarioCard key={scenario.type} scenario={scenario} />
          ))}
        </div>

        <SectionCard
          title="Cierre ejecutivo"
          icon={<CheckCircle2 className="h-5 w-5 text-slate-700" />}
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-800">
                Hallazgos principales
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                {data?.executive_closure?.main_findings?.map((item: string, i: number) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 text-sm font-semibold text-slate-800">
                Nota metodológica
              </div>
              <p className="text-sm leading-6 text-slate-600">
                {data?.executive_closure?.methodological_note}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            {data?.disclaimer}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}