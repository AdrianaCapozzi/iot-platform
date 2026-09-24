# Integração MongoDB → Databricks

> Documento complementar aos demais arquivos de arquitetura do projeto
> (`ARQUITETURA.md`, `MONGODB_ATLAS_SETUP.md`, `NETWORK_ARCHITECTURE.md`).
> Este arquivo documenta especificamente a camada analítica adicionada
> sobre a persistência já existente no MongoDB.

## 1. Contexto e motivação

O backend já persiste leituras de sensores ambientais no MongoDB
(`SensorReading`, em `src/db/mongo.js`), com um índice TTL que expira
documentos após 30 dias (`expireAfterSeconds: 30 * 24 * 60 * 60`). Essa
retenção é adequada para o cache operacional da aplicação, mas inviabiliza
análise histórica de longo prazo.

Esta integração adiciona uma camada de exportação incremental do MongoDB
para o Databricks, onde os dados são processados e retidos indefinidamente
em formato Delta Lake, seguindo a arquitetura *medallion* (Bronze/Silver/Gold).

## 2. Componentes adicionados

| Arquivo | Local | Função |
|---|---|---|
| `databricksExportService.js` | `backend/src/services/` | Lê leituras novas do MongoDB via cursor incremental (watermark) e envia em lotes NDJSON para o Databricks |
| `databricksExportScheduler.js` | `backend/src/jobs/` | Agenda a execução do export a cada 15 minutos (`node-cron`) |
| `ecosense_autoloader_pipeline.py` | Databricks (notebook/Job) | Processa os dados recebidos em três camadas: Bronze (bruto), Silver (limpo e deduplicado), Gold (agregado por cidade/hora) |

Alterações no `src/index.js`: import e chamada de `startDatabricksExportJob()`
junto da inicialização do scheduler já existente. Nenhuma lógica de negócio
pré-existente foi modificada.

## 3. Decisões técnicas

**Watermark em vez de flag por documento.** O controle de quais leituras já
foram exportadas usa um cursor de timestamp (guardado no próprio cache
Mongo já existente, `mongoCacheGet`/`mongoCacheSet`), em vez de marcar cada
documento individualmente. Evita updates unitários em uma collection cujo
padrão de acesso é otimizado para inserção.

**Unity Catalog Volume em vez de S3.** A opção inicial (bucket S3 como
landing zone) foi descartada por exigir conta AWS com acesso a IAM, não
disponível no ambiente do projeto. A alternativa adotada — um Volume
gerenciado do Unity Catalog (`ecosense.landing.raw_data`) — oferece a mesma
função de área de pouso para o Auto Loader, sem dependência de
infraestrutura externa. O upload é feito via Databricks Files API
(`PUT /api/2.0/fs/files/...`), autenticado com token pessoal (PAT).

**Particionamento por data.** Os arquivos são organizados em
`event_date=YYYY-MM-DD/`, formato que o Auto Loader do Databricks lista de
forma incremental, sem necessidade de reprocessar o diretório inteiro a
cada execução.

## 4. Validação

Consultas para confirmar que os dados estão fluindo ponta a ponta:

```sql
-- Volume de dados brutos recebidos
SELECT COUNT(*) FROM ecosense.bronze.sensor_readings_raw;

-- Agregação final, pronta para consumo
SELECT * FROM ecosense.gold.city_hourly_comfort_index
ORDER BY event_hour DESC
LIMIT 10;
```

Também é possível inspecionar os arquivos diretamente em
**Catalog > ecosense > landing > raw_data** no Catalog Explorer.

## 5. Limitações e próximos passos

- O job de export precisa rodar com frequência menor que o TTL de 30 dias
  do MongoDB; uma falha prolongada (backend fora do ar, token expirado)
  resulta em perda permanente dos dados não exportados.
- A agregação Gold é recalculada em batch a partir da Silver a cada
  execução (`mode("overwrite")`), não incremental — adequado ao volume
  atual, mas pode precisar revisão se o volume de dados crescer
  significativamente.
- Não há alerta automatizado caso o export pare de rodar; monitoramento
  manual do watermark (`pipeline:databricks_export:watermark` no cache
  Mongo) é recomendado até que isso seja implementado.