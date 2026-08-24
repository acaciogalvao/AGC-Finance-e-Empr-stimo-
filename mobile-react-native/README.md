# 📱 Guia de Atualização do APK Android - AGC Finance & Copiloto

Este diretório (`/mobile-react-native`) contém o código-fonte do aplicativo nativo compilável em `.apk` com o novo **Copiloto Inteligente** e permissões de **Acessibilidade Android**.

---

## ⚡ Como Gerar o Novo APK Atualizado (Passo a Passo)

### 1️⃣ Se você estiver usando o EAS Build (Recomendado - Compilação na Nuvem):

Abra o terminal na pasta do projeto no seu computador:

```bash
# 1. Entre na pasta do app mobile
cd mobile-react-native

# 2. Instale as dependências caso ainda não tenha feito
npm install

# 3. Atualize o pacote offline embutido
npm run bundle

# 4. Inicie a compilação do APK no EAS
eas build -p android --profile preview
```

> 💡 **Nota**: O EAS Build do Expo compilará o instalador `.apk` diretamente nos servidores do Expo e gerará um link e QR Code para baixar o arquivo `.apk` no seu celular Android.

---

### 2️⃣ Se você for exportar/baixar o ZIP do projeto:
1. No menu superior direito do Google AI Studio, clique em **Export** ➔ **Download ZIP**.
2. Descompacte o arquivo no seu computador.
3. Abra a pasta `mobile-react-native` no terminal.
4. Execute `npm run bundle` e depois `npx eas build -p android --profile preview`.

---

## 🛡️ Ativação das Permissões no Primeiro Uso do APK:
Assim que instalar o novo `.apk` no seu celular:
1. Abra o **AGC Finance** e vá na aba **Copiloto**.
2. Clique na sub-aba **"Permissões Android & Acessibilidade"**.
3. Ative os 3 itens:
   - **Serviço de Acessibilidade (AGC Finance Copiloto)**: Permite a leitura das chamadas de Uber/99.
   - **Sobreposição de Tela (Aparecer no Topo)**: Permite mostrar o HUD flutuante com cálculo de R$/km.
   - **Sem Restrição de Bateria**: Impede que o Android encerre o copiloto em segundo plano.

