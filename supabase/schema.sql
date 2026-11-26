-- =====================================================================
-- Encontro de Danças Urbanas de Cosmópolis — schema inicial consolidado
--
-- Rode este arquivo UMA VEZ, inteiro, no SQL Editor de um projeto
-- Supabase NOVO (não use o projeto do outro evento).
--
-- Reúne num arquivo só tudo o que no projeto anterior estava espalhado em
-- schema + migrações, já adaptado para um evento de UM DIA:
--   - configurações do evento numa linha única (event_settings)
--   - uma inscrição por CPF para o dia inteiro, com trava de vagas no banco
--     e lista de espera automática quando o limite é atingido
--   - workshops (professor + modalidade + horário), escolhidos na inscrição
--   - batalhas com jurados e premiação, também escolhidas na inscrição
--   - régua institucional alimentada pelo admin (começa vazia)
--   - bucket público de imagens no Storage, com escrita só para admins
--   - Row Level Security em tudo
--
-- Se precisar rodar de novo num banco que já tem parte disso, o arquivo
-- apaga funções e views antes de recriar (assinaturas e colunas podem mudar).
-- Tabelas usam "if not exists" e não perdem dados.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 0. Limpeza de objetos que serão recriados
-- ---------------------------------------------------------------------
drop view if exists availability_public;
drop view if exists workshops_public;
drop view if exists battles_public;
drop view if exists partner_logos_public;

drop function if exists register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[]);
drop function if exists register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[], uuid[], text);
drop function if exists get_registration_by_token(uuid);
drop function if exists admin_cancel_registration(uuid);
drop function if exists admin_reactivate_registration(uuid);
drop function if exists admin_promote_waitlist(uuid);
drop function if exists admin_set_checkin(uuid, boolean);
drop function if exists admin_set_guardian_status(uuid, text);

-- ---------------------------------------------------------------------
-- 1. Administradores
-- ---------------------------------------------------------------------
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------
-- 2. Configurações do evento (uma linha só, editável em /admin)
--    Campos sem informação confirmada ficam nulos de propósito.
-- ---------------------------------------------------------------------
create table if not exists event_settings (
  id boolean primary key default true check (id),
  event_name text not null default 'Encontro de Danças Urbanas de Cosmópolis',
  event_objective text,
  event_date date not null default '2026-12-05',
  location_name text,                       -- nome do espaço (ainda não informado)
  location_address text not null default '',
  location_cep text,                        -- CEP ainda não confirmado
  map_query text,                           -- texto de busca no Google Maps
  registrations_open boolean not null default false,
  registration_form_url text,               -- se preenchido, o botão de inscrição leva para este link
  max_vagas int check (max_vagas is null or max_vagas >= 0),  -- nulo = sem limite
  guardian_authorization_pdf_url text,
  workshop_selection_enabled boolean not null default true,  -- escolha de workshops na inscrição
  jam_dj_name text,
  jam_dj_photo_url text,
  jam_start_time time,
  jam_duration_minutes int,
  partner_bar_label text not null default 'Apoio',
  updated_at timestamptz not null default now()
);

insert into event_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 3. Workshops: professor + modalidade + horário
--    Modalidade e horário começam vazios. O site só mostra esses campos
--    quando estiverem preenchidos.
-- ---------------------------------------------------------------------
create table if not exists workshops (
  id uuid primary key default gen_random_uuid(),
  teacher_name text not null,
  modality text,
  start_time time,
  duration_minutes int check (duration_minutes is null or duration_minutes > 0),
  photo_url text,
  bio text,
  max_vagas int check (max_vagas is null or max_vagas >= 0),  -- usado só com a escolha de workshops ligada
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. Batalhas (inscrição pelo site, junto com a inscrição geral)
-- ---------------------------------------------------------------------
create table if not exists battles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audience text,
  judge_name text,                          -- jurado(s), ex.: "Step Pérez, Marcão e Wellington Rodrigues"
  judge_photo_url text,
  max_vagas int check (max_vagas is null or max_vagas >= 0),  -- nulo = sem limite de competidores
  prize_first numeric(10,2),
  prize_second numeric(10,2),
  start_time time,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. Régua institucional (começa vazia; some do site enquanto vazia)
-- ---------------------------------------------------------------------
create table if not exists partner_logos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  image_url text not null,
  order_index int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Inscrições: uma por pessoa (CPF) para o dia inteiro
-- ---------------------------------------------------------------------
create sequence if not exists registration_code_seq start 1;

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  confirmation_token uuid not null unique default gen_random_uuid(),
  full_name text not null,
  cpf text not null,
  phone text not null,
  email text not null,
  instagram text,
  artistic_name text,                       -- nome artístico (para quem compete nas batalhas)
  birth_date date not null,
  consent_required boolean not null default false,
  image_consent boolean not null default false,
  guardian_ack boolean not null default false,
  guardian_authorization_status text not null default 'nao_necessaria'
    check (guardian_authorization_status in ('nao_necessaria', 'pendente', 'confirmada')),
  consent_marketing boolean not null default false,
  status text not null default 'confirmed'
    check (status in ('confirmed', 'waitlisted', 'cancelled')),
  waitlist_position int,
  checked_in boolean not null default false,
  created_at timestamptz not null default now()
);

