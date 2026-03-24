# Supabase Setup

## O que precisa configurar

- `SUPABASE_PROJECT_REF` (project id/ref do projeto remoto)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Regras de uso

- `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`:
  - Podem ficar no frontend.
  - Sao chaves publicas (com protecao real feita por RLS).

- `SUPABASE_SERVICE_ROLE_KEY`:
  - Nunca pode ir para frontend.
  - Uso exclusivo no backend (API Node, jobs, scripts administrativos).
  - Nunca commitar em repositiorio.

## Onde obter no Supabase

1. Abra o projeto no painel Supabase.
2. Va em `Settings -> API`.
3. Copie:
   - `Project URL` -> `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` -> `SUPABASE_SERVICE_ROLE_KEY`
4. O `project ref` e o identificador do projeto (tambem usado no CLI link).

## CLI (quando quiser ligar local ao remoto)

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

