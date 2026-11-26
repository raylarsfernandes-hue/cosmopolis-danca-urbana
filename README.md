# Encontro de Danças Urbanas de Cosmópolis · site e inscrições

React + Vite + TypeScript, Supabase (Postgres, Auth, Storage) e deploy no Netlify.
Projeto independente: repositório, banco e site próprios. Nenhum dado de outro evento.

## Estrutura

```
src/pages/            Home, Inscricao, Confirmacao
src/pages/admin/      Login, Painel, Inscritos, Workshops, Batalhas, Régua, Configurações
src/components/       Header, Footer, PartnerBar (régua), BattleCard, ImageField, Graphics
src/hooks/            useEventSettings, usePublicList, useAvailability
src/utils/            format (CPF, datas, dinheiro), csv, image (links do Google Drive)
supabase/schema.sql   schema inicial consolidado (banco novo)
supabase/atualizacao_2_inscricao_workshops_batalhas.sql   atualização para banco que já tinha o schema
```

## Regras de inscrição (garantidas no banco, não só na tela)

- Uma inscrição por CPF. Nela a pessoa escolhe os workshops e as batalhas em que vai competir.
- Inscrição só grava pela função `register_participant`, que trava a linha de
  `event_settings` (`FOR UPDATE`): inscrições simultâneas entram uma de cada vez.
- Com o limite de vagas atingido, a inscrição entra como `waitlisted` com posição.
  Status possíveis: `confirmed`, `waitlisted`, `cancelled`.
- Idade calculada na data do evento. Menor de 18 precisa marcar a ciência da
  autorização do responsável; consentimento de uso de imagem é obrigatório.
- Com `registrations_open = false`, o site mostra "Inscrições em breve" e o banco recusa inscrições.
- Workshops e batalhas escolhidos ficam em `registration_workshops` e `registration_battles`.
  Cada workshop e cada batalha pode ter limite próprio (vazio = sem limite).
- Quem marca batalha precisa informar o nome artístico.
- A escolha de workshops pode ser desligada em Configurações (`workshop_selection_enabled`).

## Segurança

- RLS em todas as tabelas. Visitantes leem só views públicas e `event_settings`.
- Dados de inscritos só são legíveis por quem está na tabela `admins`.
- Bucket `imagens` no Storage: leitura pública, envio só por admins.
- No front-end vai apenas a anon key.

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha com o projeto Supabase de Cosmópolis
npm run dev
```

O passo a passo de GitHub, Supabase e Netlify está em `SETUP.md`.