-- mesmo CPF não pode ter duas inscrições ativas
create unique index if not exists uq_registrations_cpf_active
  on registrations (cpf)
  where (status in ('confirmed', 'waitlisted'));

create index if not exists idx_registrations_status on registrations(status);
create index if not exists idx_registrations_created on registrations(created_at);

-- workshops escolhidos na inscrição
create table if not exists registration_workshops (
  registration_id uuid not null references registrations(id) on delete cascade,
  workshop_id uuid not null references workshops(id) on delete cascade,
  primary key (registration_id, workshop_id)
);

-- batalhas em que a pessoa vai competir
create table if not exists registration_battles (
  registration_id uuid not null references registrations(id) on delete cascade,
  battle_id uuid not null references battles(id) on delete cascade,
  primary key (registration_id, battle_id)
);

-- ---------------------------------------------------------------------
-- 7. Views públicas (o que visitantes conseguem ler)
-- ---------------------------------------------------------------------
create view workshops_public as
select id, teacher_name, modality, start_time, duration_minutes, photo_url, order_index
  from workshops
 where active;

create view battles_public as
select id, name, audience, judge_name, judge_photo_url, prize_first, prize_second, start_time, max_vagas, order_index
  from battles
 where active;

create view partner_logos_public as
select id, name, image_url, order_index
  from partner_logos
 where active;

-- vagas do dia, sem expor dados de ninguém
create view availability_public as
select
  s.registrations_open,
  s.max_vagas,
  coalesce(r.taken, 0)::int as taken,
  case when s.max_vagas is null then null
       else greatest(s.max_vagas - coalesce(r.taken, 0), 0)::int end as vagas_restantes,
  case
    when s.max_vagas is null then 'disponivel'
    when coalesce(r.taken, 0) >= s.max_vagas then 'lista_espera'
    when (s.max_vagas - coalesce(r.taken, 0)) <= 15 then 'ultimas'
    else 'disponivel'
  end as status
from event_settings s
left join (select count(*) as taken from registrations where status = 'confirmed') r on true;

