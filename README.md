# Versão ESCOLAS V11 — entrega com index.html na raiz

Este pacote corresponde ao commit publicado 760f718a27d3731bcf72fd17615b6d4a68f51f1f. Os arquivos index.html, index.js e index.css ficam na raiz e já estão compilados.

## Publicar

- Netlify manual: envie esta pasta completa.
- Netlify conectado ao GitHub: comando npm run build, diretório de publicação `.` (um ponto), base vazia e Node 22. O netlify.toml já configura isso.
- GitHub Pages: branch main, pasta /(root). Os arquivos prontos dispensam build para essa modalidade.
- Use repositório/pasta novos ou substitua os arquivos antigos: não mantenha um index antigo na raiz.

## Desenvolvimento

Execute npm ci e npm run build. A compilação atualiza os arquivos na raiz. Consulte LEIA-ME.txt e ATIVAR-FIREBASE.md para acesso e banco.
