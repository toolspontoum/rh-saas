-- Catálogo global de tipos de documento (superadmin) + preferências por tenant (admin)

create table if not exists public.platform_document_types (
  id uuid primary key default gen_random_uuid(),
  doc_class text not null,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_document_types_class_label_unique unique (doc_class, label)
);

create index if not exists platform_document_types_class_idx on public.platform_document_types (doc_class);
create index if not exists platform_document_types_active_idx on public.platform_document_types (is_active);

create table if not exists public.tenant_document_type_settings (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  platform_document_type_id uuid not null references public.platform_document_types (id) on delete cascade,
  is_enabled boolean not null default true,
  required_for_hire boolean not null default false,
  required_for_recruitment boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, platform_document_type_id)
);

create index if not exists tenant_document_type_settings_tenant_idx on public.tenant_document_type_settings (tenant_id);

comment on table public.platform_document_types is 'Tipos de documento padrão da plataforma; superadmin cadastra por classe (aba).';
comment on table public.tenant_document_type_settings is 'Por tenant: tipo ativo nas listas e flags obrigatório contratação/recrutamento.';

-- Seed inicial (espelha catálogo legado)
insert into public.platform_document_types (doc_class, label, sort_order) values
  ('pessoal', 'Carteira de Trabalho', 10),
  ('pessoal', 'Comprovante de residência', 20),
  ('pessoal', 'CPF', 30),
  ('pessoal', 'RG', 40),
  ('pessoal', 'Título de Eleitor', 50),
  ('pessoal', 'CNH', 60),
  ('contratacao', 'Contrato de Trabalho Assinado', 10),
  ('contratacao', 'Declarações diversas', 20),
  ('contratacao', 'Documentos ASO / exames ocupacionais', 30),
  ('cursos', 'Cursos e Treinamentos', 10),
  ('cursos', 'Certificado nível superior', 20),
  ('cursos', 'Certificado nível técnico', 30),
  ('propostas', 'Proposta', 10),
  ('docs_avulsos', 'Documentos Diversos', 10),
  ('docs_rescisorios', 'Documento Rescisório', 10),
  ('docs_rescisorios', 'Aviso Prévio de Trabalho Assinado', 20),
  ('docs_rescisorios', 'Termo de Rescisão Contratual Assinado', 30)
on conflict (doc_class, label) do nothing;