-- ---------------------------------------------------------------------
-- 8. Inscrição (único caminho para gravar uma inscrição)
--    Trava a linha de event_settings: inscrições simultâneas entram uma
--    de cada vez, então a contagem nunca passa do limite.
--    Limite atingido -> entra como lista de espera, com posição.
-- ---------------------------------------------------------------------
create or replace function register_participant(
  p_full_name text,
  p_cpf text,
  p_phone text,
  p_email text,
  p_instagram text,
  p_birth_date date,
  p_consent_required boolean,
  p_image_consent boolean,
  p_guardian_ack boolean,
  p_consent_marketing boolean,
  p_workshop_ids uuid[] default null,
  p_battle_ids uuid[] default null,
  p_artistic_name text default null
) returns table(code text, result_status text, confirmation_token uuid, waitlist_position int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings event_settings%rowtype;
  v_cpf text;
  v_age int;
  v_is_minor boolean;
  v_taken int;
  v_waiting int;
  v_status text;
  v_position int;
  v_code text;
  v_token uuid;
  v_reg_id uuid;
  v_wid uuid;
  v_wmax int;
  v_wtaken int;
begin
  if coalesce(array_length(p_battle_ids, 1), 0) > 0 and length(trim(coalesce(p_artistic_name, ''))) = 0 then
    raise exception 'NOME_ARTISTICO_OBRIGATORIO';
  end if;

  if p_consent_required is not true then raise exception 'CONSENTIMENTO_OBRIGATORIO'; end if;
  if p_image_consent is not true then raise exception 'CONSENTIMENTO_IMAGEM_OBRIGATORIO'; end if;
  if p_birth_date is null or p_birth_date > current_date or p_birth_date < date '1900-01-01' then
    raise exception 'DATA_NASCIMENTO_INVALIDA';
  end if;

  v_cpf := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  if length(v_cpf) <> 11 then raise exception 'CPF_INVALIDO'; end if;
  if p_full_name is null or length(trim(p_full_name)) < 3 then raise exception 'NOME_INVALIDO'; end if;
  if p_email is null or p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'EMAIL_INVALIDO'; end if;
  if length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) < 10 then raise exception 'TELEFONE_INVALIDO'; end if;

  select * into v_settings from event_settings limit 1 for update;

  if not v_settings.registrations_open then raise exception 'INSCRICOES_FECHADAS'; end if;

  -- idade na data do evento, não na data da inscrição
  v_age := extract(year from age(v_settings.event_date, p_birth_date));
  v_is_minor := v_age < 18;
  if v_is_minor and p_guardian_ack is not true then
    raise exception 'CIENCIA_RESPONSAVEL_OBRIGATORIA';
  end if;

  if exists (select 1 from registrations r where r.cpf = v_cpf and r.status in ('confirmed', 'waitlisted')) then
    raise exception 'JA_INSCRITO';
  end if;

  select count(*) filter (where r.status = 'confirmed'),
         count(*) filter (where r.status = 'waitlisted')
    into v_taken, v_waiting
    from registrations r;

  if v_settings.max_vagas is null or v_taken < v_settings.max_vagas then
    v_status := 'confirmed';
    v_position := null;
  else
    v_status := 'waitlisted';
    v_position := v_waiting + 1;
  end if;

  v_code := 'EDUC-' || lpad(nextval('registration_code_seq')::text, 5, '0');

  insert into registrations (
    code, full_name, cpf, phone, email, instagram, artistic_name, birth_date,
    consent_required, image_consent, guardian_ack, guardian_authorization_status,
    consent_marketing, status, waitlist_position
  ) values (
    v_code, trim(p_full_name), v_cpf, trim(p_phone), lower(trim(p_email)),
    nullif(trim(p_instagram), ''), nullif(trim(p_artistic_name), ''), p_birth_date,
    true, true, coalesce(p_guardian_ack, false),
    case when v_is_minor then 'pendente' else 'nao_necessaria' end,
    coalesce(p_consent_marketing, false), v_status, v_position
  )
  returning id, registrations.confirmation_token into v_reg_id, v_token;

  -- workshops escolhidos (com a escolha ligada em Configurações)
  if v_settings.workshop_selection_enabled and coalesce(array_length(p_workshop_ids, 1), 0) > 0 then
    foreach v_wid in array (select array_agg(distinct x) from unnest(p_workshop_ids) x)
    loop
      select w.max_vagas into v_wmax from workshops w where w.id = v_wid and w.active for update;
      if not found then raise exception 'WORKSHOP_INVALIDO'; end if;
      if v_wmax is not null and v_status = 'confirmed' then
        select count(*) into v_wtaken
          from registration_workshops rw
          join registrations r on r.id = rw.registration_id
         where rw.workshop_id = v_wid and r.status = 'confirmed';
        if v_wtaken >= v_wmax then raise exception 'WORKSHOP_ESGOTADO'; end if;
      end if;
      insert into registration_workshops (registration_id, workshop_id) values (v_reg_id, v_wid);
    end loop;
  end if;

  -- batalhas em que vai competir
  if coalesce(array_length(p_battle_ids, 1), 0) > 0 then
    foreach v_wid in array (select array_agg(distinct x) from unnest(p_battle_ids) x)
    loop
      select b.max_vagas into v_wmax from battles b where b.id = v_wid and b.active for update;
      if not found then raise exception 'BATALHA_INVALIDA'; end if;
      if v_wmax is not null and v_status = 'confirmed' then
        select count(*) into v_wtaken
          from registration_battles rb
          join registrations r on r.id = rb.registration_id
         where rb.battle_id = v_wid and r.status = 'confirmed';
        if v_wtaken >= v_wmax then raise exception 'BATALHA_ESGOTADA'; end if;
      end if;
      insert into registration_battles (registration_id, battle_id) values (v_reg_id, v_wid);
    end loop;
  end if;

  return query select v_code, v_status, v_token, v_position;
