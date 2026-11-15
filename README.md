# Plano de Estudos

App de estudo para concursos, feito a partir das planilhas de planejamento (Núcleo Duro 2027, PC-PE Agente e Delegado, PM-PE Soldado e Oficial, TRT). Mesmo modelo do [Controle Financeiro](https://github.com/PlayerBuster/Controle): um `index.html` só, que funciona sem internet, instala como app no celular e guarda os dados no aparelho, com sincronização opcional e cifrada pelo Google Drive.

**Abrir:** https://playerbuster.github.io/Estudos/

## O que tem

- **Início:** as próximas sessões da fila, as revisões do dia e o calendário do plano.
- **Planejamento:** a semana em colunas, com um cartão colorido por sessão, o calendário do mês e a distribuição de horas por disciplina.
- **Revisões:** revisões de 24 horas, 7 dias e 30 dias, separadas em Hoje, Atrasadas, Programadas e Concluídas.
- **Cronograma:** todas as sessões por semana, com filtros e a data de conclusão.
- **Disciplinas:** progresso, acerto, aulas da pasta Ceisc e cadernos de questões de cada disciplina.
- **Questões:** registro das baterias, acerto por disciplina e caderno de erros.
- **Discursiva, redação ou peça:** roteiro e temas com data, nota e o que melhorar.
- **Simulados e fases:** sábados, revisão por disciplina e a última semana.
- **Bússola de carreira** (Núcleo 2027) e **TAF** (PM-PE e PC-PE).
- **Ajustes:** trocar de plano, data de início, ritmo, importar o progresso da planilha `.xlsm`, backup `.json` e sincronização.

Os cálculos são os mesmos das planilhas: data prevista em dias úteis pelo ritmo, revisões, fases, Bússola e TAF. Os testes comparam o resultado do app com os valores que o Excel calculou.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | O app inteiro (telas, cálculos, importação da planilha e sincronização). |
| `planos.js` | Os planos: disciplinas, aulas, sessões, temas e textos. Gerado pelo mesmo gerador das planilhas, então os códigos das sessões (PN01, CF01…) coincidem. Não edite à mão. |
| `sw.js` | Service worker: abre sem internet e pega a versão nova na abertura seguinte. |
| `manifest.json`, `icon-*.png` | Instalação como app. |
| `testes/` | Testes automatizados (veja `testes/README.md`). |

O app guarda só títulos e caminhos das aulas. Os PDFs ficam no seu computador e nunca vão para o repositório.

## Sincronização entre aparelhos

Em **Ajustes**, informe o Client ID do Google Cloud e uma senha. Dá para usar o mesmo Client ID do Controle Financeiro, desde que `https://playerbuster.github.io/Estudos/` esteja cadastrado nele como origem JavaScript autorizada e como URI de redirecionamento. Os dados vão cifrados (AES-GCM) para a pasta privada do app no Drive.
