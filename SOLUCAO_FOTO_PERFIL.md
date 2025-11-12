# 🔧 Solução para Foto de Perfil

## ✅ Correções Realizadas

### 1. **Erro de Login Corrigido**
- O código agora tenta acessar a coluna com aspas duplas (`"fotoPerfil"`) primeiro
- Se falhar, tenta sem aspas (`fotoperfil` - minúsculo)
- Isso resolve o erro: `column "fotoPerfil" does not exist`

### 2. **Exibição da Foto Corrigida**
- O frontend agora verifica se a URL está completa
- Se a URL não começar com `http`, constrói a URL completa do Supabase
- Adicionado fallback para avatar gerado se a foto não carregar

## 📋 Passos para Resolver o Problema

### Passo 1: Verificar o Nome da Coluna no Banco

Execute no Neon Tech SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'cadastro_usuario' 
AND column_name LIKE '%foto%';
```

**Resultado esperado:**
- Se mostrar `fotoperfil` (minúsculo) → A coluna está em minúsculo
- Se mostrar `fotoPerfil` (com case) → A coluna está com case preservado

### Passo 2: Renomear a Coluna (SE NECESSÁRIO)

**Se a coluna estiver como `fotoperfil` (minúsculo)**, execute:

```sql
ALTER TABLE cadastro_usuario RENAME COLUMN fotoperfil TO "fotoPerfil";
```

**OU**, se preferir manter minúsculo, não precisa fazer nada - o código já funciona com ambos.

### Passo 3: Verificar URLs no Banco

Execute para ver as URLs salvas:

```sql
SELECT id, nome, email, "fotoPerfil" as fotoperfil 
FROM cadastro_usuario 
WHERE "fotoPerfil" IS NOT NULL;
```

**Verifique:**
- As URLs devem começar com `https://`
- Devem apontar para o Supabase: `https://afszgngtfbdodwznanuo.supabase.co/storage/...`

### Passo 4: Testar o Login

1. Faça logout (se estiver logado)
2. Faça login novamente
3. Abra o Console do navegador (F12)
4. Verifique os logs:
   - `👤 Usuário logado: [nome]`
   - `📸 URL da foto: [url]`
   - `✅ Usando foto do Supabase: [url]`

### Passo 5: Verificar se a Imagem Carrega

1. Após fazer login, verifique se a foto aparece no header
2. Se não aparecer, verifique no console:
   - Se há erros de CORS
   - Se a URL está correta
   - Se há erro 403 (Forbidden) ou 404 (Not Found)

## 🔍 Debug

### Se a foto não aparecer:

1. **Abra o Console do navegador (F12)**
2. **Verifique os logs:**
   ```
   👤 Usuário logado: [nome]
   📸 URL da foto (fotoPerfil): [url ou null]
   📸 URL final: [url]
   ```

3. **Se a URL estiver `null` ou vazia:**
   - Verifique se a foto foi salva no banco
   - Execute: `SELECT "fotoPerfil" FROM cadastro_usuario WHERE email = 'seu@email.com';`

4. **Se a URL estiver incompleta (não começa com http):**
   - O código já constrói automaticamente
   - Verifique se o URL base do Supabase está correto no código

5. **Se a URL estiver completa mas não carrega:**
   - Verifique se o bucket do Supabase está público
   - Verifique se a política de acesso está configurada
   - Teste a URL diretamente no navegador

## ✅ Checklist Final

- [ ] Coluna no banco está com o nome correto
- [ ] URLs no banco começam com `https://`
- [ ] Bucket do Supabase está marcado como "Public"
- [ ] Política de leitura pública está configurada
- [ ] Login funciona sem erros
- [ ] Console mostra a URL da foto
- [ ] Foto aparece no header após login

## 🆘 Se ainda não funcionar

1. Verifique o console do servidor (terminal onde roda `npm start`)
2. Procure por: `📸 Foto de perfil do banco:`
3. Verifique se a URL está sendo retornada
4. Se a URL estiver `null`, o problema é no cadastro
5. Se a URL estiver presente, o problema pode ser no Supabase (políticas de acesso)