end;
$$;

-- tela de confirmação: busca pelo token (não adivinhável), devolve só o necessário
create or replace function get_registration_by_token(p_token uuid)
returns table(code text, full_name text, status text, waitlist_position int, is_minor boolean,
              artistic_name text, workshops text[], battles text[])
language sql
stable
security definer
set search_path = public
as $$
  select r.code, r.full_name, r.status, r.waitlist_position,
         extract(year from age(s.event_date, r.birth_date)) < 18,
         r.artistic_name,
         array(select coalesce(w.modality || ' com ' || w.teacher_name, 'Workshop com ' || w.teacher_name)
                 from registration_workshops rw join workshops w on w.id = rw.workshop_id
                where rw.registration_id = r.id order by w.start_time nulls last, w.order_index),
         array(select b.name from registration_battles rb join battles b on b.id = rb.battle_id
                where rb.registration_id = r.id order by b.order_index)
    from registrations r
    cross join event_settings s
   where r.confirmation_token = p_token;
$$;

-- ---------------------------------------------------------------------
-- 9. Funções do admin
-- ---------------------------------------------------------------------
create or replace function admin_cancel_registration(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'NAO_AUTORIZADO'; end if;
  update registrations set status = 'cancelled', waitlist_position = null where id = p_id;
end;
$$;

-- reativar ou promover da lista de espera: só se houver vaga
create or replace function admin_reactivate_registration(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cpf text;
  v_max int;
  v_taken int;
begin
  if not is_admin() then raise exception 'NAO_AUTORIZADO'; end if;

  select max_vagas into v_max from event_settings limit 1 for update;
  select cpf into v_cpf from registrations where id = p_id;

  if exists (
    select 1 from registrations
     where cpf = v_cpf and id <> p_id and status in ('confirmed', 'waitlisted')
  ) then
    raise exception 'JA_INSCRITO';
  end if;

  select count(*) into v_taken from registrations where status = 'confirmed' and id <> p_id;
  if v_max is not null and v_taken >= v_max then
    raise exception 'SEM_VAGAS';
  end if;

  update registrations set status = 'confirmed', waitlist_position = null where id = p_id;
end;
$$;

create or replace function admin_promote_waitlist(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  select admin_reactivate_registration(p_id);
$$;

create or replace function admin_set_checkin(p_id uuid, p_checked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'NAO_AUTORIZADO'; end if;
  update registrations set checked_in = p_checked where id = p_id and status = 'confirmed';
end;
$$;

create or replace function admin_set_guardian_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then raise exception 'NAO_AUTORIZADO'; end if;
  update registrations set guardian_authorization_status = p_status
   where id = p_id and guardian_authorization_status <> 'nao_necessaria';
end;
$$;

-- ---------------------------------------------------------------------
-- 10. Row Level Security
-- ---------------------------------------------------------------------
alter table admins enable row level security;
alter table event_settings enable row level security;
alter table workshops enable row level security;
alter table battles enable row level security;
alter table partner_logos enable row level security;
alter table registrations enable row level security;
alter table registration_workshops enable row level security;
alter table registration_battles enable row level security;

drop policy if exists admins_self_select on admins;
create policy admins_self_select on admins for select using (is_admin());

drop policy if exists event_settings_public_read on event_settings;
create policy event_settings_public_read on event_settings for select using (true);
drop policy if exists event_settings_admin_update on event_settings;
create policy event_settings_admin_update on event_settings for update using (is_admin()) with check (is_admin());

drop policy if exists workshops_admin_all on workshops;
create policy workshops_admin_all on workshops for all using (is_admin()) with check (is_admin());

drop policy if exists battles_admin_all on battles;
create policy battles_admin_all on battles for all using (is_admin()) with check (is_admin());

drop policy if exists partner_logos_admin_all on partner_logos;
create policy partner_logos_admin_all on partner_logos for all using (is_admin()) with check (is_admin());

-- inscrições: visitantes não leem nem escrevem direto (só via função)
drop policy if exists registrations_admin_select on registrations;
create policy registrations_admin_select on registrations for select using (is_admin());

drop policy if exists registration_workshops_admin_select on registration_workshops;
create policy registration_workshops_admin_select on registration_workshops for select using (is_admin());
drop policy if exists registration_battles_admin_select on registration_battles;
create policy registration_battles_admin_select on registration_battles for select using (is_admin());

-- ---------------------------------------------------------------------
-- 11. Permissões
-- ---------------------------------------------------------------------
revoke all on registrations, registration_workshops, registration_battles, admins, workshops, battles, partner_logos from anon;
revoke insert, update, delete on registrations from authenticated;

grant select on event_settings to anon, authenticated;
grant update on event_settings to authenticated;
grant select, insert, update, delete on workshops, battles, partner_logos to authenticated;
grant select on registrations, registration_workshops, registration_battles, admins to authenticated;

grant select on workshops_public, battles_public, partner_logos_public, availability_public to anon, authenticated;

revoke execute on function register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[], uuid[], text) from public;
grant execute on function register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[], uuid[], text) to anon, authenticated;
grant execute on function get_registration_by_token(uuid) to anon, authenticated;
grant execute on function is_admin() to anon, authenticated;

revoke execute on function admin_cancel_registration(uuid) from public;
revoke execute on function admin_reactivate_registration(uuid) from public;
revoke execute on function admin_promote_waitlist(uuid) from public;
revoke execute on function admin_set_checkin(uuid, boolean) from public;
revoke execute on function admin_set_guardian_status(uuid, text) from public;
grant execute on function admin_cancel_registration(uuid) to authenticated;
grant execute on function admin_reactivate_registration(uuid) to authenticated;
grant execute on function admin_promote_waitlist(uuid) to authenticated;
grant execute on function admin_set_checkin(uuid, boolean) to authenticated;
grant execute on function admin_set_guardian_status(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 12. Storage: bucket público "imagens" (logos da régua, fotos)
--     Qualquer um vê; só admin envia, troca ou apaga.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('imagens', 'imagens', true)
on conflict (id) do update set public = true;

drop policy if exists imagens_admin_insert on storage.objects;
create policy imagens_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and public.is_admin());
drop policy if exists imagens_admin_update on storage.objects;
create policy imagens_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'imagens' and public.is_admin());
drop policy if exists imagens_admin_delete on storage.objects;
create policy imagens_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and public.is_admin());

