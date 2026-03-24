"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { apiFetch } from "../../../../lib/api";

type Job = { id: string; title: string; status: string; description: string };
type Paginated<T> = { items: T[] };

export default function CandidatePortalPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [jobId, setJobId] = useState("");
  const [fullName, setFullName] = useState("Candidato Interno");
  const [email, setEmail] = useState("interno.candidato@exemplo.com");
  const [coverLetter, setCoverLetter] = useState("Tenho interesse nessa oportunidade.");

  useEffect(() => {
    apiFetch<Paginated<Job>>(`/v1/tenants/${tenantId}/jobs?page=1&pageSize=100&status=published`)
      .then((data) => {
        setJobs(data.items);
        if (data.items.length > 0) setJobId(data.items[0]?.id ?? "");
      })
      .catch((err: Error) => setError(err.message));
  }, [tenantId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!jobId) {
      setError("Selecione uma vaga.");
      return;
    }
    setError(null);
    setOkMsg(null);

    try {
      await apiFetch(`/v1/tenants/${tenantId}/jobs/${jobId}/applications`, {
        method: "POST",
        body: JSON.stringify({
          coverLetter,
          candidate: {
            fullName,
            email,
            source: "candidate-portal"
          }
        })
      });
      setOkMsg("Candidatura enviada.");
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <main className="container stack" style={{ margin: 0 }}>
      <h1>Portal do candidato</h1>
      {error ? <p className="error">{error}</p> : null}
      {okMsg ? <p>{okMsg}</p> : null}

      <div className="card stack">
        <h3>Vagas publicadas</h3>
        {jobs.map((job) => (
          <div key={job.id}>
            <strong>{job.title}</strong>
            <p>{job.description}</p>
          </div>
        ))}
      </div>

      <div className="card stack">
        <h3>Candidatar-se</h3>
        <form className="stack" onSubmit={submit}>
          <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
          <textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} />
          <button type="submit">Enviar</button>
        </form>
      </div>
    </main>
  );
}
