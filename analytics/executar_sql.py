
import duckdb

# Conecta ao DuckDB em memória
con = duckdb.connect()

# Executa o arquivo SQL
with open("analytics/sql/01_exploracao.sql", encoding="utf-8") as arquivo:
    consulta = arquivo.read()

resultado = con.execute(consulta).df()

# Exibe as primeiras 50 cidades
print(resultado.to_string(index=False))

# Salva o resultado para análise no Power BI
resultado.to_csv(
    "analytics/outputs/resultado_exploracao.csv",
    index=False,
    encoding="utf-8-sig"
)

print("\nConsulta executada!")
print("Arquivo salvo em analytics/outputs/resultado_exploracao.csv")

con.close()
