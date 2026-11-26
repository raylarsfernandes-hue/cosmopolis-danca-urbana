# Colocar no ar: GitHub, Supabase e Netlify

Ordem recomendada: Supabase → GitHub → Netlify → primeiro admin → teste.

## 1. Supabase (projeto novo)

1. Em supabase.com, **New project**. Nome sugerido: `cosmopolis-danca-urbana`.
   Região: South America (São Paulo). Guarde a senha do banco.
2. **SQL Editor → New query**: cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   Se você já tinha rodado uma versão anterior do schema neste projeto, rode em vez disso
   `supabase/atualizacao_2_inscricao_workshops_batalhas.sql` (não apaga inscrições).
   No fim aparecem três tabelas de conferência: o evento (5/12/2026, Rua Ponciano Tonucci, 87),
   os 5 professores e as 2 batalhas.
3. **Project Settings → API**:
   - **Project URL** → vai em `VITE_SUPABASE_URL`. Só a URL base, ex.: `https://abcd1234.supabase.co`,
     **sem** `/rest/v1/` no final.
   - **API Keys → Legacy anon, service_role API keys → anon** (começa com `eyJ...`) → vai em
     `VITE_SUPABASE_ANON_KEY`. Nunca use a `service_role`.
4. **Authentication → Sign In / Providers → Email**: deixe ligado. Se quiser, desligue
   "Allow new users to sign up": os admins serão criados à mão (passo 4 abaixo).
5. **Storage**: o bucket `imagens` já foi criado pelo schema. Não precisa fazer nada.

## 2. GitHub (repositório novo)

1. Em github.com, **New repository**. Nome: `cosmopolis-danca-urbana`. Privado. Sem README.
2. No computador, dentro da pasta deste projeto:
   ```bash
   git init
   git add .
   git commit -m "Site do Encontro de Danças Urbanas de Cosmópolis"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/cosmopolis-danca-urbana.git
   git push -u origin main
   ```
   O `.gitignore` já impede subir `.env` e `node_modules`.

## 3. Netlify (site novo)

1. **Add new site → Import an existing project → GitHub** → escolha `cosmopolis-danca-urbana`.
2. Build command `npm run build`, publish directory `dist` (já estão no `netlify.toml`).
3. Antes do primeiro deploy, em **Site configuration → Environment variables**, crie:

   | Variável | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | URL base do projeto Supabase de Cosmópolis, sem `/rest/v1/` |
   | `VITE_SUPABASE_ANON_KEY` | anon key (legacy) desse mesmo projeto |

4. **Deploy**. Se mudar alguma variável depois: **Deploys → Trigger deploy → Clear cache and deploy site**.
5. **Site configuration → Change site name** para algo como `dancasurbanascosmopolis`
   (vira `dancasurbanascosmopolis.netlify.app`).

## 4. Criar o primeiro admin

1. Supabase → **Authentication → Users → Add user → Create new user**.
   E-mail e senha, marque **Auto Confirm User**.
2. Copie o **User UID** do usuário criado.
3. **SQL Editor**:
   ```sql
   insert into admins (user_id) values ('COLE-O-UID-AQUI');
   ```
4. Entre em `https://SEU-SITE.netlify.app/admin` com esse e-mail e senha.

Repita para cada pessoa da produção. Se o login der "Acesso não autorizado", faltou o passo 3.
Se a senha não funcionar, em Authentication → Users use "Send password recovery"
ou redefina a senha pelo próprio painel.

## 5. Teste antes de divulgar

1. Home no celular: data, endereço, "Gratuito" e "Inscrições em breve".
2. `/admin/configuracoes`: marque **Inscrições abertas**, salve. Na home aparece "Fazer inscrição".
3. Faça uma inscrição de teste maior de idade e uma menor (nascida depois de 5/12/2008):
   o menor precisa marcar a ciência do responsável.
4. Repita o mesmo CPF: o site deve recusar.
5. Em Configurações, ponha limite de vagas 1 e inscreva outro CPF: deve entrar na lista de espera.
6. `/admin/inscritos`: check-in, promover, cancelar, exportar CSV.
7. Apague os testes antes de divulgar (SQL Editor):
   ```sql
   delete from registrations;   -- apaga junto as escolhas de workshops e batalhas
   alter sequence registration_code_seq restart with 1;
   ```
   e volte o limite de vagas para o valor real.

## Onde editar cada coisa (/admin)

- **Configurações**: abrir/fechar inscrições, limite de vagas, link de formulário externo,
  PDF de autorização, escolha de workshops, nome, data, endereço, CEP, mapa
  e dados da jam (DJ, foto, horário).
- **Workshops**: professor, modalidade, horário, duração, foto e limite de vagas.
- **Batalhas**: nome, público, jurados, foto, prêmios, horário e limite de competidores.
- **Régua**: upload e ordem dos logos institucionais (vazia = oculta no site).
- **Inscritos**: busca, filtro por workshop ou batalha (lista de cada aula e de competidores), check-in, lista de espera, autorização de menores, CSV.
