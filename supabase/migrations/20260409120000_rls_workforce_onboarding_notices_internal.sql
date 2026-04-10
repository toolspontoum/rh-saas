-- RLS em tabelas que estavam expostas sem políticas (badge UNRESTRICTED no dashboard).
-- Padrão: is_tenant_member / is_tenant_admin (definidos no schema inicial).
-- API Node usa service role e ignora RLS; isto protege acesso direto via PostgREST (anon/authenticated).

-- Log interno de migrations (também criado pelo script apply-supabase-migrations). Sem policies: clientes não acessam.
create table if not exists public._vv_migration_log (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now()
);

alter table public._vv_migration_log enable row level security;

comment on table public._vv_migration_log is
  'Registro de migrations aplicadas pelo script da API; não deve ser acessível via Data API com JWT de app.';

-- Turnos (templates): leitura para membros do tenant; gestão só admin.
alter table public.employee_shift_templates enable row level security;

create policy "employee_shift_templates_select_member"
on public.employee_shift_templates for select
using (public.is_tenant_member(tenant_id));

create policy "employee_shift_templates_manage_admin"
on public.employee_shift_templates for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- Atribuições de turno: colaborador vê o próprio; admin vê e gerencia todas.
alter table public.employee_shift_assignments enable row level security;

create policy "employee_shift_assignments_select_member"
on public.employee_shift_assignments for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "employee_shift_assignments_manage_admin"
on public.employee_shift_assignments for insert
with check (public.is_tenant_admin(tenant_id));

create policy "employee_shift_assignments_update_admin"
on public.employee_shift_assignments for update
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

create policy "employee_shift_assignments_delete_admin"
on public.employee_shift_assignments for delete
using (public.is_tenant_admin(tenant_id));

-- Onboarding: requisitos visíveis aos membros; cadastro só admin.
alter table public.employee_onboarding_requirements enable row level security;

create policy "employee_onboarding_requirements_select_member"
on public.employee_onboarding_requirements for select
using (public.is_tenant_member(tenant_id));

create policy "employee_onboarding_requirements_manage_admin"
on public.employee_onboarding_requirements for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- Submissões: colaborador no próprio registro; admin vê e homologa.
alter table public.employee_onboarding_submissions enable row level security;

create policy "employee_onboarding_submissions_select_member"
on public.employee_onboarding_submissions for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "employee_onboarding_submissions_insert_self"
on public.employee_onboarding_submissions for insert
with check (
  public.is_tenant_member(tenant_id)
  and user_id = auth.uid()
);

create policy "employee_onboarding_submissions_update_self_or_admin"
on public.employee_onboarding_submissions for update
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
)
with check (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "employee_onboarding_submissions_delete_admin"
on public.employee_onboarding_submissions for delete
using (public.is_tenant_admin(tenant_id));

-- Anexos de comunicados: mesmo padrão de documents / notices.
alter table public.notice_attachments enable row level security;

create policy "notice_attachments_select_member"
on public.notice_attachments for select
using (public.is_tenant_member(tenant_id));

create policy "notice_attachments_manage_admin"
on public.notice_attachments for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));

-- Leituras de comunicados: o próprio usuário grava; admin pode consultar agregados.
alter table public.notice_reads enable row level security;

create policy "notice_reads_select_member"
on public.notice_reads for select
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "notice_reads_insert_self"
on public.notice_reads for insert
with check (
  public.is_tenant_member(tenant_id)
  and user_id = auth.uid()
);

create policy "notice_reads_update_self_or_admin"
on public.notice_reads for update
using (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
)
with check (
  public.is_tenant_member(tenant_id)
  and (user_id = auth.uid() or public.is_tenant_admin(tenant_id))
);

create policy "notice_reads_delete_admin"
on public.notice_reads for delete
using (public.is_tenant_admin(tenant_id));

-- Catálogo global de tipos de documento + preferências por tenant/empresa.
alter table public.platform_document_types enable row level security;

create policy "platform_document_types_select_authenticated"
on public.platform_document_types for select
to authenticated
using (true);

alter table public.tenant_document_type_settings enable row level security;

create policy "tenant_document_type_settings_select_member"
on public.tenant_document_type_settings for select
using (public.is_tenant_member(tenant_id));

create policy "tenant_document_type_settings_manage_admin"
on public.tenant_document_type_settings for all
using (public.is_tenant_admin(tenant_id))
with check (public.is_tenant_admin(tenant_id));
