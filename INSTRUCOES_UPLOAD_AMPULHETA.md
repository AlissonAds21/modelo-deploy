# 📋 Instruções Passo a Passo: Upload do GIF Ampulheta no Supabase

## 🎯 Objetivo
Salvar o arquivo `ampulheta.gif` no Supabase Storage e armazenar a URL no banco de dados Neon PostgreSQL.

---

## 📝 ETAPA 1: Preparar o Arquivo GIF

1. **Localize o arquivo `ampulheta.gif`**
   - Se você já tem o arquivo, certifique-se de que está acessível
   - Se não tem, você pode:
     - Baixar um GIF de ampulheta da internet
     - Criar um GIF animado
     - Usar qualquer GIF de ampulheta (tamanho recomendado: 18x18px ou similar)

2. **Verifique o tamanho do arquivo**
   - Recomendado: máximo 500KB para carregamento rápido
   - Nome do arquivo: `ampulheta.gif` (ou renomeie para este nome)

---

## 📝 ETAPA 2: Acessar o Supabase Dashboard

1. **Acesse o Supabase**
   - Vá para: https://supabase.com/dashboard
   - Faça login na sua conta

2. **Selecione seu projeto**
   - Clique no projeto que você está usando (o mesmo do cadastro de usuários)

---

## 📝 ETAPA 3: Criar/Verificar o Bucket "uploads"

1. **Navegue até Storage**
   - No menu lateral esquerdo, clique em **"Storage"**

2. **Verifique se o bucket "uploads" existe**
   - Se já existe (usado para fotos de perfil), pule para a ETAPA 4
   - Se não existe, crie:
     - Clique em **"New bucket"**
     - Nome: `uploads`
     - Marque **"Public bucket"** (importante para acesso público)
     - Clique em **"Create bucket"**

3. **Verifique as políticas do bucket**
   - Clique no bucket `uploads`
   - Vá na aba **"Policies"**
   - Certifique-se de que há uma política de leitura pública:
     - Se não houver, clique em **"New Policy"**
     - Selecione **"For full customization"**
     - Nome: `Public Read Access`
     - Definição:
       ```sql
       CREATE POLICY "Public Access" ON storage.objects
       FOR SELECT USING (bucket_id = 'uploads');
       ```
     - Clique em **"Review"** e depois **"Save policy"**

---

## 📝 ETAPA 4: Fazer Upload do GIF

1. **Acesse o bucket "uploads"**
   - Clique no bucket `uploads` na lista

2. **Faça upload do arquivo**
   - Clique no botão **"Upload file"** ou arraste o arquivo `ampulheta.gif`
   - Selecione o arquivo `ampulheta.gif`
   - Aguarde o upload completar

3. **Copie a URL pública do arquivo**
   - Após o upload, clique no arquivo `ampulheta.gif`
   - Você verá informações do arquivo
   - **Copie a URL pública** (será algo como):
     ```
     https://[seu-projeto].supabase.co/storage/v1/object/public/uploads/ampulheta.gif
     ```
   - **IMPORTANTE:** Guarde esta URL, você precisará dela na próxima etapa

---

## 📝 ETAPA 5: Inserir a URL no Banco de Dados Neon

1. **Acesse o Neon Tech**
   - Vá para: https://console.neon.tech
   - Faça login e selecione seu projeto

2. **Abra o SQL Editor**
   - Clique em **"SQL Editor"** no menu lateral

3. **Execute o script de criação da tabela** (se ainda não executou)
   - Abra o arquivo `CRIAR_TABELA_IMAGENS_GERAL.sql`
   - Copie e cole o conteúdo no SQL Editor
   - Clique em **"Run"** para executar

4. **Inserir o registro da ampulheta**
   - No SQL Editor, execute o seguinte comando (substitua `[SUA_URL_AQUI]` pela URL que você copiou):
     ```sql
     INSERT INTO imagens_geral (nome_imagem, url_imagem, tipo_arquivo, descricao, ativo)
     VALUES (
       'ampulheta',
       'https://[seu-projeto].supabase.co/storage/v1/object/public/uploads/ampulheta.gif',
       'gif',
       'GIF animado de ampulheta para indicar status de login',
       TRUE
     )
     ON CONFLICT (nome_imagem) DO UPDATE
     SET url_imagem = EXCLUDED.url_imagem,
         tipo_arquivo = EXCLUDED.tipo_arquivo,
         data_upload = NOW();
     ```

5. **Verificar se foi inserido corretamente**
   - Execute:
     ```sql
     SELECT * FROM imagens_geral WHERE nome_imagem = 'ampulheta';
     ```
   - Você deve ver o registro com a URL do Supabase

---

## 📝 ETAPA 6: Testar o Acesso

1. **Teste a URL diretamente no navegador**
   - Cole a URL que você copiou do Supabase em uma nova aba
   - O GIF deve aparecer/carregar

2. **Se não carregar:**
   - Verifique se o bucket está público
   - Verifique se a política de acesso público está ativa
   - Verifique se a URL está correta

---

## ✅ Próximos Passos

Após completar estas etapas, o código JavaScript será atualizado para buscar a imagem do banco de dados automaticamente.

**Importante:**
- Mantenha a URL do Supabase segura
- Se precisar trocar a imagem, basta fazer upload de um novo arquivo com o mesmo nome no Supabase
- Ou atualize a URL no banco de dados

---

## 🔧 Troubleshooting

### Erro: "Bucket não encontrado"
- Certifique-se de que o bucket `uploads` existe
- Verifique se está no projeto correto

### Erro: "Access Denied" ao acessar a URL
- Verifique se o bucket está marcado como público
- Verifique se a política de acesso público está ativa

### Erro: "Arquivo não encontrado"
- Verifique se o upload foi concluído com sucesso
- Verifique se o nome do arquivo está correto
- Verifique se a URL está completa

