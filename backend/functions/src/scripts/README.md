# Scripts de Seed

## Seed de Histórias

O script `seedStories.ts` adiciona histórias iniciais ao Firestore.

### Como usar:

1. **Com o emulador do Firestore rodando localmente:**
   ```bash
   cd backend/functions
   npm run seed
   ```

2. **Para produção (após deploy):**
   - Execute o script após garantir que o Firebase Admin está configurado corretamente
   - Ou use o Firebase Console para adicionar histórias manualmente

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