-- ---------------------------------------------------------------------
-- 13. Dados iniciais (só o que está confirmado no briefing)
-- ---------------------------------------------------------------------
update event_settings
   set event_name = 'Encontro de Danças Urbanas de Cosmópolis',
       event_objective = 'Difundir as danças urbanas no município, oferecer formação em diferentes estilos e valorizar quem dança.',
       event_date = date '2026-12-05',
       location_address = 'Rua Ponciano Tonucci, 87, Parque Dona Esther, Cosmópolis/SP',
       map_query = 'Rua Ponciano Tonucci, 87, Parque Dona Esther, Cosmópolis - SP',
       jam_dj_name = 'DJ Léo'
 where location_address = '';

insert into workshops (teacher_name, order_index)
select * from (values
  ('Step Pérez', 1),
  ('Marcão', 2),
  ('Nenê', 3),
  ('Wellington Rodrigues', 4),
  ('B-boy Lula', 5)
) v(teacher_name, order_index)
where not exists (select 1 from workshops);

insert into battles (name, audience, judge_name, prize_first, prize_second, order_index)
select * from (values
  ('Batalha de breaking', 'Para b-boys e b-girls.', 'B-boy Lula', 800.00, 200.00, 1),
  ('Batalha all style', 'Aberta a diferentes estilos de dança.', 'Step Pérez, Marcão e Wellington Rodrigues', 800.00, 200.00, 2)
) v(name, audience, judge_name, prize_first, prize_second, order_index)
where not exists (select 1 from battles);

-- ---------------------------------------------------------------------
-- Conferência
-- ---------------------------------------------------------------------
select event_name, event_date, location_address, registrations_open, max_vagas from event_settings;
select teacher_name, modality, start_time from workshops order by order_index;
select name, judge_name, prize_first, prize_second from battles order by order_index;
