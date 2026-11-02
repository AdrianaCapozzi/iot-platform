### Exportação de dados ambientais para CSV

Foi desenvolvido um script auxiliar em Python para converter os dados disponibilizados pelo endpoint `/api/cities` em arquivos CSV estruturados.

A solução realiza a leitura do JSON retornado pela API, extrai informações cadastrais e geográficas das cidades, variáveis ambientais, componentes e pontuações do índice ICAU-D, além dos dados individuais dos sensores associados a cada localidade.

O processo gera dois arquivos independentes: `cidades.csv`, com estrutura tabular de uma linha por cidade, e `sensores.csv`, com uma linha por sensor. Essa organização facilita a exploração dos dados em ferramentas de análise, como Excel e Power BI, e permite desenvolver análises complementares sobre indicadores ambientais e disponibilidade de sensores.

O script também permite filtrar os registros brasileiros e realizar a coleta diretamente do endpoint da aplicação.