-- =====================================================================
-- Atualização 2: inscrição nos workshops e nas batalhas + jurados
--
-- Rode este arquivo UMA VEZ no SQL Editor do projeto Supabase de Cosmópolis
-- que JÁ recebeu o schema.sql. (Banco novo: rode só o schema.sql, que já
-- inclui tudo isto.)
--
-- O que muda:
--   - a inscrição passa a pedir os workshops e as batalhas que a pessoa quer
--   - batalhas: jurados atualizados e limite de competidores opcional
--   - nome artístico para quem compete
--   - sai o "horário-limite da inscrição no local" (a inscrição agora é pelo site)
-- =====================================================================

-- 1. Colunas novas
alter table battles add column if not exists max_vagas int check (max_vagas is null or max_vagas >= 0);
alter table registrations add column if not exists artistic_name text;
alter table event_settings drop column if exists battle_signup_deadline;
alter table event_settings alter column workshop_selection_enabled set default true;

-- 2. Batalhas escolhidas na inscrição
create table if not exists registration_battles (
  registration_id uuid not null references registrations(id) on delete cascade,
  battle_id uuid not null references battles(id) on delete cascade,
  primary key (registration_id, battle_id)
);
alter table registration_battles enable row level security;
drop policy if exists registration_battles_admin_select on registration_battles;
create policy registration_battles_admin_select on registration_battles for select using (is_admin());
revoke all on registration_battles from anon;
grant select on registration_battles to authenticated;

-- 3. View pública das batalhas (com limite de competidores)
drop view if exists battles_public;
create view battles_public as
select id, name, audience, judge_name, judge_photo_url, prize_first, prize_second, start_time, max_vagas, order_index
  from battles
 where active;
grant select on battles_public to anon, authenticated;

-- 4. Função de inscrição com workshops, batalhas e nome artístico
drop function if exists register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[]);
drop function if exists register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[], uuid[], text);

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

revoke execute on function register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[], uuid[], text) from public;
grant execute on function register_participant(text, text, text, text, text, date, boolean, boolean, boolean, boolean, uuid[], uuid[], text) to anon, authenticated;

-- 5. Tela de confirmação mostra workshops e batalhas escolhidos
drop function if exists get_registration_by_token(uuid);
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
grant execute on function get_registration_by_token(uuid) to anon, authenticated;

-- 6. Dados
update event_settings set workshop_selection_enabled = true;

update battles set judge_name = 'Step Pérez, Marcão e Wellington Rodrigues'
 where name = 'Batalha all style';
update battles set judge_name = 'B-boy Lula'
 where name = 'Batalha de breaking';

-- Conferência
select name, judge_name, prize_first, prize_second from battles order by order_index;
select workshop_selection_enabled from event_settings;
