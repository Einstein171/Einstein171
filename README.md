# EinsteinEditaveis

Site full-stack em React + Vite + Express + PostgreSQL, pronto para GitHub e Render.

## Recursos

- Landing page azul usando a imagem enviada em `public/einstein.png`
- Cadastro de usuários
- Login com JWT
- Senhas com hash bcrypt
- Painel do usuário
- Painel administrativo
- Listagem, ativação/desativação, promoção para admin e exclusão de usuários
- Botão fixo de suporte pelo WhatsApp
- PostgreSQL para produção
- `render.yaml` para deploy no Render

## Rodando localmente

1. Instale Node.js 18+.
2. Instale PostgreSQL localmente ou use um banco PostgreSQL remoto.
3. Copie `.env.example` para `.env` e configure `DATABASE_URL`.
4. Execute:

```bash
npm install
npm run build
npm start
```

Abra `http://localhost:3000`.

Para desenvolvimento visual, você pode usar:

```bash
npm install
npm run build
npm start
```

## Deploy no GitHub + Render

1. Crie um repositório no GitHub e envie todos os arquivos.
2. No Render, escolha **New + Blueprint** e conecte o repositório.
3. O `render.yaml` cria o Web Service e o PostgreSQL.
4. Na criação do serviço, informe um valor forte para `ADMIN_PASSWORD`.
5. Altere `VITE_WHATSAPP_NUMBER` para o número de suporte, com DDI e DDD, sem `+`.

### Exemplo

Brasil: `5511999999999`

## Primeiro acesso do admin

O servidor cria automaticamente um administrador se o e-mail configurado em `ADMIN_EMAIL` ainda não existir.

Use as variáveis:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

**Importante:** troque a senha padrão antes de colocar o site em produção.

## Observações de segurança

- Nunca publique seu `.env`.
- Em produção, use um `JWT_SECRET` longo e aleatório.
- O PostgreSQL do Render é usado para manter contas e sessões entre deploys.
- Para produção real, recomenda-se adicionar recuperação de senha, verificação de e-mail, rate limiting, logs e 2FA para administradores.


## Integração da API de documentos

O site agora possui uma integração server-side com a API de Documentos.

A chave da API **não fica no navegador**. O frontend chama rotas `/api/docs/*` do próprio EinsteinEditaveis e o servidor encaminha a requisição usando `DOCS_API_KEY`.

Configure no Render:

- `DOCS_API_KEY`: sua chave privada da API.
- `DOCS_API_BASE`: `https://meudocdigital.com/api/public/v1` (padrão).
- `VITE_WHATSAPP_NUMBER`: seu WhatsApp.

### Funcionalidades integradas

- Catálogo de módulos (`GET /modules`)
- Ficha dinâmica de cada módulo (`GET /modules/{codigo}`)
- Versão do catálogo (`GET /catalog/version`)
- Conta/saldo (`GET /account`)
- Uso (`GET /usage`)
- Extrato (`GET /statement`)
- Prévia (`POST /preview`)
- Geração final (`POST /generate`) com `Idempotency-Key`
- Jobs e documentos
- Recarga por Pix e consulta de recargas

O formulário é montado dinamicamente pelos campos devolvidos pela API, em vez de manter uma lista fixa de campos.

### Segurança

Não coloque `DOCS_API_KEY` no código React, em `VITE_*`, no GitHub ou no navegador. A documentação da API exige que a chave fique somente no servidor.
