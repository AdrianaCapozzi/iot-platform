### Exportação de dados ambientais para CSV

Foi desenvolvido um script auxiliar em Python para converter os dados disponibilizados pelo endpoint `/api/cities` em arquivos CSV estruturados.

A solução realiza a leitura do JSON retornado pela API, extrai informações cadastrais e geográficas das cidades, variáveis ambientais, componentes e pontuações do índice ICAU-D, além dos dados individuais dos sensores associados a cada localidade.

O processo gera dois arquivos independentes: `cidades.csv`, com estrutura tabular de uma linha por cidade, e `sensores.csv`, com uma linha por sensor. Essa organização facilita a exploração dos dados em ferramentas de análise, como Excel e Power BI, e permite desenvolver análises complementares sobre indicadores ambientais e disponibilidade de sensores.

O script também permite filtrar os registros brasileiros e realizar a coleta diretamente do endpoint da aplicação.

# EcoSense | Extração e Transformação de Dados Ambientais

## 1. Apresentação

Este diretório contém um script desenvolvido em Python para realizar a extração, transformação e estruturação dos dados ambientais disponibilizados pelo projeto EcoSense.

O processo utiliza informações fornecidas pelo endpoint `/api/cities`, convertendo a resposta em formato JSON para arquivos CSV, permitindo sua utilização em ferramentas de análise de dados, como DuckDB, Excel e Power BI.

A implementação representa uma etapa de ETL (*Extract, Transform, Load*), contemplando a extração dos dados da API, a transformação de estruturas hierárquicas em tabelas e a disponibilização dos arquivos para análises posteriores.

## 2. Fonte dos dados

**Endpoint:**

https://iot-platform.viniciusgnandt.com.br/api/cities

A API disponibiliza informações ambientais organizadas por cidade, incluindo:

- Identificação da cidade e país;
- Coordenadas geográficas;
- Quantidade de sensores associados;
- Temperatura;
- Umidade relativa do ar;
- Concentrações de material particulado PM2.5 e PM10;
- Velocidade do vento;
- Pontuação e classificação do ICAU-D;
- Componentes e pesos utilizados no cálculo do índice;
- Fontes das medições e informações de atualização.

## 3. Tecnologias e bibliotecas

| Tecnologia | Aplicação |
|---|---|
| Python | Desenvolvimento da rotina de processamento |
| csv | Criação e escrita dos arquivos CSV |
| json | Leitura e interpretação dos dados JSON |
| sys | Recebimento de argumentos de execução |
| requests | Requisições HTTP para obtenção dos dados da API |
| DuckDB | Consultas SQL sobre os arquivos gerados |
| Power BI | Visualização e análise dos indicadores |

As bibliotecas `csv`, `json` e `sys` pertencem à biblioteca padrão do Python. A biblioteca `requests` é uma dependência externa.

## 4. Estrutura dos arquivos gerados

O script `json_para_csv.py` produz dois arquivos independentes:

### 4.1 cidades.csv

Contém uma linha por cidade, com atributos organizados em colunas.

| Grupo de informações | Exemplos de campos |
|---|---|
| Identificação | id, name, country |
| Localização | lat, lon |
| Sensores | sensor_count |
| Variáveis ambientais | temperature, humidity, pm25, pm10, wind_speed |
| Índice ICAU-D | icaud_score, icaud_class |
| Componentes do índice | cmp_temperature, cmp_humidity, cmp_airQuality, cmp_wind |
| Pesos do índice | w_temperature, w_humidity, w_airQuality, w_wind |
| Fontes dos dados | pm25_sources, temp_sources |
| Atualização | last_seen, updated_at |

### 4.2 sensores.csv

Contém uma linha por sensor associado a uma cidade.

| Campo | Descrição |
|---|---|
| city_id | Identificador da cidade associada |
| sensor_id | Identificador do sensor |
| name | Nome do sensor |
| source | Fonte de origem |
| device_type | Tipo de dispositivo |
| last_seen | Último registro informado |
| provides | Tipos de dados disponibilizados |

A utilização de arquivos separados permite relacionar as informações por meio do campo `city_id`, evitando a repetição dos atributos da cidade em cada registro de sensor.

## 5. Funcionamento do script

O processamento é organizado em etapas.

### 5.1 Importação das bibliotecas

```python
import csv
import json
import sys
```

As bibliotecas são responsáveis pela escrita dos arquivos CSV, interpretação dos dados JSON e leitura dos argumentos fornecidos na execução.

### 5.2 Definição do endpoint

```python
URL = "https://iot-platform.viniciusgnandt.com.br/api/cities"
```

A variável centraliza o endereço da API utilizada como fonte dos dados.

### 5.3 Carregamento dos dados

A função `carregar(argv)` permite duas modalidades de entrada:

- Coleta diretamente do endpoint, utilizando uma requisição HTTP GET;
- Leitura de um arquivo JSON previamente armazenado.

Na coleta direta, a biblioteca `requests` realiza a requisição, verifica a resposta HTTP e converte o conteúdo recebido em uma estrutura Python por meio do método `.json()`.

