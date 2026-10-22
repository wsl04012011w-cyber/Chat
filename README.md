# Chat

Aplicativo de conversas para Android, feito em React Native + Expo. A identidade visual usa tons de índigo e ameixa e não replica o tema de outro aplicativo.

## O que já está no MVP

- Tela inicial com lista e busca de conversas.
- Tela de conversa com envio de mensagens.
- Cadastro e login por e-mail quando o Supabase estiver configurado.
- Busca de pessoas por nome de usuário e início de conversa direta.
- Assinatura do Supabase Realtime para receber novas mensagens.
- Modo demonstração local, para explorar a interface sem configurar credenciais.
- Migração SQL com perfis, conversas, participantes, mensagens e políticas de Row Level Security (RLS).

**Importante:** no modo de demonstração, mensagens não são enviadas pela internet nem compartilhadas com amigos. O modo online exige um projeto Supabase configurado.

## Requisitos

- Node.js 22.13 ou superior.
- npm.
- Expo Go para uma prévia rápida no celular; para gerar um APK instalável, use EAS Build.

## Rodar localmente

1. Instale as dependências: `npm install`
2. Copie o arquivo de exemplo para `.env`: `cp .env.example .env`
3. Para experimentar apenas a interface, deixe os valores de Supabase como placeholders. O app abrirá em modo demonstração.
4. Inicie o Expo: `npx expo start`

Escaneie o QR code com o Expo Go ou use o emulador Android.

## Conectar ao Supabase

1. Crie um projeto no painel do Supabase.
2. Abra **SQL Editor** e execute o conteúdo de `supabase/migrations/202610220001_chat_schema.sql`.
3. Em **Project Connect / API Keys**, copie a URL do projeto e a chave **Publishable**.
4. Preencha o arquivo local `.env`:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SUA_CHAVE
   ```

5. Reinicie o Expo para carregar as variáveis e teste o cadastro com dois usuários diferentes.

Use somente a chave Publishable no app. **Nunca coloque chaves Secret ou service_role em código mobile nem as envie para o GitHub.** As tabelas têm RLS habilitado, mas as políticas precisam ser verificadas no projeto real antes de produção.

## Gerar APK para Android

1. Entre na sua conta Expo e inicialize a ligação deste app ao EAS:

   `npx eas-cli@latest login`

   `npx eas-cli@latest init`

2. Gere um APK de testes:

   `npx eas-cli@latest build --platform android --profile preview`

O perfil `preview` em `eas.json` está configurado para produzir um APK de distribuição interna. O build precisa ser executado com uma conta EAS válida.

## Estrutura principal

- `App.tsx`: telas, autenticação e fluxo de conversa.
- `lib/supabase.ts`: criação do cliente Supabase para o app.
- `supabase/migrations/`: estrutura do banco de dados e políticas RLS.
- `.env.example`: nomes das variáveis necessárias, sem segredos.
- `eas.json`: perfis de build Android.

## Estado da integração

A estrutura de cliente e o SQL estão preparados no repositório, mas a conta Supabase conectada durante a configuração não tinha projetos disponíveis. Por isso, a migração ainda não foi aplicada nem validada em um banco ativo.
