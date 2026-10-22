# Chat

Aplicativo de conversas para Android, feito em React Native + Expo SDK 58. A identidade visual usa tons de índigo e ameixa e não replica o tema de outro aplicativo.

## O que já está no MVP

- Tela inicial com lista e busca de conversas.
- Tela de conversa com envio de mensagens.
- Cadastro e login por e-mail conectado ao Supabase.
- Busca de pessoas por nome de usuário e início de conversa direta.
- Recebimento de mensagens por Supabase Realtime.
- Modo demonstração local disponível quando as variáveis do Supabase estiverem vazias.
- Migrações SQL com perfis, conversas, participantes, mensagens, índices e políticas de Row Level Security (RLS).

**Estado do backend:** a migração já foi aplicada ao projeto Supabase `Chat`, as quatro tabelas foram verificadas, RLS está habilitado em todas elas e o verificador de segurança não reportou alertas. O app usa a chave pública Publishable; não use chaves Secret ou service_role no cliente.

## Requisitos

- Node.js 22.13 ou superior.
- npm.
- Expo Go para uma prévia rápida no celular; para gerar um APK instalável, use EAS Build.

## Rodar localmente

1. Instale as dependências: `npm install`
2. Copie o arquivo de configuração para `.env`: `cp .env.example .env`
3. O arquivo de exemplo já aponta para o projeto Supabase de desenvolvimento Chat. Você também pode iniciar sem `.env`: os valores públicos padrão estão configurados no cliente.
4. Valide a compatibilidade das dependências Expo: `npx expo install --check`
5. Inicie o Expo: `npx expo start`

Escaneie o QR code com o Expo Go ou use o emulador Android. Para testar as conversas online, crie duas contas e entre com cada uma em dispositivos ou sessões diferentes.

### Usar outro projeto ou ativar a demonstração local

Defina `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` no seu `.env` para substituir o projeto padrão. Para trabalhar sem backend, deixe as duas variáveis vazias no `.env`; assim, a interface abre com dados de demonstração e as mensagens ficam somente no dispositivo.

## Conectar ao Supabase

O projeto Supabase de desenvolvimento está em `https://zwwgufeavnxclwhkvclo.supabase.co`.

As migrações usadas são:

- `supabase/migrations/202610220001_chat_schema.sql`
- `supabase/migrations/202610220002_chat_query_indexes.sql`

Elas já foram aplicadas no projeto conectado. Para instalar em um novo projeto, abra **SQL Editor** e execute os arquivos em ordem. Em **Project Connect / API Keys**, obtenha a URL e a chave **Publishable** desse projeto.

**Segurança:** a chave Publishable foi feita para uso no cliente e não substitui autorização. O acesso é controlado por RLS e pelas políticas do banco. Nunca coloque chaves **Secret** ou **service_role** no código mobile ou no GitHub.

## Gerar APK para Android

1. Entre na sua conta Expo e inicialize a ligação deste app ao EAS:

   `npx eas-cli@latest login`

   `npx eas-cli@latest init`

2. Gere um APK de testes:

   `npx eas-cli@latest build --platform android --profile preview`

O perfil `preview` em `eas.json` está configurado para produzir um APK de distribuição interna. O build precisa ser executado com uma conta EAS válida.

## Estrutura principal

- `App.tsx`: telas, autenticação e fluxo de conversa.
- `lib/supabase.ts`: cliente Supabase para o app.
- `supabase/migrations/`: estrutura do banco, índices e políticas RLS.
- `.env.example`: configuração do projeto de desenvolvimento.
- `eas.json`: perfis de build Android.
- `.github/workflows/validate.yml`: verificações automáticas de dependências, TypeScript e Expo.

## Limitações atuais

- O MVP online implementa conversas diretas entre duas contas. Grupos reais, criação de salas, anexos, notificações e moderação ficam para próximas etapas.
- A migração e as políticas do banco foram verificadas pelo conector Supabase, mas ainda não consegui executar o app em um dispositivo ou completar um teste real de duas contas.
- O APK ainda não foi compilado; isso exige instalar dependências e executar o build EAS com uma conta Expo.
