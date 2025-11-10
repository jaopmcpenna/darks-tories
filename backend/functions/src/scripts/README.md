# Scripts de Seed

## Seed de Histórias

O script `seedStories.ts` adiciona histórias iniciais ao Firestore.

### Como usar:

1. **Com o emulador do Firestore rodando localmente:**
   ```bash
   cd backend/functions
   npm run seed
   ```

2. **Para produção (banco de dados real):**
   
   **Opção A: Usando o script automático (Recomendado)**
   ```bash
   # Na raiz do projeto
   ./seed-prod.sh
   
   # Com modo force (substitui histórias existentes)
   ./seed-prod.sh --force
   ```
   
   **Opção B: Manualmente**
   ```bash
   cd backend/functions
   npm run seed:prod
   
   # Com modo force
   npm run seed:prod:force
   ```
   
   **Importante:** 
   - Certifique-se de estar logado no Firebase: `firebase login`
   - O script detecta automaticamente se está usando emulador ou produção
   - Se `FIRESTORE_EMULATOR_HOST` não estiver definido, usa produção

### Estrutura esperada no Firestore:

Coleção: `stories`

Documento:
```json
{
  "title": "string",
  "description": "string",
  "solution": "string",
  "difficulty": "easy" | "medium" | "hard",
  "category": "string",
  "tags": ["string"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Notas:

- O script verifica se uma história com o mesmo título já existe antes de adicionar
- Histórias duplicadas serão ignoradas
- Certifique-se de que o Firebase Admin está inicializado corretamente

