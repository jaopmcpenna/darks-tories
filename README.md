# Dark Stories

AI dark stories narrator so you can play it alone or with your friends

## Estrutura do Projeto

O projeto está dividido em frontend e backend:

- **Frontend**: Aplicação Vue 3 + TypeScript + Vite
- **Backend**: Firebase Cloud Functions com Express (APIs REST)

## Pré-requisitos

- Node.js 18 ou superior
- npm ou yarn
- Firebase CLI (`npm install -g firebase-tools`)
- Conta Firebase configurada

## Configuração Inicial

### 1. Instalar dependências

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend/functions
npm install
```

### 2. Configurar variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local` na raiz do projeto e configure as variáveis:

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:
- `VITE_API_BASE_URL`: URL base das Cloud Functions (em desenvolvimento: `http://localhost:5001/darks-tories/us-central1/api`)
- `VITE_FIREBASE_API_KEY`: Chave API do Firebase
- `VITE_FIREBASE_PROJECT_ID`: ID do projeto Firebase

### 3. Configurar Firebase

```bash
# Login no Firebase
firebase login

# Inicializar projeto (se ainda não foi feito)
firebase init functions

# Configurar variáveis de ambiente do backend
firebase functions:config:set vercel.ai_key="sua-chave-vercel-ai"
```

## Desenvolvimento

### Frontend

```bash
cd frontend
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

### Backend (Cloud Functions)

```bash
cd backend/functions
npm run serve
```

As functions estarão disponíveis em `http://localhost:5001`

Para testar localmente, certifique-se de que o Firebase Emulator está rodando.

## Scripts Disponíveis

### Frontend

- `npm run dev` - Inicia servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

### Backend

- `npm run build` - Compila TypeScript
- `npm run serve` - Inicia emulador local
- `npm run deploy` - Faz deploy das functions
- `npm run logs` - Visualiza logs das functions

## Estrutura de Pastas

```
darks-tories/
├── frontend/              # Aplicação Vue 3
│   ├── src/
│   │   ├── components/    # Componentes Vue
│   │   ├── views/         # Páginas/Vistas
│   │   ├── stores/        # Stores Pinia
│   │   ├── services/      # Serviços (API client)
│   │   ├── types/         # Tipos TypeScript
│   │   └── utils/         # Utilitários
│   └── package.json
│
├── backend/               # Firebase Cloud Functions
│   ├── functions/
│   │   ├── src/
│   │   │   ├── routes/    # Rotas/Endpoints
│   │   │   ├── services/  # Lógica de negócio
│   │   │   ├── utils/     # Utilitários
│   │   │   └── types/     # Tipos TypeScript
│   │   └── package.json
│   └── firebase.json
│
└── README.md
```

## Próximos Passos

1. Configurar projeto Firebase e obter credenciais
2. Configurar variáveis de ambiente
3. Criar primeiro endpoint no backend
4. Criar serviço correspondente no frontend
5. Implementar estrutura inicial do Agent narrador
