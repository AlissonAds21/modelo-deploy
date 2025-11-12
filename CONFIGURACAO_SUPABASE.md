# 📋 Configuração do Supabase para Fotos de Perfil

## ✅ Passo a Passo para Configurar o Supabase

### 1. Acessar o Painel do Supabase

1. Acesse: https://app.supabase.com/
2. Faça login com sua conta
3. Selecione seu projeto (ex: "AlissonAds21's Project")

### 2. Verificar/Criar o Bucket "uploads"

1. No menu lateral esquerdo, clique em **"Storage"** (ícone de pasta)
2. Você verá uma lista de buckets
3. Verifique se existe o bucket **"uploads"**
   - Se **NÃO existir**, crie um novo:
     - Clique em **"New bucket"**
     - Nome: `uploads`
     - Marque **"Public bucket"** (IMPORTANTE!)
     - Clique em **"Create bucket"**

### 3. Configurar Políticas de Acesso Público

1. Clique no bucket **"uploads"**
2. No canto superior direito, clique em **"Policies"** (ou "Políticas")
3. Verifique se existe uma política que permite leitura pública
4. Se **NÃO existir**, crie uma nova política:

   **Passo a passo para criar a política:**
   
   a. Clique em **"New Policy"**
   
   b. Escolha **"Create a policy from scratch"**
   
   c. Preencha os campos:
      - **Policy name:** `Allow public read access`
      - **Allowed operation:** Selecione **"SELECT"** (leitura)
      - **Target roles:** Marque **"anon"** (usuários não autenticados)
      - **Policy definition:** Use esta expressão SQL:
        ```sql
        (bucket_id = 'uploads'::text)
        ```
      - Ou deixe em branco para permitir acesso a todos os arquivos
   
   d. Clique em **"Review"** e depois **"Save policy"**

### 4. Verificar URL Base do Projeto

1. No menu lateral, clique em **"Settings"** (Configurações)
2. Clique em **"API"**
3. Anote o **"Project URL"** (algo como: `https://afszgngtfbdodwznanuo.supabase.co`)
4. O URL base para acessar arquivos públicos será:
   ```
   https://[SEU_PROJECT_REF].supabase.co/storage/v1/object/public/uploads/
   ```

### 5. Testar Acesso Público

1. Volte para **"Storage"** > **"Files"** > **"uploads"**
2. Clique em um arquivo de imagem
3. Copie a **"URL"** que aparece
4. Cole a URL em uma nova aba do navegador
5. Se a imagem abrir, está configurado corretamente! ✅

### 6. Verificar Variáveis de Ambiente

No seu arquivo `.env`, certifique-se de ter:

```env
SUPABASE_URL=https://afszgngtfbdodwznanuo.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

**Onde encontrar a chave anon:**
1. No Supabase, vá em **"Settings"** > **"API"**
2. Copie a **"anon public"** key
3. Cole no arquivo `.env`

## ✅ Checklist de Verificação

- [ ] Bucket "uploads" existe e está marcado como **"Public"**
- [ ] Política de leitura pública está configurada para o role "anon"
- [ ] Testei acessar uma imagem diretamente pela URL e funcionou
- [ ] Variáveis de ambiente estão configuradas corretamente
- [ ] O código do servidor está salvando a URL completa no banco

## 🔧 Solução de Problemas

### Problema: Imagem não aparece
**Solução:**
1. Verifique se o bucket está marcado como "Public"
2. Verifique se a política de leitura está ativa
3. Verifique se a URL no banco está completa (começa com `https://`)
4. Abra o console do navegador (F12) e veja se há erros de CORS

### Problema: Erro 403 (Forbidden)
**Solução:**
- A política de acesso não está configurada corretamente
- Verifique se a política permite "SELECT" para "anon"

### Problema: Erro 404 (Not Found)
**Solução:**
- O arquivo não existe no bucket
- Verifique se o nome do arquivo no banco está correto
- Verifique se o arquivo foi realmente enviado para o Supabase

## 📝 Notas Importantes

- O bucket **DEVE** estar marcado como **"Public"** para que as imagens sejam acessíveis
- A política **DEVE** permitir leitura (`SELECT`) para usuários anônimos (`anon`)
- A URL salva no banco deve ser a URL completa do Supabase, não apenas o nome do arquivo


