alter table public.documents
  add column if not exists title text,
  add column if not exists description text;

update public.documents
set title = coalesce(nullif(title, ''), category)
where title is null or title = '';

alter table public.documents
  alter column title set not null;
