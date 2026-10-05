# EinsteinEditaveis — Deploy no Render

## Build Command
npm install && npm run build

## Start Command
npm start

## Banco
O serviço espera a variável `DATABASE_URL`. No Render, conecte-a ao PostgreSQL criado para o projeto.

## Importante
Não envie `.env`, `node_modules` ou `dist` para o GitHub. O `dist` é criado automaticamente pelo `npm run build`.

## Variáveis necessárias
- DATABASE_URL
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD
- VITE_WHATSAPP_NUMBER
- DOCS_API_KEY
- DOCS_API_BASE
