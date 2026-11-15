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
- **Estatísticas:** horas por semana com meta, constância das últimas 20 semanas, sequência de dias de estudo, acerto por mês e tempo por disciplina.
- **Meus planos:** use um modelo pronto, faça a sua versão dele (com ou sem o progresso) ou crie um plano novo colando o conteúdo programático do edital. Planos podem ser editados, exportados e importados em `.json`.
- **Cronômetro e anotações:** cronômetro livre ou pomodoro por sessão, que registra o tempo estudado; anotações e resumo em cada sessão.
- **Ajustes:** plano ativo, data de início, ritmo de 1 a 4 sessões por dia, meta semanal, feriados nacionais, férias e outros dias sem estudo, importar o progresso da planilha `.xlsm`, backup `.json` e sincronização.

## Criar um plano para um concurso novo

1. Em **Meus planos › Criar plano**, dê um nome e escolha a banca.
2. Copie o conteúdo programático do edital e cole em **Colar conteúdo do edital**. Funciona com o formato corrido dos editais (`LÍNGUA PORTUGUESA: 1 Compreensão de textos. 2 Ortografia.`) e com listas (`- tópico`, `1. tópico`).
3. Dê um peso de 1 a 5 a cada disciplina: o peso define quantas sessões de questões ela recebe.
4. Confira a prévia (sessões, horas e data de término) e salve.

Ao editar um plano depois, os tópicos que continuam com o mesmo texto mantêm o código e o progresso. Os planos criados vão para o Drive junto com o progresso.

Se você ficar para trás, **Replanejar a partir de hoje** (na tela Início) move o calendário para a próxima sessão cair hoje, sem perder nada do que já foi feito.

Os cálculos são os mesmos das planilhas: data prevista em dias úteis pelo ritmo, revisões, fases, Bússola e TAF. Os testes comparam o resultado do app com os valores que o Excel calculou.

## Arquivos

| Arquivo | Conteúdo |
|---|---|
| `index.html` | O app inteiro (telas, cálculos, importação da planilha e sincronização). |
| `planos.js` | Os modelos prontos: disciplinas, aulas, sessões, temas e textos. Gerado pelo mesmo gerador das planilhas, então os códigos das sessões (PN01, CF01…) coincidem. Não edite à mão: para um plano novo, use Meus planos no app. |
| `sw.js` | Service worker: abre sem internet e pega a versão nova na abertura seguinte. |
| `manifest.json`, `icon-*.png` | Instalação como app. |
| `testes/` | Testes automatizados (veja `testes/README.md`). |

O app guarda só títulos e caminhos das aulas. Os PDFs ficam no seu computador e nunca vão para o repositório.

## Sincronização entre aparelhos

Em **Ajustes**, informe o Client ID do Google Cloud e uma senha. Dá para usar o mesmo Client ID do Controle Financeiro, desde que `https://playerbuster.github.io/Estudos/` esteja cadastrado nele como origem JavaScript autorizada e como URI de redirecionamento. Os dados vão cifrados (AES-GCM) para a pasta privada do app no Drive.
