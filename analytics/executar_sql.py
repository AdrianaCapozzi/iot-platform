

import duckdb
import sys
import os

# Permite informar o arquivo SQL pelo terminal
arquivo_sql = (
    sys.argv[1]
    if len(sys.argv) > 1
    else "analytics/sql/01_exploracao.sql"
)

nome_resultado = os.path.splitext(
    os.path.basename(arquivo_sql)
)[0]

arquivo_csv = (
    f"analytics/outputs/{nome_resultado}.csv"
)

con = duckdb.connect()

with open(arquivo_sql, encoding="utf-8") as arquivo:
    consulta = arquivo.read()

resultado = con.execute(consulta).df()

print("\nRESULTADO DA CONSULTA:")
print(resultado.to_string(index=False))

resultado.to_csv(
    arquivo_csv,
    index=False,
    encoding="utf-8-sig"
)

print(f"\nConsulta executada: {arquivo_sql}")
print(f"Resultado exportado: {arquivo_csv}")

con.close()