### 5.4 Tratamento de estruturas aninhadas

A função `g(d, *chaves)` realiza o acesso seguro a atributos distribuídos em objetos internos do JSON.

O tratamento contempla campos ausentes ou com valor nulo, retornando uma string vazia nesses casos.

Essa estratégia reduz falhas durante a transformação e permite trabalhar com registros que não apresentam todos os atributos disponíveis.

### 5.5 Extração dos atributos das cidades

A função principal `main()` acessa a lista de cidades presente na propriedade `data` da resposta da API.

Em seguida, os atributos são organizados em grupos, como:

- `measurements`: medições ambientais;
- `icaud`: informações do índice;
- `classification`: classificação ambiental;
- `components`: componentes do índice;
- `weights`: pesos utilizados;
- `measurementSources`: informações sobre a origem das medições.

O código percorre os registros e extrai os atributos selecionados para preencher as colunas do arquivo `cidades.csv`.

### 5.6 Transformação dos dados

O JSON possui estruturas hierárquicas, nas quais determinadas informações estão distribuídas em objetos internos.

O script reorganiza esses atributos em colunas, realizando o chamado achatamento da estrutura JSON (*JSON flattening*).

Com isso, informações como temperatura, umidade, localização e pontuação do ICAU-D passam a integrar um único registro por cidade.

### 5.7 Extração dos sensores

Um segundo processo percorre a lista de sensores de cada cidade.

São extraídos os identificadores, nomes, fontes, tipos de dispositivos, datas de atualização e informações fornecidas por cada sensor.

Os registros são gravados separadamente em `sensores.csv`.

### 5.8 Exportação dos arquivos

A escrita dos arquivos utiliza a biblioteca `csv` e a codificação `utf-8-sig`, favorecendo a compatibilidade com o Excel e o reconhecimento de caracteres acentuados.

Ao final, o terminal apresenta a quantidade de cidades processadas e confirma a geração dos arquivos.

## 6. Como executar

### Requisitos

- Python 3.8 ou superior;
- Biblioteca `requests`, para coleta diretamente da API.

Instalação da dependência:

```bash
pip install requests
```

### 6.1 Coleta diretamente da API

```bash
python json_para_csv.py --baixar
```

### 6.2 Leitura de um arquivo JSON local

```bash
python json_para_csv.py cities.json
```

### 6.3 Coleta somente de cidades brasileiras

```bash
python json_para_csv.py --baixar --so-brasil
```

Também é possível filtrar um arquivo local:

```bash
python json_para_csv.py cities.json --so-brasil
```

## 7. Integração com DuckDB e Power BI

Os arquivos CSV gerados podem ser utilizados diretamente em consultas SQL por meio do DuckDB.

Exemplo de consulta:

```sql
SELECT
    name AS cidade,
    country AS pais,
    temperature AS temperatura,
    humidity AS umidade,
    pm25,
    pm10,
    icaud_score AS indice_icaud,
    icaud_class AS classificacao
FROM read_csv_auto('cidades.csv')
ORDER BY icaud_score DESC
LIMIT 50;
```

A consulta seleciona as principais variáveis ambientais, ordena as cidades pela pontuação do ICAU-D e retorna os primeiros 50 registros.

Os arquivos também podem ser importados no Power BI por meio da opção **Obter Dados → Texto/CSV**, permitindo desenvolver indicadores, gráficos, rankings e painéis de acompanhamento ambiental.

## 8. Considerações sobre a qualidade dos dados

A disponibilidade das variáveis pode variar conforme os registros fornecidos pela API.

O tratamento de campos ausentes evita interrupções em determinados acessos aos dados, mas não substitui uma etapa específica de validação da qualidade do conjunto de dados.

Na análise posterior, recomenda-se verificar:

- Quantidade de registros válidos por variável;
- Presença de valores ausentes;
- Consistência das unidades de medida;
- Data e horário de atualização;
- Origem das medições;
- Diferenças entre dados de sensores físicos e estimativas provenientes de modelos ambientais.

Os arquivos CSV representam uma fotografia dos dados disponíveis no momento da coleta. Para análises temporais, é necessário armazenar diferentes coletas com suas respectivas datas de referência.

## 9. Aplicação no projeto EcoSense

A rotina de exportação contribui para organizar os dados disponibilizados pela aplicação e facilitar sua utilização em processos de análise e visualização.

A separação entre informações das cidades e dos sensores permite diferentes perspectivas de investigação, incluindo a comparação de indicadores ambientais, a distribuição das classificações do ICAU-D e a análise da disponibilidade de dispositivos de monitoramento.

Essa estrutura também possibilita a integração com ferramentas de BI, ampliando as possibilidades de exploração dos dados e elaboração de indicadores para apoiar a interpretação das condições ambientais das localidades monitoradas.

---

**Projeto:** EcoSense  
**Diretório:** `scripts/data_export/`  
**Script principal:** `json_para_csv.py`  
**Formato de saída:** CSV  
**Fonte de dados:** API pública do EcoSense