# Acesso por senha simples

A administração abre diretamente com **SME26**. Não usa e-mail, Firebase Authentication, conta master no Firebase, claims nem bootstrap.

O administrador cadastra o nome e a senha da escola. Para entrar, o usuário seleciona a escola e informa essa senha. As senhas escolares são armazenadas como derivação PBKDF2 com salt, nunca em texto aberto. A sessão fica somente na memória: ao recarregar, é preciso entrar novamente.

## Banco

Projeto `gen-lang-client-0646380614`, banco nomeado **leitoroptico**, caminho `leitoroptico/main/schools/{id}`. Cadastros e leituras continuam em subcoleções por escola.

Se aparecer “O banco recusou a operação”, abra o console Firebase, selecione o banco **leitoroptico** e aplique o bloco deste aplicativo em `firestore.rules`. Se houver outros aplicativos no mesmo banco, preserve as regras deles: não substitua todos os caminhos por uma liberação global.

As regras desta versão não exigem Authentication. Permitem ler e gravar documentos válidos no caminho deste aplicativo. A senha é uma barreira de interface, conforme solicitado, e **não impede acesso direto ao banco fora da tela**. A separação das escolas organiza os dados, mas não é uma autorização no servidor. A derivação das senhas não altera essa limitação.

Não é necessário habilitar E-mail/senha ou executar scripts administrativos. Não foi possível publicar regras no Firebase sem credenciais de administração; o arquivo pronto acompanha esta entrega. Regras anteriormente publicadas que exigem Authentication precisam ser substituídas somente no bloco deste aplicativo.
