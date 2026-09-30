# Gabarito Óptico — código-fonte

## Versão atual: planilha de alunos e folhas em branco

Importe uma planilha XLSX ou CSV com os cabeçalhos ESCOLA, SÉRIE, TURMA e NOME. A ordem pode variar; acentos e caixa nos cabeçalhos são normalizados. Todos os quatro campos devem ser preenchidos. A importação aponta as linhas inválidas e preserva os dados anteriores caso haja erro. São aceitos até 500 alunos e arquivos de até 10 MB. Para Excel antigo (.xls), salve em .xlsx. Há seletor de aba para arquivos com várias abas.

O PDF traz uma página por aluno, com escola, série, turma e nome. As folhas ficam em branco por padrão. Selecione o aluno em **Folha exibida** e abra **Preencher esta folha no aplicativo (teste)** para marcar alternativas. Também é possível clicar nas bolinhas da prévia. O preenchimento é individual: os demais alunos continuam em branco. Baixe a folha exibida ou o PDF de todos.

A leitura pela câmera ou arquivo continua disponível sem importação obrigatória. Ela mostra A/B/C/D por questão, sem corrigir ou calcular nota. O QR inclui apenas o modelo, a quantidade de questões e um identificador derivado do aluno, nunca as respostas. Quando a mesma planilha está importada no dispositivo, o resultado exibe o nome correspondente. Sem a planilha, ainda lê as alternativas normalmente. Alunos e marcações ficam apenas na memória da sessão e desaparecem ao recarregar.

## Onde está o código

- `app-src.js`: lógica principal, importação, preenchimento e geração dos PDFs.
- `roster.js`: validação de alunos e leitura CSV.
- `sheet.js`: desenho da folha-resposta.
- `reader.js` e `engine.js`: leitura óptica sem IA.
- `camera.js`: câmera do celular e guia de enquadramento.
- `dist/index.html`: interface HTML.
- `dist/style.css`: aparência e responsividade.
- `dist/app.js`: JavaScript compilado. Edite os arquivos fonte acima e execute o build.

## Executar e modificar

A pasta `dist` está pronta para hospedagem estática. Para testar localmente:

```bash
python -m http.server 8080 --directory dist
```

Abra http://localhost:8080. Para recompilar após alterações, com Node.js 20.19+ ou 22+:

```bash
npm ci
npm run build
```

A câmera ao vivo exige HTTPS (ou localhost) e permissão do navegador. Não abra o HTML por duplo clique. O botão **Câmera externa (sem guia)** abre a interface do aparelho e não exibe os quatro alvos do aplicativo.

## Testes

```bash
npm test
node test-camera.mjs
node test-roster.mjs
```

Validados: importação XLSX/CSV, cabeçalhos, campos ausentes, IDs reproduzíveis, folhas em branco, preenchimento individual, QR sem respostas, leitura por pixels, perspectiva e captura simulada. PDFs renderizados e inspecionados visualmente. A câmera física e a interface completa ainda precisam de validação no dispositivo real. Os testes usam a dependência opcional `@napi-rs/canvas`; se ausente, instale com `npm install --no-save @napi-rs/canvas`.

Bibliotecas: jsPDF, PDF.js, qrcode, jsQR, read-excel-file e esbuild. Consulte THIRD_PARTY_LICENSES.txt. Não há API de IA nem envio de imagens ou alunos para servidor.
