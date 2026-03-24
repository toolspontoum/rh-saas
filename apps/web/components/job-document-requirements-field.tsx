"use client";

import { useState } from "react";

import {
  jobDocumentTabs,
  jobDocumentTabsForJobForm,
  jobTabDocTypes,
  type JobDocTabKey
} from "../lib/job-document-tabs";

export type JobDocumentRequirementValue = {
  id: string;
  docTab: JobDocTabKey;
  docType: string;
  label?: string | null;
};

type Props = {
  value: JobDocumentRequirementValue[];
  onChange: (next: JobDocumentRequirementValue[]) => void;
};

const defaultJobFormTab = jobDocumentTabsForJobForm[0]?.key ?? "pessoal";

export function JobDocumentRequirementsField({ value, onChange }: Props) {
  const [activeTab, setActiveTab] = useState<JobDocTabKey>(defaultJobFormTab);
  const types = jobTabDocTypes[activeTab];

  function addDoc(docType: string) {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `dr-${Date.now()}`;
    onChange([
      ...value,
      {
        id,
        docTab: activeTab,
        docType,
        label: null
      }
    ]);
  }

  function remove(id: string) {
    onChange(value.filter((r) => r.id !== id));
  }

  function updateLabel(id: string, label: string) {
    onChange(
      value.map((r) =>
        r.id === id
          ? {
              ...r,
              label: label.trim() ? label : null
            }
          : r
      )
    );
  }

  function getLabelPlaceholder(req: JobDocumentRequirementValue): string {
    if (req.docType === "Certificado nível superior") {
      return "Ex.: Certificado de conclusão de curso superior";
    }
    if (req.docType === "Documentos Diversos") {
      return "Comprovante de participação";
    }
    return "Ex.: NR-10, Certificado Excel Avançado, Comprovante complementar";
  }

  return (
    <div className="card stack" style={{ padding: 12 }}>
      <div className="section-header">
        <h3>Documentos solicitados ao candidato</h3>
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        Defina quais documentos o candidato deve anexar na candidatura. Os arquivos ficam vinculados ao usuário dele e
        permanecem nos documentos do colaborador quando for contratado. Algumas abas do colaborador não aparecem aqui
        por não serem usuais na candidatura; requisitos antigos dessas abas continuam listados abaixo se existirem.
      </p>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        {jobDocumentTabsForJobForm.map((t) => (
          <button
            key={t.key}
            type="button"
            className={activeTab === t.key ? "" : "secondary"}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="stack">
        <span>Adicionar documento da aba «{jobDocumentTabs.find((x) => x.key === activeTab)?.label}»</span>
        <select
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            e.target.value = "";
            if (v) addDoc(v);
          }}
        >
          <option value="">Selecione o tipo…</option>
          {types.map((dt) => (
            <option key={dt} value={dt}>
              {dt}
            </option>
          ))}
        </select>
      </label>
      {value.length > 0 ? (
        <ul className="stack" style={{ gap: 8, listStyle: "none", paddingLeft: 0 }}>
          {value.map((req) => (
            <li key={req.id} className="card stack" style={{ padding: 10 }}>
              <div className="row" style={{ alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <strong>{req.docType}</strong>
                  <span className="muted">
                    {" "}
                    — {jobDocumentTabs.find((t) => t.key === req.docTab)?.label ?? req.docTab}
                  </span>
                </div>
                <button type="button" className="danger" onClick={() => remove(req.id)}>
                  Remover
                </button>
              </div>
              {(req.docTab === "cursos" || req.docTab === "docs_avulsos") && (
                <label className="stack" style={{ marginTop: 6 }}>
                  <span>Título exibido para o candidato</span>
                  <input
                    value={req.label ?? ""}
                    onChange={(e) => updateLabel(req.id, e.target.value)}
                    placeholder={getLabelPlaceholder(req)}
                    maxLength={240}
                  />
                </label>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">Nenhum documento obrigatório nesta vaga.</p>
      )}
    </div>
  );
}
