# Validação da versão GO4

Testes sintéticos executados no ambiente de desenvolvimento. Não são uma taxa de acerto medida com celulares reais.

| Cenário | Resultado | Questões | Tempo | Alinhamento |
|---|---|---:|---:|---|
| Moldura sozinha: quatro quadrados apagados | PASS | 40 | 712 ms | frame |
| Perspectiva 1, sem quadrados | PASS | 40 | 664 ms | frame |
| Perspectiva 2, sem quadrados | PASS | 40 | 690 ms | frame |
| Perspectiva 3, sem quadrados | PASS | 40 | 663 ms | frame |
| Rotação 23°, sem quadrados | PASS | 40 | 841 ms | frame |
| Rotação 90°, sem quadrados | PASS | 40 | 831 ms | frame |
| Rotação 180°, sem quadrados | PASS | 40 | 833 ms | frame |
| Rotação 270°, sem quadrados | PASS | 40 | 861 ms | frame |
| Sombra e ruído | PASS | 40 | 636 ms | frame |
| JPEG 50% | PASS | 40 | 670 ms | frame |
| Foto de 840px | PASS | 40 | 633 ms | frame |
| Compatibilidade GO3 | PASS | 40 | 648 ms | markers |

Também passaram:

- PDF renderizado em PNG: 40 respostas em branco e 40 respostas ABCD, com detecção pela moldura.
- Ausência de QR, moldura cortada e desfoque forte não autorizam leitura/captura silenciosa.
- Captura automática com estabilidade; movimento reinicia a espera.
- Câmera simulada: captura manual/automática, cancelamento, permissão tardia e negada, câmera externa e encerramento das trilhas.
- Worker compilado: localização ao vivo, leitura e transferência dos pixels.
- Cadastro manual, importação XLSX/CSV, identificação do aluno e preenchimento individual.
- Verificação de branco, múltipla, marca clara e impressão ausente.

O recorte funciona com a moldura GO4 inteira, mesmo sem os quatro quadrados externos. Folhas antigas usam os quadrados. O contorno móvel é uma estimativa; o QR e a impressão das bolinhas são confirmados durante a leitura final. O controle de foco depende do navegador/aparelho. Fotos pequenas, desfocadas, com reflexo, moldura cortada, curvatura, dobras ou tinta fraca podem ser recusadas ou exigir conferência. Não foi realizado um ensaio físico com celulares, impressoras e marcações de alunos.

Atualização do scanner: passaram os testes de bloqueio da captura sem QR, confirmação de QR com identificação em prévia de 960 px e reinício do tempo de estabilidade durante movimento acumulado. São testes sintéticos, não medições de acerto com câmeras reais.

## Acesso escolar e Firebase

- Passou: regras no emulador Firestore, criação exclusiva pelo master, diretório público e bloqueio de leitura/escrita cruzada entre escolas.
- Passou: fluxo DOM de entrada, cadastro com disciplina, saída limpando dados e área master, com backend simulado.
- Passou: XLSX/CSV com cinco campos e leitura OMR das folhas geradas.
- A inspeção visual em navegador não foi concluída: o download do navegador de testes falhou. O CSS recebeu regras responsivas para 640px e controles de toque.
- Confirmado: banco nomeado leitoroptico existente, HTTP 200 na consulta do diretório. Não foram aplicadas regras nem ativado o master no projeto real por ausência de credenciais administrativas.

## Revisão: senha simples (pedido do proprietário)

Esta revisão substitui o modelo autenticado descrito acima. Não usa Firebase Auth nem claims. A senha master é conferida no aplicativo; senhas escolares usam PBKDF2 com salt. A separação por escola é da interface e dos caminhos de dados, não de autorização do servidor. Os testes anteriores de bloqueio entre escolas deixam de descrever esta versão.

## Exportação XLSX

Passou o teste de gravação e reabertura de um XLSX: células separadas, nomes completos com acentos e ponto e vírgula, texto iniciado por = mantido como texto, leitura mais recente por aluno, aluno sem leitura, 122 leituras preservadas, identificação desconhecida e até 60 colunas de questões para folhas antigas. O fluxo DOM também passou.
