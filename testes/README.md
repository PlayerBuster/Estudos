# Testes do Plano de Estudos

```bash
bash testes/rodar_testes.sh
```

O script roda os arquivos `.test.js` abaixo e termina com "TODOS OS TESTES PASSARAM" ou "HÁ TESTES FALHANDO".

Para rodar só um arquivo: `node --test --test-reporter=spec testes/calculos.test.js`.

## Requisitos
- Node 18 ou mais novo.
- Na pasta do projeto: `npm install --no-save playwright@1.49.1 xlsx@0.18.5` e depois `npx playwright install chromium`. O `xlsx` é o leitor de planilhas que o app baixa da internet; no teste ele vem desta cópia.

## O que é testado
O app é aberto num Chromium sem janela, com armazenamento limpo e a data fixada (`window.HOJE`). Os testes usam as funções do próprio app, sem copiar código.

| Arquivo | Conteúdo |
|---|---|
| `calculos.test.js` | Datas previstas, fim da teoria, fases e folga de todos os planos, comparadas com os valores que o Excel calculou nas planilhas. Ritmo 3, início no meio da semana, revisões e situação de cada sessão, Bússola de carreira (mesmo cenário testado na planilha), TAF e acerto por disciplina. |
| `telas.test.js` | Todas as abas de todos os planos abrem sem erro, no computador e no celular (375px, sem rolagem lateral). Detalhe da sessão, menu em gaveta no celular e temas claro e escuro. |
| `fluxo.test.js` | Uso pela interface: concluir e desfazer, cartão do Planejamento, navegar entre semanas, abas de Revisões e "Revisar agora", Cronograma com filtro e busca, Questões (validação, registro, apagar), Discursiva, Bússola, TAF, troca de plano, ritmo, data de início e backup `.json`. |
| `importar.test.js` | Importar o progresso das planilhas de `testes/dados` (Núcleo 2027 e TRT): sessões, revisões, ritmo, questões, textos, Bússola e sábados. Não mexe nos outros planos, pode ser desfeito e recusa arquivos que não são planilhas de plano. |
| `sync.test.js` | Dois aparelhos e um Drive falso em memória: arquivo cifrado, todo o progresso chega ao outro aparelho, alterações diferentes são combinadas, senha errada não altera nada, sem internet tenta de novo. |
| `sw.test.js` | Um servidor local imita o GitHub Pages (cache de 10 minutos): o app instalado abre sem internet e recebe a versão nova na abertura seguinte. |
| `lib.js` | Base comum: abre o app e avalia expressões na página. |

As planilhas de `testes/dados` têm só progresso fictício. Não coloque planilhas reais nesta pasta.
